require("dotenv").config();

const express = require("express");
const cors = require("cors");
const Redis = require("ioredis");

const app = express();
const PORT = process.env.PORT || 5000;

// ── ioredis client (works with Valkey — it's Redis-compatible) ────────────────
const redis = new Redis({
  host: process.env.REDIS_HOST || "127.0.0.1",
  port: parseInt(process.env.REDIS_PORT || "6379", 10),
  ...(process.env.REDIS_PASSWORD ? { password: process.env.REDIS_PASSWORD } : {}),
  retryStrategy: (times) => (times > 10 ? null : Math.min(times * 100, 3000)),
  lazyConnect: true,
});

redis.on("connect", () => console.log("[Redis/Valkey] Connected"));
redis.on("error", (e) => console.error("[Redis/Valkey] Error:", e.message));

// ── Middleware ─────────────────────────────────────────────────────────────────
app.use(cors({ origin: process.env.FRONTEND_URL || "http://localhost:3000" }));
app.use(express.json());

// ── Product catalog (static — swap with DB later) ─────────────────────────────
const PRODUCTS = [
  { id: "prod-1", name: "Instax Mini 12 Camera",        category: "Camera",      price: 14.99,   image: "assets/images/thumbs/product-two-img1.png" },
  { id: "prod-2", name: "Sony WH-1000XM5 Headphones",   category: "Headphone",   price: 279.99,  image: "assets/images/thumbs/product-two-img2.png" },
  { id: "prod-3", name: "Samsung Galaxy S24 Ultra",      category: "Mobile",      price: 899.99,  image: "assets/images/thumbs/product-two-img3.png" },
  { id: "prod-4", name: "Apple MacBook Pro M3",          category: "Laptop",      price: 1599.99, image: "assets/images/thumbs/product-two-img4.png" },
  { id: "prod-5", name: "Anker USB-C Hub 7-in-1",        category: "USB",         price: 39.99,   image: "assets/images/thumbs/product-two-img5.png" },
  { id: "prod-6", name: "Logitech MX Master 3S",         category: "Accessories", price: 79.99,   image: "assets/images/thumbs/product-two-img6.png" },
  { id: "prod-7", name: "iPad Pro 12.9-inch M2",         category: "Laptop",      price: 999.99,  image: "assets/images/thumbs/product-two-img7.png" },
  { id: "prod-8", name: "JBL Charge 5 Speaker",          category: "Accessories", price: 149.99,  image: "assets/images/thumbs/product-two-img8.png" },
  { id: "prod-9", name: "GoPro HERO12 Black",            category: "Camera",      price: 349.99,  image: "assets/images/thumbs/product-two-img9.png" },
  { id: "prod-10", name: "Xiaomi Redmi Note 13 Pro",     category: "Mobile",      price: 299.99,  image: "assets/images/thumbs/product-two-img10.png" },
];

const PRODUCT_MAP = Object.fromEntries(PRODUCTS.map((p) => [p.id, p]));
const TRENDING_KEY = "trending:scores";

// Seed initial scores if the sorted set doesn't exist yet
async function seedIfEmpty() {
  const exists = await redis.exists(TRENDING_KEY);
  if (!exists) {
    const pipeline = redis.pipeline();
    PRODUCTS.forEach((p, i) => {
      pipeline.zadd(TRENDING_KEY, (PRODUCTS.length - i) * 100, p.id);
    });
    await pipeline.exec();
    console.log("[Trending] Seeded", PRODUCTS.length, "products into Valkey.");
  }
}

// ── Routes ─────────────────────────────────────────────────────────────────────

// Health check
app.get("/health", async (req, res) => {
  let valkeyStatus = "disconnected";
  try { await redis.ping(); valkeyStatus = "connected"; } catch {}
  res.json({ status: "ok", valkey: valkeyStatus, timestamp: new Date().toISOString() });
});

// GET /api/trending — top 10 products by Valkey sorted set score
app.get("/api/trending", async (req, res) => {
  try {
    await seedIfEmpty();
    // ZREVRANGE key 0 9 WITHSCORES → ["id","score","id","score",...]
    const raw = await redis.zrevrange(TRENDING_KEY, 0, 9, "WITHSCORES");
    const products = [];
    for (let i = 0; i < raw.length; i += 2) {
      const product = PRODUCT_MAP[raw[i]];
      if (product) {
        products.push({ ...product, trendingScore: parseInt(raw[i + 1], 10), rank: products.length + 1 });
      }
    }
    res.json({ success: true, source: "valkey", count: products.length, products });
  } catch (err) {
    // Graceful fallback when Valkey is unavailable
    const products = PRODUCTS.map((p, i) => ({ ...p, trendingScore: (PRODUCTS.length - i) * 100, rank: i + 1 }));
    res.json({ success: true, source: "fallback", count: products.length, products });
  }
});

// POST /api/trending/track — increment score (call on product view/click)
app.post("/api/trending/track", async (req, res) => {
  const { productId } = req.body;
  if (!productId) return res.status(400).json({ success: false, error: "productId required" });
  try {
    const newScore = await redis.zincrby(TRENDING_KEY, 1, productId);
    res.json({ success: true, productId, newScore: parseInt(newScore, 10) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/products — full catalog (optional ?category= filter)
app.get("/api/products", (req, res) => {
  const { category } = req.query;
  const result = category
    ? PRODUCTS.filter((p) => p.category.toLowerCase() === category.toLowerCase())
    : PRODUCTS;
  res.json({ success: true, count: result.length, products: result });
});

// ── Start ──────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 Server running on http://localhost:${PORT}`);
  console.log(`   Health:   http://localhost:${PORT}/health`);
  console.log(`   Trending: http://localhost:${PORT}/api/trending\n`);
  redis.connect().catch(() => console.warn("[Valkey] Not available — fallback mode active."));
});
