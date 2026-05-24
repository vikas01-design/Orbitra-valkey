/**
 * routes/products.js
 * Basic product catalog API endpoints.
 */

const express = require("express");
const router = express.Router();
const products = require("../data/products");

// GET /api/products — list all products (optionally filter by category)
router.get("/", (req, res) => {
  const { category } = req.query;
  const result = category
    ? products.filter((p) => p.category.toLowerCase() === category.toLowerCase())
    : products;

  res.json({ success: true, count: result.length, products: result });
});

// GET /api/products/:id — single product
router.get("/:id", (req, res) => {
  const product = products.find((p) => p.id === req.params.id);
  if (!product) {
    return res.status(404).json({ success: false, error: "Product not found" });
  }
  res.json({ success: true, product });
});

module.exports = router;
