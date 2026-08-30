const mongoose = require("mongoose");

const eventSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true, trim: true },
    start: { type: Date, required: true },
    end: { type: Date },
    type: { type: String, enum: ["meeting", "deadline", "event", "reminder"], default: "event" },
    notes: { type: String, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Event", eventSchema);