/**
 * routes/alsoViewed.js
 *
 * "Customers Also Viewed" — powered by Valkey Sets
 *
 * Data model:
 *   Key:   coviewed:{productId}          → SET of product IDs viewed in same session
 *   Key:   session:{sessionId}:viewed    → SET of product IDs viewed this session
 *
 * Flow:
 *   1. User views product A  → POST /also-viewed/track  { sessionId, productId }
 *      - SADD session:{sid}:viewed  productId
 *      - EXPIRE session key 30 min
 *      - For every OTHER product already in the session set:
 *          SADD coviewed:{productId}  otherProduct
 *          SADD coviewed:{otherProduct}  productId
 *
 *   2. Product page loads    → GET /also-viewed/:productId
 *      - SMEMBERS coviewed:{productId}  → list of co-viewed IDs
 *      - Enrich with product metadata, return top 6
 */

const express = require("express");
const router = express.Router();
const redis = require("../valkey");
const PRODUCTS = require("../data/products");

const PRODUCT_MAP = Object.fromEntries(PRODUCTS.map((p) => [p.id, p]));
const SESSION_TTL = 30 * 60; // 30 minutes

// ── POST /also-viewed/track ───────────────────────────────────────────────────
// Body: { sessionId: "abc123", productId: "prod-3" }
router.post("/track", async (req, res) => {
  const { sessionId, productId } = req.body;
  if (!sessionId || !productId) {
    return res.status(400).json({ success: false, error: "sessionId and productId required" });
  }

  try {
    const sessionKey = `session:${sessionId}:viewed`;

    // Get products already viewed this session BEFORE adding current one
    const alreadyViewed = await redis.smembers(sessionKey);

    // Add current product to session set
    await redis.sadd(sessionKey, productId);
    await redis.expire(sessionKey, SESSION_TTL);

    // Cross-link current product with every previously viewed product
    if (alreadyViewed.length > 0) {
      const pipeline = redis.pipeline();
      for (const otherId of alreadyViewed) {
        if (otherId !== productId) {
          pipeline.sadd(`coviewed:${productId}`, otherId);
          pipeline.sadd(`coviewed:${otherId}`, productId);
        }
      }
      await pipeline.exec();
    }

    res.json({ success: true, sessionViewed: [...alreadyViewed, productId] });
  } catch (err) {
    console.error("[POST /also-viewed/track]", err.message);
    res.json({ success: true, note: "Valkey unavailable" });
  }
});

// ── GET /also-viewed/:productId ───────────────────────────────────────────────
router.get("/:productId", async (req, res) => {
  const { productId } = req.params;

  try {
    // SMEMBERS returns all members of the set
    const coviewedIds = await redis.smembers(`coviewed:${productId}`);

    // Enrich with product data, exclude unknowns, limit to 6
    const products = coviewedIds
      .map((id) => PRODUCT_MAP[id])
      .filter(Boolean)
      .slice(0, 6);

    // If Valkey has no data yet, fall back to same-category products
    if (products.length === 0) {
      const current = PRODUCT_MAP[productId];
      const fallback = current
        ? PRODUCTS.filter((p) => p.category === current.category && p.id !== productId).slice(0, 6)
        : PRODUCTS.slice(0, 6);
      return res.json({ success: true, source: "fallback", products: fallback });
    }

    res.json({ success: true, source: "valkey", products });
  } catch (err) {
    console.error("[GET /also-viewed]", err.message);
    // Fallback: same-category products
    const current = PRODUCT_MAP[productId];
    const fallback = current
      ? PRODUCTS.filter((p) => p.category === current.category && p.id !== productId).slice(0, 6)
      : PRODUCTS.slice(0, 6);
    res.json({ success: true, source: "fallback", products: fallback });
  }
});

module.exports = router;
