/**
 * TrendingOne.jsx
 * Fetches live trending products from the Express + Valkey backend.
 * Falls back to a loading skeleton and error state gracefully.
 */

import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchTrendingProducts, trackProductView } from "../api/trendingApi";

// ─── Skeleton card shown while loading ───────────────────────────────────────
const SkeletonCard = () => (
  <div className="col-xxl-2 col-xl-3 col-lg-4 col-sm-6">
    <div className="product-card h-100 p-16 border border-gray-100 rounded-16">
      <div
        className="rounded-8 bg-gray-100 mb-16"
        style={{ height: 160, animation: "pulse 1.5s infinite" }}
      />
      <div className="bg-gray-100 rounded mb-8" style={{ height: 12, width: "60%" }} />
      <div className="bg-gray-100 rounded mb-8" style={{ height: 12, width: "80%" }} />
      <div className="bg-gray-100 rounded" style={{ height: 12, width: "40%" }} />
    </div>
  </div>
);

// ─── Category tabs ────────────────────────────────────────────────────────────
const CATEGORIES = ["All", "Mobile", "Headphone", "USB", "Camera", "Laptop", "Accessories"];

const TrendingOne = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeCategory, setActiveCategory] = useState("All");
  const [dataSource, setDataSource] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(
          `${process.env.REACT_APP_API_URL || "http://localhost:5000"}/api/trending`
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!cancelled) {
          setProducts(data.products || []);
          setDataSource(data.source); // "valkey" or "fallback"
        }
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  const filtered =
    activeCategory === "All"
      ? products
      : products.filter(
          (p) => p.category?.toLowerCase() === activeCategory.toLowerCase()
        );

  return (
    <section className="trending-productss pt-80">
      <div className="container container-lg">
        <div className="border border-gray-100 p-24 rounded-16">

          {/* ── Header ── */}
          <div className="section-heading mb-24">
            <div className="flex-between flex-wrap gap-8">
              <div className="flex-align gap-12">
                <h5 className="mb-0">Trending Products</h5>
                {/* Badge showing data source */}
                {dataSource && (
                  <span
                    className={`px-8 py-2 text-xs rounded-pill fw-medium ${
                      dataSource === "valkey"
                        ? "text-success-600 bg-success-50"
                        : "text-warning-600 bg-warning-50"
                    }`}
                    title={
                      dataSource === "valkey"
                        ? "Live data from Valkey sorted set"
                        : "Valkey unavailable — showing static data"
                    }
                  >
                    {dataSource === "valkey" ? "⚡ Live · Valkey" : "📦 Fallback"}
                  </span>
                )}
              </div>

              {/* Category tabs */}
              <ul className="nav common-tab style-two nav-pills" role="tablist">
                {CATEGORIES.map((cat) => (
                  <li key={cat} className="nav-item" role="presentation">
                    <button
                      className={`nav-link ${activeCategory === cat ? "active" : ""}`}
                      type="button"
                      onClick={() => setActiveCategory(cat)}
                    >
                      {cat}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* ── Promo banner ── */}
          <div className="trending-products-box rounded-16 overflow-hidden flex-between position-relative mb-24">
            <div className="d-md-block d-none ps-xxl-5 ps-md-4">
              <img src="assets/images/thumbs/trending-products-img1.png" alt="" />
            </div>
            <div className="trending-products-box__content px-4 d-block w-100 text-center py-32">
              <h6 className="mb-0 trending-products-box__title">
                Laptop Pro <span className="h4 mb-0 fw-semibold">20%</span> off All
                Time On Order Now $980
              </h6>
            </div>
            <div className="d-md-block d-none pe-xxl-5 me-xxl-5 pe-md-4">
              <img src="assets/images/thumbs/trending-products-img2.png" alt="" />
            </div>
          </div>

          {/* ── Product grid ── */}
          {loading ? (
            <div className="row g-12">
              {Array.from({ length: 6 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : error ? (
            <div className="alert alert-warning rounded-16 text-center py-24">
              <i className="ph ph-warning-circle text-xl me-8" />
              Could not load trending products.{" "}
              <button
                className="btn btn-sm btn-outline-main ms-8"
                onClick={() => window.location.reload()}
              >
                Retry
              </button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-40 text-gray-500">
              No products found in <strong>{activeCategory}</strong>.
            </div>
          ) : (
            <div className="row g-12">
              {filtered.map((product) => (
                <div
                  key={product.id}
                  className="col-xxl-2 col-xl-3 col-lg-4 col-sm-6"
                >
                  <div className="product-card h-100 p-16 border border-gray-100 hover-border-main-600 rounded-16 position-relative transition-2">
                    <Link
                      to="/product-details-two"
                      className="product-card__thumb flex-center rounded-8 bg-gray-50 position-relative"
                      onClick={() => trackProductView(product.id)}
                    >
                      {product.badge && (
                        <span
                          className={`product-card__badge ${product.badgeColor} px-8 py-4 text-sm text-white position-absolute inset-inline-start-0 inset-block-start-0`}
                        >
                          {product.badge}
                        </span>
                      )}
                      <img
                        src={product.image}
                        alt={product.name}
                        className="w-auto max-w-unset"
                        onError={(e) => {
                          e.target.src = "assets/images/thumbs/product-two-img1.png";
                        }}
                      />
                    </Link>

                    <div className="product-card__content mt-16">
                      {product.discount > 0 && (
                        <span className="text-success-600 bg-success-50 text-sm fw-medium py-4 px-8">
                          {product.discount}% OFF
                        </span>
                      )}

                      <h6 className="title text-lg fw-semibold my-16">
                        <Link
                          to="/product-details-two"
                          className="link text-line-2"
                          onClick={() => trackProductView(product.id)}
                        >
                          {product.name}
                        </Link>
                      </h6>

                      {/* Star rating */}
                      <div className="flex-align gap-6">
                        <div className="flex-align gap-4">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <span
                              key={i}
                              className={`text-15 fw-medium d-flex ${
                                i < Math.round(product.rating)
                                  ? "text-warning-600"
                                  : "text-gray-300"
                              }`}
                            >
                              <i className="ph-fill ph-star" />
                            </span>
                          ))}
                        </div>
                        <span className="text-xs fw-medium text-gray-500">
                          {product.rating}
                        </span>
                        <span className="text-xs fw-medium text-gray-500">
                          ({product.reviews})
                        </span>
                      </div>

                      {/* Trending rank badge */}
                      <div className="flex-align gap-8 mt-8">
                        <span className="py-2 px-8 text-xs rounded-pill text-main-two-600 bg-main-two-50">
                          Fulfilled by Valkey
                        </span>
                        <span className="py-2 px-8 text-xs rounded-pill text-warning-600 bg-warning-50 fw-medium">
                          #{product.rank} Trending
                        </span>
                      </div>

                      {/* Price */}
                      <div className="product-card__price mt-16 mb-8">
                        {product.originalPrice && (
                          <span className="text-gray-400 text-md fw-semibold text-decoration-line-through me-8">
                            ${product.originalPrice}
                          </span>
                        )}
                        <span className="text-heading text-md fw-semibold">
                          ${product.price}{" "}
                          <span className="text-gray-500 fw-normal">/Qty</span>
                        </span>
                      </div>

                      <span className="text-neutral-600 text-sm">
                        Delivered by{" "}
                        <span className="text-main-600">{product.deliveryDate}</span>
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default TrendingOne;
