require("dotenv").config({ path: require("path").join(__dirname, "..", "..", ".env") });
const mongoose = require("mongoose");
const axios = require("axios");
const User = require("../models/User");
const { getLlmCreds, complete, endpoint } = require("../utils/llm");

(async () => {
  await mongoose.connect(process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/kairo", {
    serverSelectionTimeoutMS: 4000,
  });
  const demo = await User.findOne({ email: "demo@kairo.app" });
  const creds = await getLlmCreds(demo._id);
  const { data } = await axios.get(`${creds.baseUrl.replace(/\/$/, "")}/models`, {
    timeout: 20000,
    headers: { Authorization: `Bearer ${creds.key}` },
  });
  const ids = (data.data || []).map((m) => m.id);
  const glimmer = ids.filter((id) => /muse|glimmer/i.test(id));
  const llama = ids.find((id) => id === "meta/llama-3.3-70b-instruct") || ids.find((id) => /llama-3.3-70b-instruct/i.test(id));
  console.log("configured model present:", ids.includes(creds.model), creds.model);
  console.log("muse/glimmer ids:", glimmer.join(", ") || "(none)");
  console.log("llama-3.3-70b-instruct present:", Boolean(llama), llama || "");

  const tryChat = async (model, label) => {
    const t0 = Date.now();
    const text = await complete({
      creds: { ...creds, model },
      system: "Reply with the single word ok.",
      user: "ping",
    });
    console.log(`${label}:`, text ? `LIVE reply=${JSON.stringify(text).slice(0, 80)} (${Date.now() - t0}ms)` : `no reply (${Date.now() - t0}ms)`);
  };

  await tryChat(creds.model, "chat current model");
  if (llama && llama !== creds.model) await tryChat(llama, "chat llama-3.3");

  await mongoose.disconnect();
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});