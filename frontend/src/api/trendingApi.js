/**
 * api/trendingApi.js
 * Thin wrapper around the Express backend API for trending products.
 */

const BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

/**
 * Fetch top trending products from Valkey via the Express API.
 * @returns {Promise<Array>} Array of product objects with trendingScore and rank
 */
export async function fetchTrendingProducts() {
  const res = await fetch(`${BASE_URL}/api/trending`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const data = await res.json();
  return data.products;
}

/**
 * Track a product view/click — increments its Valkey sorted set score.
 * Fire-and-forget: errors are silently swallowed so UI is never blocked.
 * @param {string} productId
 */
export async function trackProductView(productId) {
  try {
    await fetch(`${BASE_URL}/api/trending/track`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId }),
    });
  } catch {
    // Non-critical — don't surface tracking errors to the user
  }
}
