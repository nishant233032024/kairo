const axios = require("axios");
const { complete } = require("./llm");

const AI_URL = process.env.AI_SERVICE_URL || "http://127.0.0.1:8000";

async function callAi(path, payload) {
  try {
    const { data } = await axios.post(`${AI_URL}${path}`, payload, { timeout: 20000 });
    return data;
  } catch {
    return null;
  }
}

const WEEKDAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

function nextWeekday(from, name) {
  const target = WEEKDAYS.indexOf(name);
  if (target < 0) return null;
  const d = new Date(from);
  const delta = (target + 7 - d.getDay()) % 7 || 7;
  d.setDate(d.getDate() + delta);
  return d;
}

function parseWhen(text, now = new Date()) {
  const t = (text || "").toLowerCase();
  let date = null;
  if (/\btomorrow\b/.test(t)) {
    date = new Date(now);
    date.setDate(date.getDate() + 1);
  }
  if (/\btoday\b/.test(t)) date = new Date(now);
  if (/\bnext week\b/.test(t)) {
    date = new Date(now);
    date.setDate(date.getDate() + 7);
  }
  const dayMatch = t.match(
    /\bnext\s+(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/
  );
  if (dayMatch) date = nextWeekday(now, dayMatch[1]);
  const dayOnly = t.match(/\bon\s+(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/);
  if (!date && dayOnly) date = nextWeekday(now, dayOnly[1]);

  const time = t.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/);
  if (date && time) {
    let h = parseInt(time[1], 10);
    const m = parseInt(time[2] || "0", 10);
    const ap = time[3];
    if (ap === "pm" && h < 12) h += 12;
    if (ap === "am" && h === 12) h = 0;
    date.setHours(h, m, 0, 0);
  } else if (date && !time) {
    date.setHours(9, 0, 0, 0);
  }
  return date;
}

function inferPriority(text) {
  const t = (text || "").toLowerCase();
  if (/(urgent|asap|interview|deadline|critical|important)/.test(t)) return "High";
  if (/(later|someday|maybe|optional|organize|cleanup)/.test(t)) return "Low";
  return "Medium";
}

function extractTitle(text) {
  let t = (text || "").trim();
  t = t.replace(/^remind me (to|about)\s+/i, "");
  t = t.replace(/^please\s+/i, "");
  t = t.replace(/\b(tomorrow|today|next friday|next week|at \d.+)+\s*$/i, "");
  t = t.replace(/\s+/g, " ").trim();
  if (!t) return text || "New task";
  return t.charAt(0).toUpperCase() + t.slice(1);
}

function extractiveSummary(text) {
  const sentences = (text || "")
    .replace(/\n+/g, ". ")
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 20);
  if (!sentences.length) return text ? `Key Points\n- ${text.slice(0, 180)}` : "Nothing to summarize.";
  const scored = sentences.map((s) => {
    const weight = (s.match(/\b(deadline|must|need|pending|friday|tomorrow|api|review|test)\b/gi) || [])
      .length;
    return { s, score: weight + Math.min(s.length, 140) / 140 };
  });
  scored.sort((a, b) => b.score - a.score);
  const top = scored.slice(0, 5).map((x) => x.s.replace(/^[•\-]\s*/, ""));
  return `Key Points\n${top.map((p) => `- ${p}`).join("\n")}`;
}

function tokenize(s) {
  return (s || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2);
}

function scoreDoc(queryTokens, blob) {
  const tokens = tokenize(blob);
  if (!tokens.length) return 0;
  let hits = 0;
  for (const q of queryTokens) {
    if (tokens.includes(q)) hits += 2;
    else if (tokens.some((t) => t.includes(q) || q.includes(t))) hits += 1;
  }
  return hits / Math.sqrt(tokens.length);
}

exports.extractTask = async (text, creds) => {
  const fromLlm = await complete({
    creds,
    json: true,
    system:
      "Extract a task as JSON with keys title, description, priority (High|Medium|Low), dueDate (ISO or null), remindAt (ISO or null), tags (array of strings). Return JSON only.",
    user: text || "",
  });
  if (fromLlm?.title) return fromLlm;
  const remote = await callAi("/extract-task", { text });
  if (remote && remote.title) return remote;
  const due = parseWhen(text);
  const remind = /remind/i.test(text) ? due : null;
  return {
    title: extractTitle(text),
    description: text,
    priority: inferPriority(text),
    dueDate: due ? due.toISOString() : null,
    remindAt: remind ? remind.toISOString() : null,
    tags: /interview/i.test(text) ? ["interview"] : [],
  };
};

exports.prioritizeTasks = async (tasks, creds) => {
  const fromLlm = await complete({
    creds,
    json: true,
    system:
      "Rank tasks. Return JSON { ranked: [{ ...task fields you were given, score: number, recommended: High|Medium|Low }] } ordered most urgent first.",
    user: JSON.stringify(
      (tasks || []).map((t) => ({
        _id: t._id,
        title: t.title,
        priority: t.priority,
        dueDate: t.dueDate,
        estimatedEffort: t.estimatedEffort,
      }))
    ),
  });
  if (fromLlm?.ranked) return fromLlm.ranked;
  const remote = await callAi("/prioritize", { tasks });
  if (remote && Array.isArray(remote.ranked)) return remote.ranked;
  const now = Date.now();
  return [...tasks]
    .map((t) => {
      const due = t.dueDate ? new Date(t.dueDate).getTime() : now + 14 * 86400000;
      const urgency = Math.max(0, 10 - (due - now) / 86400000);
      const p = t.priority === "High" ? 3 : t.priority === "Low" ? 1 : 2;
      const effort = t.estimatedEffort || 1;
      const load = tasks.length;
      const score = urgency * 1.4 + p * 3 + Math.min(effort, 5) * 0.4 + Math.min(load, 8) * 0.2;
      return { ...t, score, recommended: urgency > 6 || p === 3 ? "High" : p === 1 ? "Low" : "Medium" };
    })
    .sort((a, b) => b.score - a.score);
};

exports.summarizeText = async (text, creds) => {
  const fromLlm = await complete({
    creds,
    system: "Summarize into a short 'Key Points' bullet list. No fluff.",
    user: text || "",
  });
  if (fromLlm) return fromLlm;
  const remote = await callAi("/summarize", { text });
  if (remote && remote.summary) return remote.summary;
  return extractiveSummary(text);
};

exports.planDay = async (ctx, creds) => {
  const fromLlm = await complete({
    creds,
    json: true,
    system:
      "Create a day plan JSON with headline (string), notes (string), and blocks: [{time, title, priority}]. Use only the user's tasks. JSON only.",
    user: JSON.stringify({
      tasks: (ctx.tasks || []).slice(0, 40).map((t) => ({
        title: t.title,
        priority: t.priority,
        status: t.status,
        dueDate: t.dueDate,
      })),
    }),
  });
  if (fromLlm?.blocks) return fromLlm;
  const remote = await callAi("/plan-day", ctx);
  if (remote && remote.plan) return remote.plan;
  const now = new Date();
  const end = new Date(now);
  end.setHours(23, 59, 59, 0);
  const today = (ctx.tasks || []).filter((t) => {
    if (t.status === "Completed") return false;
    if (!t.dueDate) return t.priority === "High";
    const d = new Date(t.dueDate);
    return d <= new Date(now.getTime() + 86400000 * 2);
  });
  const blocks = [];
  let hour = 9;
  for (const t of today.slice(0, 6)) {
    blocks.push({
      time: `${String(hour).padStart(2, "0")}:00`,
      title: t.title,
      priority: t.priority,
    });
    hour += 2;
  }
  if (!blocks.length) {
    blocks.push({ time: "09:00", title: "Review inbox and set three outcomes", priority: "High" });
    blocks.push({ time: "11:00", title: "Deep work on the most overdue item", priority: "High" });
    blocks.push({ time: "15:00", title: "Notes, tags, and tomorrow's outline", priority: "Medium" });
  }
  return {
    headline: "A focused day, sequenced by deadline and weight.",
    blocks,
    notes: "Protect the first deep-work block. Leave 18:00 open for review.",
  };
};

exports.chatWithContext = async (message, ctx, history, creds) => {
  const fromLlm = await complete({
    creds,
    system:
      "You are Kairo, a calm personal productivity operator. Use the user's tasks, notes, and reminders. Be concise and specific. Never invent work they did not store.",
    user: `CONTEXT:${JSON.stringify({
      tasks: (ctx.tasks || []).slice(0, 40).map((t) => ({
        title: t.title,
        priority: t.priority,
        status: t.status,
        dueDate: t.dueDate,
      })),
      notes: (ctx.notes || []).slice(0, 12).map((n) => ({ title: n.title, content: (n.content || "").slice(0, 300) })),
      reminders: (ctx.reminders || []).slice(0, 12).map((r) => ({ title: r.title, remindAt: r.remindAt })),
    })}\nHISTORY:\n${(history || []).map((h) => `${h.role}: ${h.content}`).join("\n")}\nUSER:${message}`,
  });
  if (fromLlm) return fromLlm;
  const remote = await callAi("/chat", { message, context: ctx, history });
  if (remote && remote.reply) return remote.reply;
  const m = (message || "").toLowerCase();
  const tasks = ctx.tasks || [];
  const notes = ctx.notes || [];
  const pending = tasks.filter((t) => t.status !== "Completed");
  const today = new Date();
  today.setHours(23, 59, 59, 0);
  const dueToday = pending.filter((t) => t.dueDate && new Date(t.dueDate) <= today);
  const week = new Date(Date.now() + 7 * 86400000);
  const dueWeek = pending.filter((t) => t.dueDate && new Date(t.dueDate) <= week);

  if (/finish today|need to finish|today/.test(m) && /task|finish|need|do/.test(m)) {
    if (!dueToday.length) return "Nothing is strictly due today. I would still clear one High item so the week stays light.";
    return `Today:\n${dueToday.map((t) => `• ${t.title} (${t.priority})`).join("\n")}`;
  }
  if (/priorit/.test(m)) {
    const ranked = await exports.prioritizeTasks(pending);
    return ranked
      .slice(0, 6)
      .map((t) => `${t.recommended === "High" ? "High" : t.recommended} — ${t.title}`)
      .join("\n");
  }
  if (/summarize/.test(m) && /note/.test(m)) {
    const blob = notes.slice(0, 8).map((n) => n.content).join("\n");
    return extractiveSummary(blob);
  }
  if (/plan my day|plan the day/.test(m)) {
    const plan = await exports.planDay(ctx);
    return `${plan.headline}\n${plan.blocks.map((b) => `${b.time}  ${b.title}`).join("\n")}`;
  }
  if (/deadline|this week/.test(m)) {
    if (!dueWeek.length) return "No deadlines sit inside the next seven days.";
    return dueWeek.map((t) => `• ${t.title} — ${new Date(t.dueDate).toDateString()}`).join("\n");
  }
  const sample = pending.slice(0, 5).map((t) => `• ${t.title}`).join("\n") || "No open tasks.";
  return `I have your workspace in view.\nOpen work:\n${sample}\n\nAsk me to plan the day, prioritize, or summarize notes.`;
};

exports.semanticSearch = async (q, bags) => {
  const remote = await callAi("/search", { q, ...bags });
  if (remote && remote.results) return remote.results;
  const tokens = tokenize(q);
  const results = [];
  for (const t of bags.tasks || []) {
    const s = scoreDoc(tokens, `${t.title} ${t.description} ${(t.tags || []).join(" ")}`);
    if (s > 0) results.push({ type: "task", score: s, item: t });
  }
  for (const n of bags.notes || []) {
    const s = scoreDoc(tokens, `${n.title} ${n.content} ${(n.tags || []).join(" ")}`);
    if (s > 0) results.push({ type: "note", score: s, item: n });
  }
  for (const r of bags.reminders || []) {
    const s = scoreDoc(tokens, r.title);
    if (s > 0) results.push({ type: "reminder", score: s, item: r });
  }
  for (const d of bags.documents || []) {
    const s = scoreDoc(tokens, `${d.originalName} ${d.summary} ${d.excerpt}`);
    if (s > 0) results.push({ type: "document", score: s, item: d });
  }
  return results.sort((a, b) => b.score - a.score).slice(0, 20);
};