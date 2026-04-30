const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { z } = require("zod");
const { User } = require("../models/User");
const { Task } = require("../models/Task");
const { env } = require("../config/env");
const { authMiddleware } = require("../middleware/auth");

const router = express.Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
});

router.post("/register", async (req, res, next) => {
  try {
    const { email, password } = registerSchema.parse(req.body);
    const existing = await User.findOne({ email }).lean();
    if (existing) return res.status(409).json({ error: "Email already registered" });

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({ email, passwordHash });
    return res.status(201).json({ id: String(user._id), email: user.email });
  } catch (err) {
    return next(err);
  }
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(128),
});

router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = loginSchema.parse(req.body);
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: "Invalid credentials" });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: "Invalid credentials" });

    const token = jwt.sign({ email: user.email }, env.jwtSecret, {
      subject: String(user._id),
      expiresIn: env.jwtExpiresIn,
    });

    return res.json({ token });
  } catch (err) {
    return next(err);
  }
});

router.get("/me", authMiddleware, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select("_id email createdAt").lean();
    if (!user) return res.status(404).json({ error: "User not found" });
    return res.json({
      id: String(user._id),
      email: user.email,
      createdAt: user.createdAt,
    });
  } catch (err) {
    return next(err);
  }
});

router.post("/logout", authMiddleware, async (req, res, next) => {
  try {
    const result = await Task.deleteMany({ userId: req.user.id });
    return res.json({
      ok: true,
      removedTasks: result.deletedCount ?? 0,
    });
  } catch (err) {
    return next(err);
  }
});

module.exports = { authRouter: router };
