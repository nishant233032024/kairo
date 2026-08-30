require("dotenv").config({ path: require("path").join(__dirname, "..", "..", ".env") });
const mongoose = require("mongoose");
const axios = require("axios");
const User = require("../models/User");
const { getLlmCreds, probeLlm } = require("../utils/llm");

(async () => {
  await mongoose.connect(process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/kairo", {
    serverSelectionTimeoutMS: 4000,
  });
  const demo = await User.findOne({ email: "demo@kairo.app" });
  const creds = await getLlmCreds(demo._id);
  console.log("model:", creds.model);
  console.log("base:", creds.baseUrl);
  console.log("key set:", Boolean(creds.key), creds.key ? `${creds.key.slice(0, 6)}… (${creds.key.length})` : "");
  const url = `${creds.baseUrl.replace(/\/$/, "")}/chat/completions`;
  const t0 = Date.now();
  const r = await axios.post(
    url,
    {
      model: creds.model,
      temperature: 0.95,
      top_p: 1,
      max_tokens: 256,
      stream: false,
      reasoning_effort: "low",
      messages: [{ role: "user", content: "Reply with the single word ok." }],
    },
    {
      timeout: 90000,
      validateStatus: () => true,
      headers: {
        Authorization: `Bearer ${creds.key}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    }
  );
  const text = r.data?.choices?.[0]?.message?.content || r.data?.choices?.[0]?.message?.reasoning_content;
  console.log("http:", r.status, `${Date.now() - t0}ms`);
  if (r.status === 200 && text) {
    console.log("LIVE: yes");
    console.log("reply:", String(text).slice(0, 160).replace(/\s+/g, " "));
  } else {
    console.log("LIVE: no");
    console.log("detail:", r.data?.detail || r.data?.error?.message || JSON.stringify(r.data).slice(0, 300));
  }
  const probe = await probeLlm(creds);
  console.log("kairo probe:", probe.ok ? "yes" : "no", probe.message);
  await mongoose.disconnect();
  process.exit(r.status === 200 && text ? 0 : 1);
})().catch((e) => {
  console.log("LIVE: no");
  console.log(e.message);
  process.exit(1);
});