const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const User = require("../models/User");
const { ensureCalendarToken } = require("../utils/ics");
const { probeLlm, getLlmCreds } = require("../utils/llm");

function sign(user) {
  return jwt.sign({ id: user._id }, process.env.JWT_SECRET || "kairo-dev-secret", {
    expiresIn: "7d",
  });
}

function publicUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    timezone: user.timezone,
    language: user.language,
    theme: user.theme,
    calendarToken: user.calendarToken || null,
    hasLlmKey: Boolean(user.llmKeySet),
    llmProvider: user.llmProvider || "nvidia",
    llmModel: user.llmModel || "meta/muse-glimmer-30b",
    llmBaseUrl: user.llmBaseUrl || "https://integrate.api.nvidia.com/v1",
    createdAt: user.createdAt,
  };
}

exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email, and password are required" });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }
    const exists = await User.findOne({ email: email.toLowerCase() });
    if (exists) return res.status(409).json({ message: "Email already registered" });
    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, password: hashed });
    await ensureCalendarToken(user);
    return res.status(201).json({ token: sign(user), user: publicUser(user) });
  } catch (err) {
    return res.status(500).json({ message: "Could not create account" });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: (email || "").toLowerCase() });
    if (!user) return res.status(401).json({ message: "Invalid email or password" });
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ message: "Invalid email or password" });
    await ensureCalendarToken(user);
    return res.json({ token: sign(user), user: publicUser(user) });
  } catch {
    return res.status(500).json({ message: "Login failed" });
  }
};

exports.me = async (req, res) => {
  await ensureCalendarToken(req.user);
  return res.json({ user: publicUser(req.user) });
};

exports.updateProfile = async (req, res) => {
  try {
    const { name, timezone, language, theme } = req.body;
    if (name) req.user.name = name;
    if (timezone) req.user.timezone = timezone;
    if (language) req.user.language = language;
    if (theme) req.user.theme = theme;
    await req.user.save();
    return res.json({ user: publicUser(req.user) });
  } catch {
    return res.status(500).json({ message: "Could not update profile" });
  }
};

exports.rotateCalendarToken = async (req, res) => {
  req.user.calendarToken = crypto.randomBytes(18).toString("hex");
  await req.user.save();
  return res.json({ user: publicUser(req.user) });
};

exports.setLlmKey = async (req, res) => {
  const { apiKey, provider, model, baseUrl } = req.body;
  const user = await User.findById(req.user._id).select("+llmApiKey");
  if (apiKey && String(apiKey).trim()) {
    user.llmApiKey = String(apiKey).trim();
    user.llmKeySet = true;
  }
  if (["openai", "groq", "nvidia"].includes(provider)) user.llmProvider = provider;
  if (model) user.llmModel = model;
  if (baseUrl) user.llmBaseUrl = String(baseUrl).trim().replace(/\/$/, "");
  if (user.llmApiKey?.startsWith("gsk_")) user.llmProvider = "groq";
  if (user.llmApiKey?.startsWith("nvapi-")) user.llmProvider = "nvidia";
  if (user.llmProvider === "nvidia" && !user.llmBaseUrl) {
    user.llmBaseUrl = "https://integrate.api.nvidia.com/v1";
  }
  if (user.llmProvider === "nvidia" && !user.llmModel) {
    user.llmModel = "meta/muse-glimmer-30b";
  }
  await user.save();
  return res.json({ user: publicUser(user) });
};

exports.clearLlmKey = async (req, res) => {
  const user = await User.findById(req.user._id).select("+llmApiKey");
  user.llmApiKey = "";
  user.llmKeySet = false;
  await user.save();
  return res.json({ user: publicUser(user) });
};

exports.testLlmKey = async (req, res) => {
  const creds = await getLlmCreds(req.user._id);
  const result = await probeLlm(creds);
  return res.status(result.ok ? 200 : 400).json(result);
};

exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Current and new password are required" });
    }
    const user = await User.findById(req.user._id);
    const ok = await bcrypt.compare(currentPassword, user.password);
    if (!ok) return res.status(401).json({ message: "Current password is incorrect" });
    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();
    return res.json({ message: "Password updated" });
  } catch {
    return res.status(500).json({ message: "Could not change password" });
  }
};