/**
 * valkey.js
 * Singleton Valkey (Redis-compatible) client using iovalkey.
 * iovalkey is the official ioredis fork maintained by the Valkey community.
 */

const Valkey = require("iovalkey");

let client = null;

function getClient() {
  if (client) return client;

  const config = {
    host: process.env.VALKEY_HOST || "127.0.0.1",
    port: parseInt(process.env.VALKEY_PORT || "6379", 10),
    // Only set password if provided (local Docker usually has none)
    ...(process.env.VALKEY_PASSWORD
      ? { password: process.env.VALKEY_PASSWORD }
      : {}),
    // Retry strategy: retry up to 10 times with exponential backoff
    retryStrategy(times) {
      if (times > 10) return null; // stop retrying
      return Math.min(times * 100, 3000);
    },
    lazyConnect: true,
  };

  client = new Valkey(config);

  client.on("connect", () => {
    console.log(
      `[Valkey] Connected to ${config.host}:${config.port}`
    );
  });

  client.on("error", (err) => {
    console.error("[Valkey] Connection error:", err.message);
  });

  client.on("reconnecting", () => {
    console.log("[Valkey] Reconnecting...");
  });

  return client;
}

module.exports = { getClient };
