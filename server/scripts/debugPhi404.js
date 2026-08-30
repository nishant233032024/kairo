require("dotenv").config({ path: require("path").join(__dirname, "..", "..", ".env") });
const mongoose = require("mongoose");
const axios = require("axios");
const User = require("../models/User");
const { getLlmCreds } = require("../utils/llm");

(async () => {
  await mongoose.connect(process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/kairo", {
    serverSelectionTimeoutMS: 4000,
  });
  const demo = await User.findOne({ email: "demo@kairo.app" });
  const creds = await getLlmCreds(demo._id);
  const base = creds.baseUrl.replace(/\/$/, "");
  const url = `${base}/chat/completions`;
  console.log("POST", url);
  try {
    await axios.post(
      url,
      {
        model: creds.model,
        max_tokens: 16,
        messages: [{ role: "user", content: "hi" }],
      },
      {
        timeout: 20000,
        headers: {
          Authorization: `Bearer ${creds.key}`,
          "Content-Type": "application/json",
        },
        validateStatus: () => true,
      }
    ).then((r) => {
      console.log("status", r.status);
      console.log("body", JSON.stringify(r.data).slice(0, 800));
    });
  } catch (e) {
    console.log("err", e.message);
  }

  const models = await axios.get(`${base}/models`, {
    timeout: 20000,
    headers: { Authorization: `Bearer ${creds.key}` },
  });
  const ids = (models.data.data || []).map((m) => m.id);
  const hits = ids.filter((id) => /phi-3\.5-moe/i.test(id));
  console.log("phi-3.5-moe matches:", hits.join(", ") || "(none)");
  await mongoose.disconnect();
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});