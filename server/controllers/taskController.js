const Task = require("../models/Task");
const User = require("../models/User");

function scope(userId) {
  return { $or: [{ user: userId }, { sharedWith: userId }] };
}

exports.list = async (req, res) => {
  const { status, priority, q, tag } = req.query;
  const filter = scope(req.user._id);
  if (status) filter.status = status;
  if (priority) filter.priority = priority;
  if (tag) filter.tags = tag;
  let query = Task.find(filter)
    .populate("user", "name email")
    .populate("sharedWith", "name email")
    .sort({ dueDate: 1, createdAt: -1 });
  if (q) query = Task.find({ ...filter, $text: { $search: q } });
  const tasks = await query;
  res.json({ tasks });
};

exports.create = async (req, res) => {
  const task = await Task.create({ ...req.body, user: req.user._id });
  const io = req.app.get("io");
  io.to(String(req.user._id)).emit("task:updated", { action: "create", task });
  res.status(201).json({ task });
};

exports.update = async (req, res) => {
  const task = await Task.findOne({ _id: req.params.id, ...scope(req.user._id) });
  if (!task) return res.status(404).json({ message: "Task not found" });
  const body = { ...req.body };
  if (body.status === "Completed" && task.status !== "Completed") {
    body.completedAt = new Date();
  }
  if (body.status && body.status !== "Completed") body.completedAt = null;
  Object.assign(task, body);
  await task.save();
  req.app.get("io").to(String(req.user._id)).emit("task:updated", { action: "update", task });
  res.json({ task });
};

exports.remove = async (req, res) => {
  const task = await Task.findOneAndDelete({ _id: req.params.id, user: req.user._id });
  if (!task) return res.status(404).json({ message: "Task not found" });
  req.app.get("io").to(String(req.user._id)).emit("task:updated", { action: "delete", id: task._id });
  res.json({ message: "Deleted" });
};

exports.share = async (req, res) => {
  const { email } = req.body;
  const task = await Task.findOne({ _id: req.params.id, user: req.user._id });
  if (!task) return res.status(404).json({ message: "Task not found" });
  const other = await User.findOne({ email: (email || "").toLowerCase() });
  if (!other) return res.status(404).json({ message: "No Kairo account with that email" });
  if (String(other._id) === String(req.user._id)) {
    return res.status(400).json({ message: "You already own this task" });
  }
  if (!task.sharedWith.some((id) => String(id) === String(other._id))) {
    task.sharedWith.push(other._id);
    await task.save();
  }
  req.app.get("io").to(String(other._id)).emit("task:shared", {
    title: task.title,
    from: req.user.name,
  });
  res.json({ task });
};

exports.unshare = async (req, res) => {
  const { email } = req.body;
  const task = await Task.findOne({ _id: req.params.id, user: req.user._id });
  if (!task) return res.status(404).json({ message: "Task not found" });
  const other = await User.findOne({ email: (email || "").toLowerCase() });
  if (!other) return res.status(404).json({ message: "No Kairo account with that email" });
  task.sharedWith = task.sharedWith.filter((id) => String(id) !== String(other._id));
  await task.save();
  res.json({ task });
};