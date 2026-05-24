/**
 * routes/trending.js
 *
 * Valkey Sorted Set key: "trending:scores"
 *
 * Operations used:
 *   ZINCRBY  — increment a product's score when viewed/clicked
 *   ZREVRANGE WITHSCORES — fetch top-N products by score (highest first)
 *   ZADD     — seed initial scores
 */

const express = require("express");
const router = express.Router();
const { getClient } = require("../valkey");
const products = require("../data/products");

const TRENDING_KEY = "trending:scores";
const TOP_N = 10;

// ─── Seed initial scores if the key doesn't exist ────────────────────────────
async function seedIfEmpty(valkey) {
  const exists = await valkey.exists(TRENDING_KEY);
  if (!exists) {
    console.log("[Trending] Seeding initial scores into Valkey...");
    const pipeline = valkey.pipeline();
    products.forEach((p, i) => {
      // Give each product a base score so the list isn't empty on first load
      const baseScore = (products.length - i) * 100 + Math.floor(Math.random() * 50);
      pipeline.zadd(TRENDING_KEY, baseScore, p.id);
    });
    await pipeline.exec();
    console.log("[Trending] Seeded", products.length, "products.");
  }
}

// ─── GET /api/trending ────────────────────────────────────────────────────────
// Returns top-N trending products with their scores, sorted highest first.
router.get("/", async (req, res) => {
  try {
    const valkey = getClient();
    await seedIfEmpty(valkey);

    // ZREVRANGE key 0 N-1 WITHSCORES  →  ["id1","score1","id2","score2",...]
    const raw = await valkey.zrevrange(TRENDING_KEY, 0, TOP_N - 1, "WITHSCORES");

    // Parse flat array into [{id, score}] pairs
    const ranked = [];
    for (let i = 0; i < raw.length; i += 2) {
      ranked.push({ id: raw[i], score: parseInt(raw[i + 1], 10) });
    }

    // Enrich with product metadata
    const productMap = Object.fromEntries(products.map((p) => [p.id, p]));
    const result = ranked
      .map(({ id, score }) => ({
        ...productMap[id],
        trendingScore: score,
        rank: ranked.indexOf(ranked.find((r) => r.id === id)) + 1,
      }))
      .filter((p) => p.id); // drop any IDs not in catalog

    res.json({
      success: true,
      source: "valkey",
      key: TRENDING_KEY,
      count: result.length,
      products: result,
    });
  } catch (err) {
    console.error("[GET /api/trending] Error:", err.message);
    // Graceful fallback: return static data so the UI never breaks
    res.json({
      success: true,
      source: "fallback",
      key: TRENDING_KEY,
      count: products.length,
      products: products.map((p, i) => ({
        ...p,
        trendingScore: (products.length - i) * 100,
        rank: i + 1,
      })),
    });
  }
});

// ─── POST /api/trending/track ─────────────────────────────────────────────────
// Increments a product's trending score by 1 (call on view/click/add-to-cart).
// Body: { productId: "prod-1" }
router.post("/track", async (req, res) => {
  const { productId } = req.body;

  if (!productId) {
    return res.status(400).json({ success: false, error: "productId is required" });
  }

  try {
    const valkey = getClient();
    const newScore = await valkey.zincrby(TRENDING_KEY, 1, productId);

    res.json({
      success: true,
      productId,
      newScore: parseInt(newScore, 10),
    });
  } catch (err) {
    console.error("[POST /api/trending/track] Error:", err.message);
    res.status(500).json({ success: false, error: "Failed to track product" });
  }
});

// ─── GET /api/trending/scores ─────────────────────────────────────────────────
// Returns raw scores for all products (useful for debugging / admin dashboard).
router.get("/scores", async (req, res) => {
  try {
    const valkey = getClient();
    const raw = await valkey.zrevrange(TRENDING_KEY, 0, -1, "WITHSCORES");

    const scores = [];
    for (let i = 0; i < raw.length; i += 2) {
      scores.push({ id: raw[i], score: parseInt(raw[i + 1], 10) });
    }

    res.json({ success: true, scores });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
