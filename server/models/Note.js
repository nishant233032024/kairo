const mongoose = require("mongoose");

const noteSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true, trim: true },
    content: { type: String, default: "" },
    category: {
      type: String,
      enum: ["text", "meeting", "idea", "study", "project"],
      default: "text",
    },
    tags: [{ type: String, trim: true }],
    pinned: { type: Boolean, default: false },
    summary: { type: String, default: "" },
  },
  { timestamps: true }
);

noteSchema.index({ title: "text", content: "text", tags: "text" });

module.exports = mongoose.model("Note", noteSchema);