/**
 * valkey.js — ioredis client pointed at Valkey (AWS ElastiCache or local Docker)
 * ioredis is fully compatible with Valkey (Redis-compatible protocol).
 */

const Redis = require("ioredis");

const redis = new Redis({
  host: process.env.VALKEY_HOST || "127.0.0.1",
  port: parseInt(process.env.VALKEY_PORT || "6379", 10),
  // Only attach password when provided (local Docker usually has none)
  ...(process.env.VALKEY_PASSWORD ? { password: process.env.VALKEY_PASSWORD } : {}),
  // Retry up to 10 times with exponential backoff, then stop
  retryStrategy: (times) => (times > 10 ? null : Math.min(times * 100, 3000)),
  lazyConnect: true,
});

redis.on("connect", () => {
  console.log(`[Valkey] Connected to ${process.env.VALKEY_HOST || "127.0.0.1"}:${process.env.VALKEY_PORT || 6379}`);
});

redis.on("error", (err) => {
  console.error("[Valkey] Error:", err.message);
});

redis.on("reconnecting", () => {
  console.log("[Valkey] Reconnecting...");
});

module.exports = redis;
