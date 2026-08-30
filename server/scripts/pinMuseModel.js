require("dotenv").config({ path: require("path").join(__dirname, "..", "..", ".env") });
const mongoose = require("mongoose");
const User = require("../models/User");

(async () => {
  await mongoose.connect(process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/kairo", {
    serverSelectionTimeoutMS: 4000,
  });
  const r = await User.updateMany(
    {},
    {
      $set: {
        llmProvider: "nvidia",
        llmModel: "meta/muse-glimmer-30b",
        llmBaseUrl: "https://integrate.api.nvidia.com/v1",
      },
    }
  );
  console.log("users pinned to muse-glimmer-30b:", r.modifiedCount);
  await mongoose.disconnect();
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});