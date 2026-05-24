/**
 * index.js — Express + Socket.io server
 *
 * Architecture:
 *   React Frontend (port 3000)
 *        ↓  REST + Socket.io
 *   Express Server  (port 5000)   ← this file
 *        ↓  ZINCRBY / ZREVRANGE
 *   Valkey / AWS ElastiCache (port 6379)
 *        ↓
 *   Sorted Set  "trending_products"
 *
 * Weighted scoring:
 *   view     = +1
 *   cart     = +3
 *   purchase = +10
 */

require("dotenv").config();

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const redis = require("./valkey");

const app = express();
const server = http.createServer(app);

// ── Socket.io (real-time trending updates) ────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  console.log("[Socket.io] Client connected:", socket.id);
  socket.on("disconnect", () => {
    console.log("[Socket.io] Client disconnected:", socket.id);
  });
});

// ── Middleware ─────────────────────────────────────────────────────────────────
app.use(cors({ origin: process.env.FRONTEND_URL || "http://localhost:3000" }));
app.use(express.json());

// ── Constants ─────────────────────────────────────────────────────────────────
const TRENDING_KEY = "trending_products";

// Weighted action scores
const ACTION_SCORES = {
  view: 1,
  cart: 3,
  purchase: 10,
};

// Product catalog — swap with DB query in production
const PRODUCTS = [
  { id: "prod-1",  name: "Instax Mini 12 Camera",       category: "Camera",      price: 14.99,   image: "assets/images/thumbs/product-two-img1.png" },
  { id: "prod-2",  name: "Sony WH-1000XM5 Headphones",  category: "Headphone",   price: 279.99,  image: "assets/images/thumbs/product-two-img2.png" },
  { id: "prod-3",  name: "Samsung Galaxy S24 Ultra",     category: "Mobile",      price: 899.99,  image: "assets/images/thumbs/product-two-img3.png" },
  { id: "prod-4",  name: "Apple MacBook Pro M3",         category: "Laptop",      price: 1599.99, image: "assets/images/thumbs/product-two-img4.png" },
  { id: "prod-5",  name: "Anker USB-C Hub 7-in-1",       category: "USB",         price: 39.99,   image: "assets/images/thumbs/product-two-img5.png" },
  { id: "prod-6",  name: "Logitech MX Master 3S",        category: "Accessories", price: 79.99,   image: "assets/images/thumbs/product-two-img6.png" },
  { id: "prod-7",  name: "iPad Pro 12.9-inch M2",        category: "Laptop",      price: 999.99,  image: "assets/images/thumbs/product-two-img7.png" },
  { id: "prod-8",  name: "JBL Charge 5 Speaker",         category: "Accessories", price: 149.99,  image: "assets/images/thumbs/product-two-img8.png" },
  { id: "prod-9",  name: "GoPro HERO12 Black",           category: "Camera",      price: 349.99,  image: "assets/images/thumbs/product-two-img9.png" },
  { id: "prod-10", name: "Xiaomi Redmi Note 13 Pro",     category: "Mobile",      price: 299.99,  image: "assets/images/thumbs/product-two-img10.png" },
];

const PRODUCT_MAP = Object.fromEntries(PRODUCTS.map((p) => [p.id, p]));

// ── Helpers ───────────────────────────────────────────────────────────────────

// Seed initial scores so the list is never empty on first run
async function seedIfEmpty() {
  const exists = await redis.exists(TRENDING_KEY);
  if (!exists) {
    const pipeline = redis.pipeline();
    PRODUCTS.forEach((p, i) => {
      pipeline.zadd(TRENDING_KEY, (PRODUCTS.length - i) * 10, p.id);
    });
    await pipeline.exec();
    console.log("[Trending] Seeded", PRODUCTS.length, "products.");
  }
}

// Fetch top-10 from Valkey and enrich with product metadata
async function getTopTrending() {
  const raw = await redis.zrevrange(TRENDING_KEY, 0, 9, "WITHSCORES");
  const result = [];
  for (let i = 0; i < raw.length; i += 2) {
    const product = PRODUCT_MAP[raw[i]];
    if (product) {
      result.push({
        ...product,
        score: parseInt(raw[i + 1], 10),
        rank: result.length + 1,
      });
    }
  }
  return result;
}

// ── Routes ─────────────────────────────────────────────────────────────────────

// Health check
app.get("/health", async (req, res) => {
  let valkeyStatus = "disconnected";
  try { await redis.ping(); valkeyStatus = "connected"; } catch {}
  res.json({ status: "ok", valkey: valkeyStatus, timestamp: new Date().toISOString() });
});

// GET /trending — top 10 products sorted by score
app.get("/trending", async (req, res) => {
  try {
    await seedIfEmpty();
    const products = await getTopTrending();
    res.json(products);
  } catch (err) {
    console.error("[GET /trending]", err.message);
    // Fallback: return static list so UI never breaks
    res.json(
      PRODUCTS.map((p, i) => ({ ...p, score: (PRODUCTS.length - i) * 10, rank: i + 1 }))
    );
  }
});

// POST /track/:id — increment score by action weight
// Body (optional): { action: "view" | "cart" | "purchase" }
// Default action = "view" (+1)
app.post("/track/:id", async (req, res) => {
  const productId = req.params.id;
  const action = req.body?.action || "view";
  const points = ACTION_SCORES[action] ?? 1;

  try {
    const newScore = await redis.zincrby(TRENDING_KEY, points, productId);

    // Broadcast updated trending list to all connected clients in real-time
    const updated = await getTopTrending();
    io.emit("trending_updated", updated);

    res.json({ success: true, productId, action, points, newScore: parseInt(newScore, 10) });
  } catch (err) {
    console.error("[POST /track]", err.message);
    // Return success anyway — tracking is non-critical, never block the user
    res.json({ success: true, productId, action, points, newScore: null, note: "Valkey unavailable" });
  }
});

// GET /products — full catalog with optional ?category= filter
app.get("/products", (req, res) => {
  const { category } = req.query;
  const result = category
    ? PRODUCTS.filter((p) => p.category.toLowerCase() === category.toLowerCase())
    : PRODUCTS;
  res.json({ success: true, count: result.length, products: result });
});

// ── Start ──────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`\n🚀 Server running on http://localhost:${PORT}`);
  console.log(`   Health:   http://localhost:${PORT}/health`);
  console.log(`   Trending: http://localhost:${PORT}/trending`);
  console.log(`   Track:    POST http://localhost:${PORT}/track/:id\n`);

  // Connect to Valkey eagerly — fallback mode if unavailable
  redis.connect().catch(() => {
    console.warn("[Valkey] Not reachable — running in fallback mode.");
  });
});
