/**
 * TrendingProducts.jsx
 *
 * Displays live trending products powered by Valkey sorted set scores.
 * - Initial data: fetched via REST GET /trending
 * - Real-time updates: received via Socket.io "trending_updated" event
 * - Tracks product views (+1), cart adds (+3), purchases (+10)
 */

import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { io } from "socket.io-client";

const API = process.env.REACT_APP_API_URL || "http://localhost:5000";

// Singleton socket — one connection shared across re-renders
let socket = null;
function getSocket() {
  if (!socket) {
    socket = io(API, { transports: ["websocket", "polling"] });
  }
  return socket;
}

// ── Score badge colour by rank ────────────────────────────────────────────────
function rankColor(rank) {
  if (rank === 1) return { bg: "#FFD700", color: "#000" }; // gold
  if (rank === 2) return { bg: "#C0C0C0", color: "#000" }; // silver
  if (rank === 3) return { bg: "#CD7F32", color: "#fff" }; // bronze
  return { bg: "#e9ecef", color: "#495057" };
}

export default function TrendingProducts() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);

  // ── Fetch initial data ──────────────────────────────────────────────────────
  const loadTrending = useCallback(async () => {
    try {
      const res = await fetch(`${API}/trending`);
      const data = await res.json();
      setProducts(Array.isArray(data) ? data : data.products || []);
    } catch {
      // silently ignore — socket will push updates when available
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Socket.io real-time updates ─────────────────────────────────────────────
  useEffect(() => {
    loadTrending();

    const sock = getSocket();

    sock.on("connect", () => setConnected(true));
    sock.on("disconnect", () => setConnected(false));

    // Server pushes full updated top-10 after every track event
    sock.on("trending_updated", (updated) => {
      setProducts(updated);
    });

    return () => {
      sock.off("trending_updated");
      sock.off("connect");
      sock.off("disconnect");
    };
  }, [loadTrending]);

  // ── Track a product action ──────────────────────────────────────────────────
  const track = useCallback(async (productId, action = "view") => {
    try {
      await fetch(`${API}/track/${productId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
    } catch {
      // fire-and-forget — never block the user
    }
  }, []);

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <section className="trending-productss pt-80 pb-80">
      <div className="container container-lg">
        <div className="border border-gray-100 p-24 rounded-16">

          {/* Header */}
          <div className="section-heading mb-24">
            <div className="flex-between flex-wrap gap-8 align-items-center">
              <div className="flex-align gap-12">
                <h5 className="mb-0">🔥 Trending Products</h5>
                {/* Live indicator */}
                <span
                  className="px-8 py-2 text-xs rounded-pill fw-medium"
                  style={{
                    background: connected ? "#d1fae5" : "#fef3c7",
                    color: connected ? "#065f46" : "#92400e",
                  }}
                >
                  {connected ? "● Live" : "○ Connecting..."}
                </span>
              </div>
              <Link
                to="/shop"
                className="text-sm fw-medium text-gray-700 hover-text-main-600 hover-text-decoration-underline"
              >
                View All
              </Link>
            </div>
          </div>

          {/* Loading skeleton */}
          {loading ? (
            <div className="row g-12">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="col-xxl-2 col-xl-3 col-lg-4 col-sm-6">
                  <div className="border border-gray-100 rounded-16 p-16">
                    <div
                      className="rounded-8 bg-gray-100 mb-12"
                      style={{ height: 140, opacity: 0.6 }}
                    />
                    <div className="bg-gray-100 rounded mb-8" style={{ height: 10, width: "70%" }} />
                    <div className="bg-gray-100 rounded" style={{ height: 10, width: "40%" }} />
                  </div>
                </div>
              ))}
            </div>
          ) : products.length === 0 ? (
            <p className="text-center text-gray-500 py-40">No trending data yet.</p>
          ) : (
            <div className="row g-12">
              {products.map((item) => {
                const { bg, color } = rankColor(item.rank);
                return (
                  <div key={item.id} className="col-xxl-2 col-xl-3 col-lg-4 col-sm-6">
                    <div className="product-card h-100 p-16 border border-gray-100 hover-border-main-600 rounded-16 position-relative transition-2">

                      {/* Rank badge */}
                      <span
                        className="position-absolute top-0 end-0 m-8 px-8 py-4 rounded-pill text-xs fw-bold"
                        style={{ background: bg, color }}
                      >
                        #{item.rank}
                      </span>

                      {/* Product image */}
                      <Link
                        to="/product-details-two"
                        className="product-card__thumb flex-center rounded-8 bg-gray-50 position-relative"
                        onClick={() => track(item.id, "view")}
                      >
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-auto max-w-unset"
                          style={{ maxHeight: 120, objectFit: "contain" }}
                          onError={(e) => {
                            e.target.src = "assets/images/thumbs/product-two-img1.png";
                          }}
                        />
                      </Link>

                      {/* Info */}
                      <div className="product-card__content mt-12">
                        <h6 className="title text-md fw-semibold mb-8">
                          <Link
                            to="/product-details-two"
                            className="link text-line-2"
                            onClick={() => track(item.id, "view")}
                          >
                            {item.name}
                          </Link>
                        </h6>

                        <p className="text-gray-500 text-sm mb-8">{item.category}</p>

                        <div className="flex-between align-items-center">
                          <span className="text-heading fw-semibold">${item.price}</span>
                          <span
                            className="text-xs px-8 py-2 rounded-pill fw-medium"
                            style={{ background: "#fff3cd", color: "#856404" }}
                          >
                            🔥 {item.score} pts
                          </span>
                        </div>

                        {/* Action buttons */}
                        <div className="flex-align gap-8 mt-12">
                          <button
                            className="btn btn-sm btn-outline-main flex-grow-1 rounded-pill text-xs py-6"
                            onClick={() => track(item.id, "cart")}
                            title="Add to cart (+3 pts)"
                          >
                            <i className="ph ph-shopping-cart me-4" /> Cart
                          </button>
                          <button
                            className="btn btn-sm btn-main rounded-pill text-xs py-6 px-12"
                            onClick={() => track(item.id, "purchase")}
                            title="Buy now (+10 pts)"
                          >
                            Buy
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Score legend */}
          <div className="flex-align gap-16 mt-20 flex-wrap">
            <span className="text-xs text-gray-500">Score weights:</span>
            <span className="text-xs px-8 py-2 rounded-pill bg-gray-50 text-gray-600">👁 View = +1</span>
            <span className="text-xs px-8 py-2 rounded-pill bg-gray-50 text-gray-600">🛒 Cart = +3</span>
            <span className="text-xs px-8 py-2 rounded-pill bg-gray-50 text-gray-600">💳 Purchase = +10</span>
          </div>

        </div>
      </div>
    </section>
  );
}
