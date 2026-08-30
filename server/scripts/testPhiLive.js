require("dotenv").config({ path: require("path").join(__dirname, "..", "..", ".env") });
const mongoose = require("mongoose");
const axios = require("axios");
const User = require("../models/User");
const { getLlmCreds } = require("../utils/llm");

(async () => {
  await mongoose.connect(process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/kairo", {
    serverSelectionTimeoutMS: 4000,
  });
  const users = await User.find({ llmKeySet: true }).select("email llmProvider llmModel llmBaseUrl");
  console.log(
    "accounts with key:",
    users.map((u) => `${u.email} → ${u.llmModel}`).join(" | ") || "(none)"
  );
  const demo = (await User.findOne({ email: "demo@kairo.app" })) || users[0];
  const creds = await getLlmCreds(demo._id);
  console.log("probing", creds.provider, creds.model, creds.baseUrl);
  const t0 = Date.now();
  try {
    const { data, status } = await axios.post(
      `${creds.baseUrl.replace(/\/$/, "")}/chat/completions`,
      {
        model: creds.model,
        temperature: 0.1,
        max_tokens: 24,
        messages: [
          { role: "system", content: "Reply with the single word ok." },
          { role: "user", content: "ping" },
        ],
      },
      {
        timeout: 60000,
        headers: {
          Authorization: `Bearer ${creds.key}`,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      }
    );
    const text = data?.choices?.[0]?.message?.content || "";
    console.log("LIVE: yes", `http ${status} in ${Date.now() - t0}ms`);
    console.log("reply:", JSON.stringify(text).slice(0, 200));
  } catch (err) {
    console.log("LIVE: no", `${Date.now() - t0}ms`);
    console.log(
      err.response?.status || "",
      err.response?.data?.error?.message || err.response?.data?.message || err.message
    );
    process.exitCode = 1;
  }
  await mongoose.disconnect();
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});