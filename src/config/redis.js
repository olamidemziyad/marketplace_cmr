const IORedis = require("ioredis");

let redisConnection;

if (process.env.REDIS_URL) {
  // Production (Railway, Render, etc.)
  redisConnection = new IORedis(process.env.REDIS_URL, {
    maxRetriesPerRequest: null,
  });
  console.log("Redis connecté via REDIS_URL (prod)");
} else {
  // Local
  redisConnection = new IORedis({
    host: "127.0.0.1",
    port: 6379,
    maxRetriesPerRequest: null,
  });
  console.log("Redis local (127.0.0.1:6379)");
}

module.exports = redisConnection;
