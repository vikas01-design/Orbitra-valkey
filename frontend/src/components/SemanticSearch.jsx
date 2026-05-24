/**
 * SemanticSearch.jsx
 *
 * AI-powered semantic search bar.
 * Queries GET /search?q=... and shows ranked results with similarity scores.
 *
 * Usage: drop anywhere — used in HeaderOne search overlay.
 */

import { useState, useCallback, useRef } from "react";
import { Link } from "react-router-dom";

const API = process.env.REACT_APP_API_URL || "http://localhost:5000";

// Debounce helper
function useDebounce(fn, delay) {
  const timer = useRef(null);
  return useCallback(
    (...args) => {
      clearTimeout(timer.current);
      timer.current = setTimeout(() => fn(...args), delay);
    },
    [fn, delay]
  );
}

// Similarity bar colour
function similarityColor(score) {
  if (score >= 0.7) return "#22c55e";
  if (score >= 0.4) return "#f59e0b";
  return "#94a3b8";
}

export default function SemanticSearch({ onClose }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [source, setSource] = useState(null);
  const [searched, setSearched] = useState(false);

  const doSearch = useCallback(async (q) => {
    if (!q.trim()) { setResults([]); setSearched(false); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API}/search?q=${encodeURIComponent(q)}&limit=8`);
      const data = await res.json();
      setResults(data.results || []);
      setSource(data.source);
      setSearched(true);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const debouncedSearch = useDebounce(doSearch, 400);

  const handleChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    debouncedSearch(val);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    doSearch(query);
  };

  return (
    <div className="semantic-search w-100">
      {/* Search input */}
      <form onSubmit={handleSubmit} className="position-relative mb-24">
        <input
          type="text"
          value={query}
          onChange={handleChange}
          autoFocus
          className="form-control py-16 px-24 text-xl rounded-pill pe-64"
          placeholder='Try: "wireless headphones for gym" or "budget android phone"'
          aria-label="Semantic product search"
        />
        <button
          type="submit"
          className="w-48 h-48 bg-main-600 rounded-circle flex-center text-xl text-white position-absolute top-50 translate-middle-y inset-inline-end-0 me-8"
          aria-label="Search"
        >
          {loading
            ? <span className="spinner-border spinner-border-sm text-white" />
            : <i className="ph ph-magnifying-glass" />
          }
        </button>
      </form>

      {/* Source badge */}
      {source && (
        <div className="flex-align gap-8 mb-16">
          <span
            className="px-10 py-4 text-xs rounded-pill fw-medium"
            style={{
              background: source === "semantic" ? "#ede9fe" : "#fef3c7",
              color: source === "semantic" ? "#5b21b6" : "#92400e",
            }}
          >
            {source === "semantic" ? "🧠 AI Semantic Search" : "🔤 Keyword Search"}
          </span>
          <span className="text-xs text-gray-400">{results.length} results for "{query}"</span>
        </div>
      )}

      {/* Results */}
      {searched && results.length === 0 && !loading && (
        <p className="text-center text-gray-500 py-24">No results found for "{query}"</p>
      )}

      {results.length > 0 && (
        <div className="row g-12">
          {results.map((product) => (
            <div key={product.id} className="col-lg-3 col-sm-6">
              <Link
                to="/product-details-two"
                className="d-block border border-gray-100 hover-border-main-600 rounded-16 p-16 transition-2 text-decoration-none"
                onClick={onClose}
              >
                {/* Image */}
                <div
                  className="flex-center rounded-8 bg-gray-50 mb-12"
                  style={{ height: 120 }}
                >
                  <img
                    src={product.image}
                    alt={product.name}
                    style={{ maxHeight: 100, objectFit: "contain" }}
                    onError={(e) => {
                      e.target.src = "assets/images/thumbs/product-two-img1.png";
                    }}
                  />
                </div>

                {/* Category */}
                <p className="text-xs text-gray-400 mb-4">{product.category}</p>

                {/* Name */}
                <h6 className="text-sm fw-semibold text-gray-900 mb-8 text-line-2">
                  {product.name}
                </h6>

                {/* Price + discount */}
                <div className="flex-between align-items-center mb-10">
                  <span className="text-main-600 fw-bold">${product.price}</span>
                  {product.discount > 0 && (
                    <span className="text-xs text-success-600 bg-success-50 px-6 py-2 rounded-pill">
                      -{product.discount}%
                    </span>
                  )}
                </div>

                {/* Similarity bar (only for semantic results) */}
                {product.similarity !== undefined && (
                  <div>
                    <div className="flex-between mb-4">
                      <span className="text-xs text-gray-400">Relevance</span>
                      <span
                        className="text-xs fw-medium"
                        style={{ color: similarityColor(product.similarity) }}
                      >
                        {Math.round(product.similarity * 100)}%
                      </span>
                    </div>
                    <div
                      className="rounded-pill bg-gray-100"
                      style={{ height: 4 }}
                    >
                      <div
                        className="rounded-pill"
                        style={{
                          height: 4,
                          width: `${Math.round(product.similarity * 100)}%`,
                          background: similarityColor(product.similarity),
                          transition: "width 0.4s ease",
                        }}
                      />
                    </div>
                  </div>
                )}
              </Link>
            </div>
          ))}
        </div>
      )}

      {/* How it works note */}
      {!searched && (
        <div className="text-center py-32">
          <p className="text-gray-400 text-sm mb-8">
            🧠 Powered by <strong>AI embeddings</strong> + <strong>Valkey</strong>
          </p>
          <p className="text-gray-300 text-xs">
            Uses <code>all-MiniLM-L6-v2</code> model to understand meaning, not just keywords.
            Vectors stored in Valkey Hash. Ranked by cosine similarity.
          </p>
        </div>
      )}
    </div>
  );
}
