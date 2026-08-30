const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    timezone: { type: String, default: "Asia/Kolkata" },
    language: { type: String, default: "en" },
    theme: { type: String, enum: ["light", "dark"], default: "light" },
    calendarToken: { type: String, unique: true, sparse: true },
    llmApiKey: { type: String, select: false, default: "" },
    llmKeySet: { type: Boolean, default: false },
    llmProvider: { type: String, enum: ["openai", "groq", "nvidia"], default: "nvidia" },
    llmModel: { type: String, default: "meta/muse-glimmer-30b" },
    llmBaseUrl: { type: String, default: "https://integrate.api.nvidia.com/v1" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);