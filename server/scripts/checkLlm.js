require("dotenv").config({ path: require("path").join(__dirname, "..", "..", ".env") });
const mongoose = require("mongoose");
const User = require("../models/User");
const { getLlmCreds, probeLlm } = require("../utils/llm");

function mask(key) {
  if (!key) return "(empty)";
  const t = key.trim();
  if (t.length < 8) return `(set, ${t.length} chars)`;
  return `${t.slice(0, 6)}…${t.slice(-4)} (${t.length} chars)`;
}

(async () => {
  const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/kairo";
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 4000 });

  console.log("env NVIDIA_API_KEY:", process.env.NVIDIA_API_KEY ? mask(process.env.NVIDIA_API_KEY) : "(empty)");
  console.log("env OPENAI_API_KEY:", process.env.OPENAI_API_KEY ? mask(process.env.OPENAI_API_KEY) : "(empty)");
  console.log("env GROQ_API_KEY:", process.env.GROQ_API_KEY ? mask(process.env.GROQ_API_KEY) : "(empty)");
  console.log("env NIM_BASE_URL:", process.env.NIM_BASE_URL || "(unset)");
  console.log("env NIM_MODEL:", process.env.NIM_MODEL || "(unset)");

  const users = await User.find({}).select("+llmApiKey llmKeySet llmProvider llmModel llmBaseUrl email name");
  console.log(`\nusers: ${users.length}`);
  for (const u of users) {
    console.log(
      `- ${u.email}  keySet=${Boolean(u.llmKeySet)}  provider=${u.llmProvider || "-"}  model=${u.llmModel || "-"}  base=${u.llmBaseUrl || "-"}  key=${mask(u.llmApiKey)}`
    );
  }

  const demo = users.find((u) => u.email === "demo@kairo.app") || users[0];
  if (!demo) {
    console.log("\nLIVE: no user to probe");
    await mongoose.disconnect();
    process.exit(1);
  }

  const creds = await getLlmCreds(demo._id);
  console.log("\nresolved creds:");
  console.log("  provider:", creds.provider);
  console.log("  model:", creds.model);
  console.log("  baseUrl:", creds.baseUrl);
  console.log("  key:", mask(creds.key));

  if (!creds.key) {
    console.log("\nLIVE: no — no key on user or in .env");
    await mongoose.disconnect();
    process.exit(2);
  }

  console.log("\nprobing NIM…");
  const result = await probeLlm(creds);
  console.log(result.ok ? "LIVE: yes" : "LIVE: no");
  console.log("  ", result.message);
  await mongoose.disconnect();
  process.exit(result.ok ? 0 : 3);
})().catch(async (err) => {
  console.error("check failed:", err.message);
  try {
    await mongoose.disconnect();
  } catch {}
  process.exit(1);
});