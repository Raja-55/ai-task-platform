const Redis = require("ioredis");

const createRedis = (redisUrl) => {
  const redis = new Redis(redisUrl, {
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
  });
  return redis;
};

module.exports = { createRedis };
