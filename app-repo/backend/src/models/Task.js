const mongoose = require("mongoose");

const taskLogSchema = new mongoose.Schema(
  {
    ts: { type: Date, required: true, default: Date.now },
    level: { type: String, required: true, enum: ["info", "error"] },
    message: { type: String, required: true },
  },
  { _id: false }
);

const taskSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true, ref: "User" },
    title: { type: String, required: true },
    inputText: { type: String, required: true },
    operation: {
      type: String,
      required: true,
      enum: ["uppercase", "lowercase", "reverse", "word_count"],
      index: true,
    },
    status: {
      type: String,
      required: true,
      enum: ["pending", "running", "success", "failed"],
      index: true,
      default: "pending",
    },
    result: { type: mongoose.Schema.Types.Mixed, default: null },
    logs: { type: [taskLogSchema], default: [] },
    startedAt: { type: Date, default: null },
    finishedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

taskSchema.index({ userId: 1, createdAt: -1 });

module.exports = { Task: mongoose.model("Task", taskSchema) };
