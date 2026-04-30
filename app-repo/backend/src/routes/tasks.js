const express = require("express");
const { z } = require("zod");
const { Task } = require("../models/Task");
const { env } = require("../config/env");

const router = express.Router();

const createTaskSchema = z.object({
  title: z.string().min(1).max(120),
  inputText: z.string().min(1).max(20000),
  operation: z.enum(["uppercase", "lowercase", "reverse", "word_count"]),
});

router.post("/", async (req, res, next) => {
  try {
    const { title, inputText, operation } = createTaskSchema.parse(req.body);
    const task = await Task.create({
      userId: req.user.id,
      title,
      inputText,
      operation,
      status: "pending",
      logs: [{ level: "info", message: "Task created (pending)" }],
    });

    await req.redis.xadd(env.redisStreamKey, "*", "taskId", String(task._id));

    return res.status(201).json({ id: String(task._id), status: task.status });
  } catch (err) {
    return next(err);
  }
});

router.get("/", async (req, res, next) => {
  try {
    const tasks = await Task.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .limit(100)
      .select("_id title operation status createdAt startedAt finishedAt")
      .lean();

    return res.json({
      tasks: tasks.map((t) => ({
        id: String(t._id),
        title: t.title,
        operation: t.operation,
        status: t.status,
        createdAt: t.createdAt,
        startedAt: t.startedAt ?? null,
        finishedAt: t.finishedAt ?? null,
      })),
    });
  } catch (err) {
    return next(err);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const task = await Task.findOne({ _id: req.params.id, userId: req.user.id }).lean();
    if (!task) return res.status(404).json({ error: "Task not found" });

    return res.json({
      id: String(task._id),
      title: task.title,
      inputText: task.inputText,
      operation: task.operation,
      status: task.status,
      result: task.result,
      logs: task.logs ?? [],
      createdAt: task.createdAt,
      startedAt: task.startedAt ?? null,
      finishedAt: task.finishedAt ?? null,
    });
  } catch (err) {
    return next(err);
  }
});

module.exports = { tasksRouter: router };
