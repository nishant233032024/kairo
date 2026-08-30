const Reminder = require("../models/Reminder");
const Event = require("../models/Event");
const Task = require("../models/Task");
const { icsPayload, parseIcs, userByFeedToken } = require("../utils/ics");

exports.listReminders = async (req, res) => {
  const reminders = await Reminder.find({ user: req.user._id }).sort({ remindAt: 1 });
  res.json({ reminders });
};

exports.createReminder = async (req, res) => {
  const reminder = await Reminder.create({ ...req.body, user: req.user._id });
  res.status(201).json({ reminder });
};

exports.removeReminder = async (req, res) => {
  const reminder = await Reminder.findOneAndDelete({ _id: req.params.id, user: req.user._id });
  if (!reminder) return res.status(404).json({ message: "Reminder not found" });
  res.json({ message: "Deleted" });
};

exports.listEvents = async (req, res) => {
  const { from, to } = req.query;
  const filter = { user: req.user._id };
  if (from || to) {
    filter.start = {};
    if (from) filter.start.$gte = new Date(from);
    if (to) filter.start.$lte = new Date(to);
  }
  const events = await Event.find(filter).sort({ start: 1 });
  const tasks = await Task.find({
    $or: [{ user: req.user._id }, { sharedWith: req.user._id }],
    dueDate: { $ne: null },
  });
  res.json({ events, tasks });
};

exports.createEvent = async (req, res) => {
  const event = await Event.create({ ...req.body, user: req.user._id });
  res.status(201).json({ event });
};

exports.removeEvent = async (req, res) => {
  const event = await Event.findOneAndDelete({ _id: req.params.id, user: req.user._id });
  if (!event) return res.status(404).json({ message: "Event not found" });
  res.json({ message: "Deleted" });
};

exports.ics = async (req, res) => {
  const body = await icsPayload(req.user._id);
  res.setHeader("Content-Type", "text/calendar; charset=utf-8");
  res.setHeader("Content-Disposition", "attachment; filename=kairo.ics");
  res.send(body);
};

exports.feed = async (req, res) => {
  const user = await userByFeedToken(req.params.token);
  if (!user) return res.status(404).send("Unknown calendar");
  const body = await icsPayload(user._id);
  res.setHeader("Content-Type", "text/calendar; charset=utf-8");
  res.setHeader("Content-Disposition", "inline; filename=kairo.ics");
  res.send(body);
};

exports.importIcs = async (req, res) => {
  const text = req.file
    ? require("fs").readFileSync(req.file.path, "utf8")
    : req.body.text || "";
  const parsed = parseIcs(text);
  const created = [];
  for (const ev of parsed) {
    created.push(await Event.create({ ...ev, user: req.user._id }));
  }
  res.status(201).json({ imported: created.length, events: created });
};