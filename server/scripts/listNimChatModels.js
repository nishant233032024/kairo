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
  const { data } = await axios.get(`${creds.baseUrl.replace(/\/$/, "")}/models`, {
    timeout: 20000,
    headers: { Authorization: `Bearer ${creds.key}` },
  });
  const ids = (data.data || []).map((m) => m.id);
  const chatish = ids.filter((id) => /instruct|nemotron|llama-3|qwen|mistral|gemma/i.test(id)).slice(0, 20);
  console.log(chatish.join("\n"));
  await mongoose.disconnect();
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});