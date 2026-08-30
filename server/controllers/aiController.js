const Task = require("../models/Task");
const Note = require("../models/Note");
const Reminder = require("../models/Reminder");
const Document = require("../models/Document");
const ChatMessage = require("../models/ChatMessage");
const Event = require("../models/Event");
const {
  extractTask,
  prioritizeTasks,
  summarizeText,
  planDay,
  chatWithContext,
  semanticSearch,
} = require("../utils/aiClient");
const { getLlmCreds } = require("../utils/llm");

async function userContext(userId) {
  const [tasks, notes, reminders] = await Promise.all([
    Task.find({ $or: [{ user: userId }, { sharedWith: userId }] }).lean(),
    Note.find({ user: userId }).sort({ updatedAt: -1 }).limit(40).lean(),
    Reminder.find({ user: userId, remindAt: { $gte: new Date() } })
      .sort({ remindAt: 1 })
      .limit(20)
      .lean(),
  ]);
  return { tasks, notes, reminders };
}

exports.parseTask = async (req, res) => {
  const { text } = req.body;
  const creds = await getLlmCreds(req.user._id);
  const parsed = await extractTask(text || "", creds);
  res.json({ parsed });
};

exports.createFromLanguage = async (req, res) => {
  const { text } = req.body;
  const creds = await getLlmCreds(req.user._id);
  const parsed = await extractTask(text || "", creds);
  const task = await Task.create({
    user: req.user._id,
    title: parsed.title || text,
    description: parsed.description || text,
    priority: parsed.priority || "Medium",
    dueDate: parsed.dueDate || null,
    tags: parsed.tags || [],
    source: "ai",
  });
  let reminder = null;
  if (parsed.remindAt) {
    reminder = await Reminder.create({
      user: req.user._id,
      title: parsed.title || text,
      remindAt: parsed.remindAt,
      relatedTask: task._id,
    });
  }
  req.app.get("io").to(String(req.user._id)).emit("task:updated", { action: "create", task });
  res.status(201).json({ task, reminder, parsed });
};

exports.prioritize = async (req, res) => {
  const tasks = await Task.find({
    $or: [{ user: req.user._id }, { sharedWith: req.user._id }],
    status: { $ne: "Completed" },
  }).lean();
  const ranked = await prioritizeTasks(tasks, await getLlmCreds(req.user._id));
  res.json({ ranked });
};

exports.summarize = async (req, res) => {
  const { text, noteId } = req.body;
  let source = text || "";
  if (noteId) {
    const note = await Note.findOne({ _id: noteId, user: req.user._id });
    if (note) source = `${note.title}\n${note.content}`;
  }
  const summary = await summarizeText(source, await getLlmCreds(req.user._id));
  if (noteId) {
    await Note.findOneAndUpdate({ _id: noteId, user: req.user._id }, { summary });
  }
  res.json({ summary });
};

exports.plan = async (req, res) => {
  const ctx = await userContext(req.user._id);
  const plan = await planDay(ctx, await getLlmCreds(req.user._id));
  res.json({ plan });
};

exports.applyPlan = async (req, res) => {
  const ctx = await userContext(req.user._id);
  const plan = req.body.plan || (await planDay(ctx, await getLlmCreds(req.user._id)));
  const today = new Date();
  const events = [];
  const reminders = [];
  for (const block of plan.blocks || []) {
    const [h, m] = String(block.time || "09:00").split(":");
    const start = new Date(today);
    start.setHours(Number(h) || 9, Number(m) || 0, 0, 0);
    const event = await Event.create({
      user: req.user._id,
      title: block.title,
      start,
      type: "event",
      notes: "Applied from Kairo daily plan",
    });
    events.push(event);
    const remindAt = new Date(start.getTime() - 10 * 60000);
    reminders.push(
      await Reminder.create({
        user: req.user._id,
        title: block.title,
        remindAt,
      })
    );
  }
  res.status(201).json({ plan, events, reminders });
};

exports.chat = async (req, res) => {
  const { message } = req.body;
  await ChatMessage.create({ user: req.user._id, role: "user", content: message });
  const ctx = await userContext(req.user._id);
  const history = await ChatMessage.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(12).lean();
  const reply = await chatWithContext(message, ctx, history.reverse(), await getLlmCreds(req.user._id));
  await ChatMessage.create({ user: req.user._id, role: "assistant", content: reply });
  res.json({ reply });
};

exports.history = async (req, res) => {
  const messages = await ChatMessage.find({ user: req.user._id }).sort({ createdAt: 1 }).limit(80);
  res.json({ messages });
};

exports.search = async (req, res) => {
  const q = req.query.q || req.body.q || "";
  const [tasks, notes, reminders, documents] = await Promise.all([
    Task.find({ $or: [{ user: req.user._id }, { sharedWith: req.user._id }] }).lean(),
    Note.find({ user: req.user._id }).lean(),
    Reminder.find({ user: req.user._id }).lean(),
    Document.find({ user: req.user._id }).lean(),
  ]);
  const results = await semanticSearch(q, { tasks, notes, reminders, documents });
  res.json({ results });
};