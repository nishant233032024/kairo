const mongoose = require("mongoose");

const reminderSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true, trim: true },
    remindAt: { type: Date, required: true },
    relatedTask: { type: mongoose.Schema.Types.ObjectId, ref: "Task" },
    notified: { type: Boolean, default: false },
    channel: { type: String, enum: ["in-app", "socket"], default: "socket" },
  },
  { timestamps: true }
);

reminderSchema.index({ user: 1, remindAt: 1, notified: 1 });

module.exports = mongoose.model("Reminder", reminderSchema);