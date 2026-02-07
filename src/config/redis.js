const IORedis = require("ioredis");

let redisConnection = null;

if (process.env.REDIS_URL) {
  // Render / Production
  redisConnection = new IORedis(process.env.REDIS_URL);
  console.log("Redis connecté via REDIS_URL");
} else {
  // Local (Docker / machine)
  redisConnection = new IORedis({
    host: "127.0.0.1",
    port: 6379,
    maxRetriesPerRequest: null,
  });
  console.log("Redis local (127.0.0.1:6379)");
}

module.exports = redisConnection;
