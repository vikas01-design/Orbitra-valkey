/**
 * AlsoViewed.jsx
 *
 * "Customers Also Viewed" section — powered by Valkey Sets.
 *
 * Usage:
 *   <AlsoViewed productId="prod-3" sessionId={sessionId} />
 *
 * On mount:
 *   1. Tracks this product view  → POST /also-viewed/track
 *   2. Fetches co-viewed products → GET  /also-viewed/:productId
 */

import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";

const API = process.env.REACT_APP_API_URL || "http://localhost:5000";

// Generate or retrieve a session ID (persists for browser tab lifetime)
function getSessionId() {
  let sid = sessionStorage.getItem("orbitra_sid");
  if (!sid) {
    sid = `sid_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    sessionStorage.setItem("orbitra_sid", sid);
  }
  return sid;
}

const SkeletonCard = () => (
  <div className="col-xl-2 col-lg-3 col-sm-4 col-6">
    <div className="border border-gray-100 rounded-16 p-12">
      <div className="bg-gray-100 rounded-8 mb-10" style={{ height: 100 }} />
      <div className="bg-gray-100 rounded mb-6" style={{ height: 10, width: "70%" }} />
      <div className="bg-gray-100 rounded" style={{ height: 10, width: "40%" }} />
    </div>
  </div>
);

export default function AlsoViewed({ productId = "prod-1" }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState(null);

  const sessionId = getSessionId();

  const trackAndFetch = useCallback(async () => {
    // 1. Track this view (fire-and-forget)
    fetch(`${API}/also-viewed/track`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, productId }),
    }).catch(() => {});

    // 2. Fetch co-viewed products
    try {
      const res = await fetch(`${API}/also-viewed/${productId}`);
      const data = await res.json();
      setProducts(data.products || []);
      setSource(data.source);
    } catch {
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [productId, sessionId]);

  useEffect(() => {
    setLoading(true);
    trackAndFetch();
  }, [trackAndFetch]);

  if (!loading && products.length === 0) return null;

  return (
    <section className="also-viewed pt-60 pb-20">
      <div className="container container-lg">
        <div className="border border-gray-100 p-24 rounded-16">

          {/* Header */}
          <div className="flex-between flex-wrap gap-8 mb-24">
            <div className="flex-align gap-12">
              <h5 className="mb-0">👥 Customers Also Viewed</h5>
              {source && (
                <span
                  className="px-8 py-2 text-xs rounded-pill fw-medium"
                  style={{
                    background: source === "valkey" ? "#d1fae5" : "#fef3c7",
                    color: source === "valkey" ? "#065f46" : "#92400e",
                  }}
                >
                  {source === "valkey" ? "⚡ Valkey Sets" : "📦 Fallback"}
                </span>
              )}
            </div>
            <Link
              to="/shop"
              className="text-sm fw-medium text-gray-700 hover-text-main-600 hover-text-decoration-underline"
            >
              View All
            </Link>
          </div>

          {/* Grid */}
          <div className="row g-12">
            {loading
              ? Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
              : products.map((product) => (
                  <div key={product.id} className="col-xl-2 col-lg-3 col-sm-4 col-6">
                    <div className="product-card h-100 p-12 border border-gray-100 hover-border-main-600 rounded-16 position-relative transition-2 text-center">
                      <Link
                        to="/product-details-two"
                        className="product-card__thumb flex-center rounded-8 bg-gray-50 mb-10 d-block"
                        style={{ height: 100 }}
                      >
                        <img
                          src={product.image}
                          alt={product.name}
                          style={{ maxHeight: 80, objectFit: "contain" }}
                          onError={(e) => {
                            e.target.src = "assets/images/thumbs/product-two-img1.png";
                          }}
                        />
                      </Link>

                      <p className="text-xs text-gray-500 mb-4">{product.category}</p>

                      <h6 className="text-sm fw-semibold mb-8 text-line-2">
                        <Link to="/product-details-two" className="link">
                          {product.name}
                        </Link>
                      </h6>

                      <div className="flex-between align-items-center">
                        <span className="text-main-600 fw-bold text-sm">${product.price}</span>
                        {product.discount > 0 && (
                          <span className="text-xs text-success-600 bg-success-50 px-6 py-2 rounded-pill">
                            -{product.discount}%
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
          </div>

          {/* Valkey explanation */}
          <p className="text-xs text-gray-400 mt-16 mb-0">
            <i className="ph ph-info me-4" />
            Powered by <strong>Valkey Sets</strong> — products viewed together in the same session are linked using{" "}
            <code>SADD coviewed:{"{productId}"}</code>
          </p>
        </div>
      </div>
    </section>
  );
}
