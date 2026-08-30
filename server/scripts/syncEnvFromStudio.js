require("dotenv").config({ path: require("path").join(__dirname, "..", "..", ".env") });
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const User = require("../models/User");

function upsertEnv(file, updates) {
  let text = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
  if (!text.endsWith("\n")) text += "\n";
  for (const [key, value] of Object.entries(updates)) {
    const line = `${key}=${value}`;
    const re = new RegExp(`^${key}=.*$`, "m");
    if (re.test(text)) text = text.replace(re, line);
    else text += `${line}\n`;
  }
  fs.writeFileSync(file, text);
}

(async () => {
  await mongoose.connect(process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/kairo", {
    serverSelectionTimeoutMS: 4000,
  });
  const user = await User.findOne({ email: "demo@kairo.app" }).select("+llmApiKey llmModel llmBaseUrl llmProvider");
  const key = (user?.llmApiKey || "").trim();
  if (!key) {
    console.log("No studio key on demo@kairo.app — .env not changed.");
    await mongoose.disconnect();
    process.exit(1);
  }
  const envPath = path.join(__dirname, "..", "..", ".env");
  upsertEnv(envPath, {
    NVIDIA_API_KEY: key,
    NIM_BASE_URL: user.llmBaseUrl || "https://integrate.api.nvidia.com/v1",
    NIM_MODEL: user.llmModel || "microsoft/phi-3.5-moe-instruct",
  });
  console.log("Wrote NVIDIA_API_KEY, NIM_BASE_URL, NIM_MODEL to .env (key not printed).");
  console.log("provider:", user.llmProvider);
  console.log("model:", user.llmModel);
  console.log("base:", user.llmBaseUrl);
  console.log("key length:", key.length, "prefix:", key.slice(0, 6));
  await mongoose.disconnect();
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});