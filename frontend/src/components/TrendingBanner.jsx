/**
 * TrendingBanner.jsx
 *
 * Dynamic hero banner for the #1 trending product.
 * "🔥 #1 Trending in India" — updates in real-time via Socket.io.
 */

import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { io } from "socket.io-client";
import { getProductImage, FALLBACK_IMAGE } from "../config/images";

const API = process.env.REACT_APP_API_URL || "http://localhost:5000";

let socket = null;
function getSocket() {
  if (!socket) socket = io(API, { transports: ["websocket", "polling"] });
  return socket;
}

export default function TrendingBanner() {
  const [topProduct, setTopProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pulse, setPulse] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`${API}/trending`);
      const data = await res.json();
      const list = Array.isArray(data) ? data : data.products || [];
      if (list.length > 0) setTopProduct(list[0]);
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    load();
    const sock = getSocket();
    sock.on("trending_updated", (updated) => {
      if (updated.length > 0) {
        setTopProduct(updated[0]);
        // Pulse animation on update
        setPulse(true);
        setTimeout(() => setPulse(false), 600);
      }
    });
    return () => sock.off("trending_updated");
  }, [load]);

  if (loading) {
    return (
      <div className="container container-lg pt-40">
        <div className="rounded-24 bg-gray-100" style={{ height: 220 }} />
      </div>
    );
  }

  if (!topProduct) return null;

  const imageUrl = getProductImage(topProduct.id, topProduct.image);

  return (
    <section className="trending-banner pt-40 pb-0">
      <div className="container container-lg">
        <div
          className="rounded-24 overflow-hidden position-relative"
          style={{
            background: "linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #0f172a 100%)",
            minHeight: 220,
            transition: "box-shadow 0.3s ease",
            boxShadow: pulse
              ? "0 0 0 4px #f59e0b, 0 20px 60px rgba(245,158,11,0.3)"
              : "0 20px 60px rgba(0,0,0,0.3)",
          }}
        >
          {/* Animated background glow */}
          <div
            style={{
              position: "absolute", inset: 0,
              background: "radial-gradient(ellipse at 70% 50%, rgba(245,158,11,0.15) 0%, transparent 70%)",
              pointerEvents: "none",
            }}
          />

          {/* Grid lines decoration */}
          <div
            style={{
              position: "absolute", inset: 0, opacity: 0.05,
              backgroundImage: "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
              backgroundSize: "40px 40px",
              pointerEvents: "none",
            }}
          />

          <div className="row align-items-center h-100 px-32 py-24 position-relative">
            {/* Left — text */}
            <div className="col-lg-7 col-md-8">
              {/* Badge */}
              <div className="flex-align gap-10 mb-16">
                <span
                  className="px-12 py-6 rounded-pill text-xs fw-bold"
                  style={{
                    background: "linear-gradient(90deg, #f59e0b, #ef4444)",
                    color: "#fff",
                    letterSpacing: "0.5px",
                    animation: "pulse 2s infinite",
                  }}
                >
                  🔥 #1 TRENDING IN INDIA
                </span>
                <span
                  className="px-10 py-4 rounded-pill text-xs fw-medium"
                  style={{ background: "rgba(255,255,255,0.1)", color: "#94a3b8" }}
                >
                  Live · Valkey
                </span>
              </div>

              {/* Product name */}
              <h2
                className="mb-12 fw-bold"
                style={{
                  color: "#fff",
                  fontSize: "clamp(1.4rem, 3vw, 2rem)",
                  lineHeight: 1.2,
                  textShadow: "0 2px 20px rgba(0,0,0,0.5)",
                }}
              >
                {topProduct.name}
              </h2>

              {/* Category + rating */}
              <div className="flex-align gap-16 mb-20 flex-wrap">
                <span
                  className="px-10 py-4 rounded-pill text-xs fw-medium"
                  style={{ background: "rgba(255,255,255,0.1)", color: "#cbd5e1" }}
                >
                  {topProduct.category}
                </span>
                <div className="flex-align gap-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <i
                      key={i}
                      className={`ph-fill ph-star text-sm ${i < Math.round(topProduct.rating) ? "" : "opacity-25"}`}
                      style={{ color: "#f59e0b" }}
                    />
                  ))}
                  <span className="text-xs ms-4" style={{ color: "#94a3b8" }}>
                    {topProduct.rating} ({topProduct.reviews} reviews)
                  </span>
                </div>
              </div>

              {/* Price + score */}
              <div className="flex-align gap-20 flex-wrap mb-24">
                <div>
                  {topProduct.originalPrice && (
                    <span className="text-sm text-decoration-line-through me-8" style={{ color: "#64748b" }}>
                      ${topProduct.originalPrice}
                    </span>
                  )}
                  <span className="fw-bold" style={{ color: "#f59e0b", fontSize: "1.5rem" }}>
                    ${topProduct.price}
                  </span>
                  {topProduct.discount > 0 && (
                    <span
                      className="ms-8 px-8 py-2 rounded-pill text-xs fw-bold"
                      style={{ background: "#22c55e", color: "#fff" }}
                    >
                      -{topProduct.discount}% OFF
                    </span>
                  )}
                </div>

                {/* Trending score meter */}
                <div
                  className="px-16 py-8 rounded-12"
                  style={{ background: "rgba(245,158,11,0.15)", border: "1px solid rgba(245,158,11,0.3)" }}
                >
                  <span className="text-xs" style={{ color: "#94a3b8" }}>Trending Score</span>
                  <div className="fw-bold" style={{ color: "#f59e0b", fontSize: "1.1rem" }}>
                    🔥 {topProduct.score?.toLocaleString() || 0} pts
                  </div>
                </div>
              </div>

              {/* CTA buttons */}
              <div className="flex-align gap-12 flex-wrap">
                <Link
                  to="/product-details"
                  className="btn rounded-pill px-24 py-10 fw-semibold"
                  style={{
                    background: "linear-gradient(90deg, #f59e0b, #ef4444)",
                    color: "#fff",
                    border: "none",
                    boxShadow: "0 4px 20px rgba(245,158,11,0.4)",
                  }}
                >
                  Shop Now <i className="ph ph-arrow-right ms-6" />
                </Link>
                <Link
                  to="/shop"
                  className="btn rounded-pill px-24 py-10 fw-medium"
                  style={{
                    background: "rgba(255,255,255,0.08)",
                    color: "#e2e8f0",
                    border: "1px solid rgba(255,255,255,0.15)",
                  }}
                >
                  View All Trending
                </Link>
              </div>
            </div>

            {/* Right — product image */}
            <div className="col-lg-5 col-md-4 d-md-flex d-none justify-content-end align-items-center">
              <div className="position-relative">
                {/* Glow behind image */}
                <div
                  style={{
                    position: "absolute",
                    inset: "-20px",
                    background: "radial-gradient(circle, rgba(245,158,11,0.25) 0%, transparent 70%)",
                    borderRadius: "50%",
                    filter: "blur(20px)",
                  }}
                />
                <img
                  src={imageUrl}
                  alt={topProduct.name}
                  style={{
                    maxHeight: 180,
                    maxWidth: "100%",
                    objectFit: "contain",
                    position: "relative",
                    filter: "drop-shadow(0 10px 30px rgba(0,0,0,0.5))",
                    transform: pulse ? "scale(1.05)" : "scale(1)",
                    transition: "transform 0.3s ease",
                  }}
                  onError={(e) => { e.target.src = FALLBACK_IMAGE; }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
