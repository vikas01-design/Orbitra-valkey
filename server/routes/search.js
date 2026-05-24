/**
 * routes/search.js
 *
 * AI Semantic Search — powered by:
 *   - @xenova/transformers  (local embeddings, no API key needed)
 *   - Valkey Hash           (stores product vectors)
 *   - Cosine similarity     (ranks results by semantic closeness)
 *
 * Data model:
 *   Key:  embedding:{productId}   → Hash { vector: "[0.1,0.2,...]", text: "..." }
 *
 * Flow:
 *   1. On startup: embed all product names+descriptions → store in Valkey
 *   2. GET /search?q=wireless+headphones+for+gym
 *      - Embed the query with same model
 *      - Load all product vectors from Valkey
 *      - Cosine similarity rank → return top results
 *
 * Model: Xenova/all-MiniLM-L6-v2  (22MB, runs locally, no GPU needed)
 */

const express = require("express");
const router = express.Router();
const redis = require("../valkey");
const PRODUCTS = require("../data/products");

// ── Lazy-load the embedding pipeline (downloads model on first use) ───────────
let embedder = null;
let embedderReady = false;
let embedderError = null;

async function getEmbedder() {
  if (embedder) return embedder;
  if (embedderError) throw embedderError;

  try {
    // Dynamic import — @xenova/transformers is ESM
    const { pipeline } = await import("@xenova/transformers");
    embedder = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
    embedderReady = true;
    console.log("[Search] Embedding model loaded ✓");
    return embedder;
  } catch (err) {
    embedderError = err;
    console.error("[Search] Failed to load embedding model:", err.message);
    throw err;
  }
}

// ── Embed a text string → Float32Array ───────────────────────────────────────
async function embed(text) {
  const pipe = await getEmbedder();
  const output = await pipe(text, { pooling: "mean", normalize: true });
  return Array.from(output.data);
}

// ── Cosine similarity between two vectors ────────────────────────────────────
function cosineSimilarity(a, b) {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB) + 1e-10);
}

// ── Build product text for embedding ─────────────────────────────────────────
function productText(p) {
  return `${p.name} ${p.category} ${p.tags ? p.tags.join(" ") : ""}`.trim();
}

// ── Index all products into Valkey (called once on startup) ──────────────────
async function indexProducts() {
  try {
    // Check if already indexed
    const exists = await redis.exists(`embedding:${PRODUCTS[0].id}`);
    if (exists) {
      console.log("[Search] Product embeddings already indexed in Valkey.");
      return;
    }

    console.log("[Search] Indexing", PRODUCTS.length, "products...");
    const pipeline = redis.pipeline();

    for (const product of PRODUCTS) {
      const text = productText(product);
      const vector = await embed(text);
      pipeline.hset(`embedding:${product.id}`, {
        vector: JSON.stringify(vector),
        text,
        productId: product.id,
      });
    }

    await pipeline.exec();
    console.log("[Search] Indexing complete ✓");
  } catch (err) {
    console.warn("[Search] Could not index products:", err.message);
  }
}

// ── GET /search?q=your+query&limit=6 ─────────────────────────────────────────
router.get("/", async (req, res) => {
  const query = (req.query.q || "").trim();
  const limit = Math.min(parseInt(req.query.limit || "6", 10), 20);

  if (!query) {
    return res.status(400).json({ success: false, error: "q parameter required" });
  }

  // ── Keyword fallback (always works, even without Valkey/model) ────────────
  function keywordSearch(q) {
    const terms = q.toLowerCase().split(/\s+/);
    return PRODUCTS
      .map((p) => {
        const text = productText(p).toLowerCase();
        const score = terms.reduce((acc, t) => acc + (text.includes(t) ? 1 : 0), 0);
        return { ...p, score, similarity: score / terms.length };
      })
      .filter((p) => p.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  // ── Try semantic search first ─────────────────────────────────────────────
  try {
    // Embed the query
    const queryVector = await embed(query);

    // Load all product vectors from Valkey
    const productMap = Object.fromEntries(PRODUCTS.map((p) => [p.id, p]));
    const results = [];

    for (const product of PRODUCTS) {
      const stored = await redis.hgetall(`embedding:${product.id}`);
      if (stored && stored.vector) {
        const productVector = JSON.parse(stored.vector);
        const similarity = cosineSimilarity(queryVector, productVector);
        results.push({ ...product, similarity: parseFloat(similarity.toFixed(4)) });
      }
    }

    if (results.length === 0) {
      // Valkey has no vectors yet — use keyword fallback
      const fallback = keywordSearch(query);
      return res.json({ success: true, source: "keyword", query, results: fallback });
    }

    // Sort by similarity descending, return top N
    results.sort((a, b) => b.similarity - a.similarity);
    const top = results.slice(0, limit);

    res.json({ success: true, source: "semantic", query, results: top });
  } catch (err) {
    console.warn("[GET /search] Semantic failed, using keyword:", err.message);
    const fallback = keywordSearch(query);
    res.json({ success: true, source: "keyword", query, results: fallback });
  }
});

// ── GET /search/status — check if model is ready ─────────────────────────────
router.get("/status", (req, res) => {
  res.json({
    modelReady: embedderReady,
    modelError: embedderError ? embedderError.message : null,
  });
});

// Export indexProducts so server.js can call it after Valkey connects
module.exports = router;
module.exports.indexProducts = indexProducts;
module.exports.getEmbedder = getEmbedder;
