/**
 * server.js — Express API server
 *
 * Architecture:
 *   React Frontend (port 3000)
 *        ↓  fetch /api/trending
 *   Express Backend (port 5000)   ← this file
 *        ↓  ZINCRBY / ZREVRANGE
 *   Valkey / AWS ElastiCache (port 6379)
 *        ↓
 *   Trending Scores (Sorted Set)
 */

require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { getClient } = require("./valkey");

const trendingRoutes = require("./routes/trending");
const productsRoutes = require("./routes/products");

const app = express();
const PORT = process.env.PORT || 5000;

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"],
  })
);
app.use(express.json());

// ─── Health check ─────────────────────────────────────────────────────────────
app.get("/health", async (req, res) => {
  let valkeyStatus = "disconnected";
  try {
    const valkey = getClient();
    await valkey.ping();
    valkeyStatus = "connected";
  } catch {
    valkeyStatus = "error";
  }

  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    valkey: valkeyStatus,
  });
});

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use("/api/trending", trendingRoutes);
app.use("/api/products", productsRoutes);

// ─── 404 handler ─────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, error: `Route ${req.path} not found` });
});

// ─── Global error handler ─────────────────────────────────────────────────────
app.use((err, req, res, _next) => {
  console.error("[Server Error]", err);
  res.status(500).json({ success: false, error: "Internal server error" });
});

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 Valkey E-Commerce API running on http://localhost:${PORT}`);
  console.log(`   Health:   http://localhost:${PORT}/health`);
  console.log(`   Trending: http://localhost:${PORT}/api/trending`);
  console.log(`   Products: http://localhost:${PORT}/api/products\n`);

  // Eagerly connect to Valkey on startup
  const valkey = getClient();
  valkey.connect().catch((err) => {
    console.warn("[Valkey] Could not connect on startup:", err.message);
    console.warn("[Valkey] API will use fallback data until Valkey is available.");
  });
});
