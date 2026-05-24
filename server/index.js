/**
 * index.js — Express + Socket.io server
 *
 * Features:
 *   1. Trending Products    → Valkey Sorted Set  (ZINCRBY / ZREVRANGE)
 *   2. Customers Also Viewed → Valkey Sets       (SADD / SMEMBERS)
 *   3. AI Semantic Search   → Valkey Hash + local embeddings (cosine similarity)
 *
 * Weighted scoring:
 *   view = +1 | cart = +3 | purchase = +10
 */

require("dotenv").config();

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const redis = require("./valkey");
const PRODUCTS = require("./data/products");

// ── Route modules ─────────────────────────────────────────────────────────────
const alsoViewedRouter = require("./routes/alsoViewed");
const searchRouter = require("./routes/search");
const { indexProducts, getEmbedder } = require("./routes/search");

const app = express();
const server = http.createServer(app);

// ── Socket.io ─────────────────────────────────────────────────────────────────
const io = new Server(server, {
  cors: { origin: process.env.FRONTEND_URL || "http://localhost:3000", methods: ["GET", "POST"] },
});

io.on("connection", (socket) => {
  console.log("[Socket.io] Client connected:", socket.id);
  socket.on("disconnect", () => console.log("[Socket.io] Disconnected:", socket.id));
});

// ── Middleware ─────────────────────────────────────────────────────────────────
app.use(cors({ origin: process.env.FRONTEND_URL || "http://localhost:3000" }));
app.use(express.json());

// ── Constants ─────────────────────────────────────────────────────────────────
const TRENDING_KEY = "trending_products";
const ACTION_SCORES = { view: 1, cart: 3, purchase: 10 };
const PRODUCT_MAP = Object.fromEntries(PRODUCTS.map((p) => [p.id, p]));

// ── Helpers ───────────────────────────────────────────────────────────────────
async function seedTrendingIfEmpty() {
  const exists = await redis.exists(TRENDING_KEY);
  if (!exists) {
    const pipeline = redis.pipeline();
    PRODUCTS.forEach((p, i) => pipeline.zadd(TRENDING_KEY, (PRODUCTS.length - i) * 10, p.id));
    await pipeline.exec();
    console.log("[Trending] Seeded", PRODUCTS.length, "products.");
  }
}

async function getTopTrending() {
  const raw = await redis.zrevrange(TRENDING_KEY, 0, 9, "WITHSCORES");
  const result = [];
  for (let i = 0; i < raw.length; i += 2) {
    const product = PRODUCT_MAP[raw[i]];
    if (product) result.push({ ...product, score: parseInt(raw[i + 1], 10), rank: result.length + 1 });
  }
  return result;
}

// ── Health ────────────────────────────────────────────────────────────────────
app.get("/health", async (req, res) => {
  let valkeyStatus = "disconnected";
  try { await redis.ping(); valkeyStatus = "connected"; } catch {}
  res.json({ status: "ok", valkey: valkeyStatus, timestamp: new Date().toISOString() });
});

// ── Trending routes ───────────────────────────────────────────────────────────
app.get("/trending", async (req, res) => {
  try {
    await seedTrendingIfEmpty();
    res.json(await getTopTrending());
  } catch {
    res.json(PRODUCTS.map((p, i) => ({ ...p, score: (PRODUCTS.length - i) * 10, rank: i + 1 })));
  }
});

app.post("/track/:id", async (req, res) => {
  const productId = req.params.id;
  const action = req.body?.action || "view";
  const points = ACTION_SCORES[action] ?? 1;

  try {
    const newScore = await redis.zincrby(TRENDING_KEY, points, productId);
    const updated = await getTopTrending();
    io.emit("trending_updated", updated);
    res.json({ success: true, productId, action, points, newScore: parseInt(newScore, 10) });
  } catch {
    res.json({ success: true, productId, action, points, newScore: null, note: "Valkey unavailable" });
  }
});

// ── Also Viewed routes ────────────────────────────────────────────────────────
app.use("/also-viewed", alsoViewedRouter);

// ── Search routes ─────────────────────────────────────────────────────────────
app.use("/search", searchRouter);

// ── Products ──────────────────────────────────────────────────────────────────
app.get("/products", (req, res) => {
  const { category } = req.query;
  const result = category
    ? PRODUCTS.filter((p) => p.category.toLowerCase() === category.toLowerCase())
    : PRODUCTS;
  res.json({ success: true, count: result.length, products: result });
});

// ── Start ──────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

server.listen(PORT, async () => {
  console.log(`\n🚀 Server running on http://localhost:${PORT}`);
  console.log(`   Health:      GET  /health`);
  console.log(`   Trending:    GET  /trending`);
  console.log(`   Track:       POST /track/:id`);
  console.log(`   Also Viewed: GET  /also-viewed/:productId`);
  console.log(`   Track View:  POST /also-viewed/track`);
  console.log(`   Search:      GET  /search?q=wireless+headphones\n`);

  // Connect to Valkey
  redis.connect().catch(() => console.warn("[Valkey] Not reachable — fallback mode active."));

  // Pre-warm the embedding model in background (non-blocking)
  console.log("[Search] Pre-loading embedding model in background...");
  getEmbedder()
    .then(() => indexProducts())
    .catch((err) => console.warn("[Search] Model pre-load failed:", err.message));
});
