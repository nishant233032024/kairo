require("dotenv").config({ path: require("path").join(__dirname, "..", "..", ".env") });
const mongoose = require("mongoose");
const axios = require("axios");
require("../models/User");
const { getLlmCreds } = require("../utils/llm");
const User = require("../models/User");

(async () => {
  await mongoose.connect(process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/kairo", {
    serverSelectionTimeoutMS: 4000,
  });
  const demo = await User.findOne({ email: "demo@kairo.app" });
  const creds = await getLlmCreds(demo._id);
  const base = creds.baseUrl.replace(/\/$/, "");
  try {
    const models = await axios.get(`${base}/models`, {
      timeout: 20000,
      headers: { Authorization: `Bearer ${creds.key}`, Accept: "application/json" },
    });
    const ids = (models.data?.data || []).map((m) => m.id).slice(0, 12);
    console.log("models endpoint: LIVE  status", models.status, "count", (models.data?.data || []).length);
    console.log("sample ids:", ids.join(", ") || "(none listed)");
  } catch (err) {
    console.log(
      "models endpoint: FAIL",
      err.response?.status || "",
      err.response?.data?.error?.message || err.message
    );
  }
  await mongoose.disconnect();
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});