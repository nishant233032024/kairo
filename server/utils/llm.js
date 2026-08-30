const axios = require("axios");
const User = require("../models/User");

const NIM_CLOUD = "https://integrate.api.nvidia.com/v1";
const MUSE = "meta/muse-glimmer-30b";
const DEFAULTS = {
  openai: { base: "https://api.openai.com/v1", model: "gpt-4o-mini" },
  groq: { base: "https://api.groq.com/openai/v1", model: "llama-3.3-70b-versatile" },
  nvidia: { base: NIM_CLOUD, model: MUSE },
};

function inferProvider(key, fallback = "nvidia") {
  if (!key) return fallback;
  if (key.startsWith("gsk_")) return "groq";
  if (key.startsWith("nvapi-")) return "nvidia";
  if (key.startsWith("sk-")) return "openai";
  return fallback || "nvidia";
}

function endpoint(creds) {
  let base = (creds.baseUrl || DEFAULTS[creds.provider]?.base || NIM_CLOUD).replace(/\/$/, "");
  if (!/\/v1$/i.test(base) && creds.provider === "nvidia") base = `${base}/v1`;
  return `${base}/chat/completions`;
}

function isMuse(model) {
  return /muse-glimmer/i.test(model || "");
}

function payload({ creds, system, user, json = false, probe = false }) {
  const messages = [];
  if (system) messages.push({ role: "system", content: system });
  messages.push({ role: "user", content: user });
  const body = {
    model: creds.model,
    messages,
    stream: false,
  };
  if (isMuse(creds.model) || creds.provider === "nvidia") {
    body.temperature = json ? 0.7 : 0.95;
    body.top_p = 1;
    body.max_tokens = probe ? 256 : json ? 2048 : 2048;
    body.reasoning_effort = probe ? "low" : process.env.NIM_REASONING_EFFORT || "medium";
  } else {
    body.temperature = json ? 0.2 : 0.4;
    body.max_tokens = json ? 800 : 1024;
  }
  return body;
}

function errDetail(err) {
  return (
    err.response?.data?.error?.message ||
    err.response?.data?.detail ||
    err.response?.data?.message ||
    (typeof err.response?.data === "string" ? err.response.data : null) ||
    err.message
  );
}

exports.getLlmCreds = async function getLlmCreds(userId) {
  const u = userId
    ? await User.findById(userId).select("+llmApiKey llmProvider llmModel llmBaseUrl")
    : null;
  const key = (
    u?.llmApiKey ||
    process.env.NVIDIA_API_KEY ||
    process.env.OPENAI_API_KEY ||
    process.env.GROQ_API_KEY ||
    ""
  ).trim();
  const envProvider = process.env.NVIDIA_API_KEY
    ? "nvidia"
    : process.env.GROQ_API_KEY && !process.env.OPENAI_API_KEY
      ? "groq"
      : process.env.OPENAI_API_KEY
        ? "openai"
        : "nvidia";
  const provider = inferProvider(key, u?.llmProvider || envProvider);
  const model =
    process.env.NIM_MODEL ||
    u?.llmModel ||
    process.env.OPENAI_MODEL ||
    DEFAULTS[provider].model;
  const baseUrl = process.env.NIM_BASE_URL || u?.llmBaseUrl || DEFAULTS[provider].base;
  return { key, provider, model, baseUrl };
};

exports.complete = async function complete({ creds, system, user, json = false }) {
  if (!creds?.key) return null;
  try {
    const { data } = await axios.post(endpoint(creds), payload({ creds, system, user, json }), {
      timeout: isMuse(creds.model) ? 90000 : 45000,
      headers: {
        Authorization: `Bearer ${creds.key}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    });
    const msg = data?.choices?.[0]?.message || {};
    const text = textFromMessage(msg);
    if (!json) return text;
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start >= 0 && end > start) return JSON.parse(text.slice(start, end + 1));
    return null;
  } catch (err) {
    console.warn("LLM call failed:", errDetail(err));
    return null;
  }
};

function textFromMessage(msg) {
  const content = msg.content;
  if (typeof content === "string" && content.trim()) return content;
  if (Array.isArray(content)) {
    return content.map((p) => (typeof p === "string" ? p : p.text || "")).join("").trim();
  }
  return (msg.reasoning_content || "").trim();
}

exports.probeLlm = async function probeLlm(creds) {
  if (!creds?.key) return { ok: false, message: "No key" };
  try {
    const { data } = await axios.post(
      endpoint(creds),
      payload({
        creds,
        probe: true,
        system: "Reply with the single word ok.",
        user: "ping",
      }),
      {
        timeout: 60000,
        headers: {
          Authorization: `Bearer ${creds.key}`,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      }
    );
    const text = textFromMessage(data?.choices?.[0]?.message || {});
    if (!text) return { ok: false, message: "Empty reply from NIM. Check the model id." };
    return { ok: true, message: `Kairo reached ${creds.model}.` };
  } catch (err) {
    return { ok: false, message: errDetail(err) || "The provider rejected the key or the model name." };
  }
};