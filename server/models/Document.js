const mongoose = require("mongoose");

const documentSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    originalName: { type: String, required: true },
    filename: { type: String, required: true },
    mimeType: { type: String, default: "text/plain" },
    size: { type: Number, default: 0 },
    excerpt: { type: String, default: "" },
    summary: { type: String, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Document", documentSchema);