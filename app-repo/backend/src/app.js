const express = require("express");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const cors = require("cors");

const { env } = require("./config/env");
const { getMongoStatus } = require("./config/mongo");
const { authRouter } = require("./routes/auth");
const { tasksRouter } = require("./routes/tasks");
const { authMiddleware } = require("./middleware/auth");
const { errorMiddleware } = require("./middleware/error");

const createApp = ({ redis }) => {
  const app = express();
  app.disable("x-powered-by");

  const limiterHandler = (req, res) => {
    const retryAfterSeconds = Math.ceil(env.rateLimitWindowMs / 1000);
    res.set("Retry-After", String(retryAfterSeconds));
    return res.status(429).json({
      error: "Too many requests",
      retryAfterSeconds,
    });
  };

  const globalLimiter = rateLimit({
    windowMs: env.rateLimitWindowMs,
    limit: env.rateLimitMax,
    standardHeaders: true,
    legacyHeaders: false,
    handler: limiterHandler,
  });
  const authLimiter = rateLimit({
    windowMs: env.rateLimitWindowMs,
    limit: Math.max(10, Math.floor(env.rateLimitMax / 3)),
    standardHeaders: true,
    legacyHeaders: false,
    handler: limiterHandler,
  });
  const taskCreateLimiter = rateLimit({
    windowMs: env.rateLimitWindowMs,
    limit: Math.max(20, Math.floor(env.rateLimitMax / 2)),
    standardHeaders: true,
    legacyHeaders: false,
    handler: limiterHandler,
  });

  app.use(helmet());
  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json({ limit: "256kb" }));
  app.use(globalLimiter);

  app.get("/healthz", (req, res) => res.json({ ok: true }));
  app.get("/readyz", async (req, res) => {
    try {
      await redis.ping();
      const mongo = getMongoStatus();
      const mongoOk = mongo.readyState === 1;
      if (!mongoOk) return res.status(503).json({ ok: false, mongo });
      return res.json({ ok: true, mongo });
    } catch {
      return res.status(503).json({ ok: false });
    }
  });

  app.use((req, res, next) => {
    req.redis = redis;
    return next();
  });

  app.use("/api/auth", authLimiter, authRouter);
  app.post("/api/tasks", taskCreateLimiter);
  app.use("/api/tasks", authMiddleware, tasksRouter);

  app.use(errorMiddleware);
  return app;
};

module.exports = { createApp };
