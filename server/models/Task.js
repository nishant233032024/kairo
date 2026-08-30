const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    priority: { type: String, enum: ["High", "Medium", "Low"], default: "Medium" },
    status: { type: String, enum: ["Pending", "In Progress", "Completed"], default: "Pending" },
    dueDate: { type: Date },
    tags: [{ type: String, trim: true }],
    estimatedEffort: { type: Number, default: 1 },
    dependencies: [{ type: mongoose.Schema.Types.ObjectId, ref: "Task" }],
    sharedWith: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    timeSpent: { type: Number, default: 0 },
    completedAt: { type: Date },
    source: { type: String, enum: ["manual", "ai"], default: "manual" },
  },
  { timestamps: true }
);

taskSchema.index({ user: 1, dueDate: 1 });
taskSchema.index({ title: "text", description: "text", tags: "text" });

module.exports = mongoose.model("Task", taskSchema);