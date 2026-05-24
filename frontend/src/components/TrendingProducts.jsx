/**
 * TrendingProducts.jsx — Premium trending grid
 *
 * Visual features:
 *   - Dark cards with gradient borders
 *   - Hover scale + glow effect
 *   - Gold/Silver/Bronze rank badges
 *   - Animated score bar
 *   - Real-time Socket.io updates
 *   - S3/CloudFront image support via config/images.js
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

// ── Rank styles ───────────────────────────────────────────────────────────────
const RANK_STYLES = {
  1: { bg: "linear-gradient(135deg,#FFD700,#FFA500)", color: "#000", label: "🥇 #1" },
  2: { bg: "linear-gradient(135deg,#C0C0C0,#A0A0A0)", color: "#000", label: "🥈 #2" },
  3: { bg: "linear-gradient(135deg,#CD7F32,#A0522D)", color: "#fff", label: "🥉 #3" },
};
function rankStyle(rank) {
  return RANK_STYLES[rank] || { bg: "#1e293b", color: "#94a3b8", label: `#${rank}` };
}

// ── Score bar colour ──────────────────────────────────────────────────────────
function scoreBarColor(rank) {
  if (rank === 1) return "#f59e0b";
  if (rank === 2) return "#94a3b8";
  if (rank === 3) return "#cd7f32";
  return "#3b82f6";
}

// ── Skeleton card ─────────────────────────────────────────────────────────────
const SkeletonCard = () => (
  <div className="col-xxl-2 col-xl-3 col-lg-4 col-sm-6">
    <div
      className="rounded-16 p-16 h-100"
      style={{ background: "#1e293b", border: "1px solid #334155" }}
    >
      <div className="rounded-8 mb-12" style={{ height: 140, background: "#334155" }} />
      <div className="rounded mb-8" style={{ height: 10, width: "70%", background: "#334155" }} />
      <div className="rounded" style={{ height: 10, width: "40%", background: "#334155" }} />
    </div>
  </div>
);

// ── Product card ──────────────────────────────────────────────────────────────
function ProductCard({ item, maxScore, onTrack }) {
  const [hovered, setHovered] = useState(false);
  const rs = rankStyle(item.rank);
  const imageUrl = getProductImage(item.id, item.image);
  const scorePercent = maxScore > 0 ? Math.round((item.score / maxScore) * 100) : 0;

  return (
    <div className="col-xxl-2 col-xl-3 col-lg-4 col-sm-6">
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          background: hovered
            ? "linear-gradient(145deg, #1e293b, #0f172a)"
            : "#1e293b",
          border: hovered
            ? "1px solid transparent"
            : "1px solid #334155",
          backgroundClip: "padding-box",
          borderRadius: 16,
          padding: 16,
          height: "100%",
          position: "relative",
          transition: "transform 0.25s ease, box-shadow 0.25s ease",
          transform: hovered ? "translateY(-6px) scale(1.02)" : "translateY(0) scale(1)",
          boxShadow: hovered
            ? `0 20px 40px rgba(0,0,0,0.4), 0 0 0 1px ${scoreBarColor(item.rank)}55`
            : "0 4px 12px rgba(0,0,0,0.2)",
          cursor: "pointer",
        }}
      >
        {/* Gradient border overlay on hover */}
        {hovered && (
          <div
            style={{
              position: "absolute", inset: 0, borderRadius: 16, padding: 1,
              background: `linear-gradient(135deg, ${scoreBarColor(item.rank)}, transparent)`,
              WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
              WebkitMaskComposite: "xor",
              maskComposite: "exclude",
              pointerEvents: "none",
            }}
          />
        )}

        {/* Rank badge */}
        <span
          className="position-absolute top-0 start-0 m-10 px-10 py-4 rounded-pill text-xs fw-bold"
          style={{ background: rs.bg, color: rs.color, zIndex: 2 }}
        >
          {rs.label}
        </span>

        {/* Product image */}
        <Link
          to="/product-details-two"
          onClick={() => onTrack(item.id, "view")}
          style={{ display: "block", textDecoration: "none" }}
        >
          <div
            className="flex-center rounded-12 mb-12"
            style={{
              height: 140,
              background: hovered ? "#0f172a" : "#0f172a",
              overflow: "hidden",
            }}
          >
            <img
              src={imageUrl}
              alt={item.name}
              style={{
                maxHeight: 120,
                maxWidth: "100%",
                objectFit: "contain",
                transition: "transform 0.3s ease",
                transform: hovered ? "scale(1.1)" : "scale(1)",
                filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.4))",
              }}
              onError={(e) => { e.target.src = FALLBACK_IMAGE; }}
            />
          </div>
        </Link>

        {/* Category */}
        <p className="text-xs mb-6" style={{ color: "#64748b" }}>{item.category}</p>

        {/* Name */}
        <h6 className="mb-10 fw-semibold text-line-2" style={{ color: "#e2e8f0", fontSize: "0.85rem" }}>
          <Link to="/product-details-two" style={{ color: "inherit", textDecoration: "none" }}
            onClick={() => onTrack(item.id, "view")}>
            {item.name}
          </Link>
        </h6>

        {/* Price */}
        <div className="flex-between align-items-center mb-10">
          <div>
            {item.originalPrice && (
              <span className="text-xs text-decoration-line-through me-6" style={{ color: "#475569" }}>
                ${item.originalPrice}
              </span>
            )}
            <span className="fw-bold" style={{ color: "#f8fafc", fontSize: "1rem" }}>
              ${item.price}
            </span>
          </div>
          {item.discount > 0 && (
            <span
              className="text-xs px-8 py-2 rounded-pill fw-medium"
              style={{ background: "rgba(34,197,94,0.15)", color: "#22c55e" }}
            >
              -{item.discount}%
            </span>
          )}
        </div>

        {/* Score bar */}
        <div className="mb-12">
          <div className="flex-between mb-4">
            <span className="text-xs" style={{ color: "#64748b" }}>Trending Score</span>
            <span className="text-xs fw-bold" style={{ color: scoreBarColor(item.rank) }}>
              🔥 {item.score}
            </span>
          </div>
          <div className="rounded-pill" style={{ height: 4, background: "#334155" }}>
            <div
              className="rounded-pill"
              style={{
                height: 4,
                width: `${scorePercent}%`,
                background: `linear-gradient(90deg, ${scoreBarColor(item.rank)}, ${scoreBarColor(item.rank)}88)`,
                transition: "width 0.6s ease",
              }}
            />
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex-align gap-8">
          <button
            className="flex-grow-1 rounded-pill text-xs fw-medium py-8"
            onClick={() => onTrack(item.id, "cart")}
            style={{
              background: "rgba(59,130,246,0.1)",
              border: "1px solid rgba(59,130,246,0.3)",
              color: "#60a5fa",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
            title="+3 pts"
          >
            <i className="ph ph-shopping-cart me-4" /> Cart
          </button>
          <button
            className="rounded-pill text-xs fw-bold py-8 px-14"
            onClick={() => onTrack(item.id, "purchase")}
            style={{
              background: "linear-gradient(90deg, #f59e0b, #ef4444)",
              border: "none",
              color: "#fff",
              cursor: "pointer",
              boxShadow: hovered ? "0 4px 12px rgba(245,158,11,0.4)" : "none",
              transition: "all 0.2s",
            }}
            title="+10 pts"
          >
            Buy
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function TrendingProducts() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`${API}/trending`);
      const data = await res.json();
      setProducts(Array.isArray(data) ? data : data.products || []);
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    load();
    const sock = getSocket();
    sock.on("connect", () => setConnected(true));
    sock.on("disconnect", () => setConnected(false));
    sock.on("trending_updated", (updated) => {
      setProducts(updated);
      setLastUpdated(new Date().toLocaleTimeString());
    });
    return () => {
      sock.off("trending_updated");
      sock.off("connect");
      sock.off("disconnect");
    };
  }, [load]);

  const track = useCallback(async (productId, action = "view") => {
    try {
      await fetch(`${API}/track/${productId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
    } catch {}
  }, []);

  const maxScore = products.length > 0 ? products[0].score : 1;

  return (
    <section className="pt-60 pb-60">
      <div className="container container-lg">
        {/* Section header */}
        <div
          className="rounded-16 p-24 mb-0"
          style={{ background: "#0f172a", border: "1px solid #1e293b" }}
        >
          <div className="flex-between flex-wrap gap-12 mb-24 align-items-center">
            <div className="flex-align gap-12 flex-wrap">
              <h5 className="mb-0 fw-bold" style={{ color: "#f8fafc" }}>
                🔥 Trending Products
              </h5>
              {/* Live dot */}
              <span
                className="px-10 py-4 rounded-pill text-xs fw-medium flex-align gap-6"
                style={{
                  background: connected ? "rgba(34,197,94,0.1)" : "rgba(245,158,11,0.1)",
                  color: connected ? "#22c55e" : "#f59e0b",
                  border: `1px solid ${connected ? "rgba(34,197,94,0.3)" : "rgba(245,158,11,0.3)"}`,
                }}
              >
                <span
                  style={{
                    width: 6, height: 6, borderRadius: "50%",
                    background: connected ? "#22c55e" : "#f59e0b",
                    display: "inline-block",
                    animation: connected ? "pulse 1.5s infinite" : "none",
                  }}
                />
                {connected ? "Live · Valkey" : "Connecting..."}
              </span>
              {lastUpdated && (
                <span className="text-xs" style={{ color: "#475569" }}>
                  Updated {lastUpdated}
                </span>
              )}
            </div>

            <div className="flex-align gap-16">
              {/* Score legend */}
              <div className="flex-align gap-10 d-none d-md-flex">
                <span className="text-xs px-8 py-2 rounded-pill" style={{ background: "#1e293b", color: "#64748b" }}>👁 View +1</span>
                <span className="text-xs px-8 py-2 rounded-pill" style={{ background: "#1e293b", color: "#64748b" }}>🛒 Cart +3</span>
                <span className="text-xs px-8 py-2 rounded-pill" style={{ background: "#1e293b", color: "#64748b" }}>💳 Buy +10</span>
              </div>
              <Link to="/shop" className="text-xs fw-medium" style={{ color: "#3b82f6" }}>
                View All →
              </Link>
            </div>
          </div>

          {/* Grid */}
          <div className="row g-16">
            {loading
              ? Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
              : products.length === 0
              ? <p className="text-center py-40" style={{ color: "#475569" }}>No trending data yet.</p>
              : products.map((item) => (
                  <ProductCard
                    key={item.id}
                    item={item}
                    maxScore={maxScore}
                    onTrack={track}
                  />
                ))
            }
          </div>
        </div>
      </div>
    </section>
  );
}
