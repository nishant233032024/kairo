require("dotenv").config({ path: require("path").join(__dirname, "..", "..", ".env") });
const mongoose = require("mongoose");
const axios = require("axios");
const User = require("../models/User");
const { getLlmCreds } = require("../utils/llm");

async function ping(creds, model) {
  const t0 = Date.now();
  const r = await axios.post(
    `${creds.baseUrl.replace(/\/$/, "")}/chat/completions`,
    {
      model,
      temperature: 0.1,
      max_tokens: 24,
      messages: [
        { role: "system", content: "Reply with the single word ok." },
        { role: "user", content: "ping" },
      ],
    },
    {
      timeout: 45000,
      validateStatus: () => true,
      headers: {
        Authorization: `Bearer ${creds.key}`,
        "Content-Type": "application/json",
      },
    }
  );
  const text = r.data?.choices?.[0]?.message?.content;
  return { model, status: r.status, ms: Date.now() - t0, text, detail: r.data?.detail || r.data?.title };
}

(async () => {
  await mongoose.connect(process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/kairo", {
    serverSelectionTimeoutMS: 4000,
  });
  const demo = await User.findOne({ email: "demo@kairo.app" });
  const creds = await getLlmCreds(demo._id);
  for (const m of ["microsoft/phi-3.5-moe-instruct", "google/gemma-3-4b-it", "ibm/granite-3.0-8b-instruct"]) {
    const out = await ping(creds, m);
    console.log(JSON.stringify(out));
  }
  await mongoose.disconnect();
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});