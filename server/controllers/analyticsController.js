const Task = require("../models/Task");

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

exports.overview = async (req, res) => {
  const tasks = await Task.find({
    $or: [{ user: req.user._id }, { sharedWith: req.user._id }],
  });
  const now = new Date();
  const completed = tasks.filter((t) => t.status === "Completed");
  const pending = tasks.filter((t) => t.status !== "Completed");
  const overdue = pending.filter((t) => t.dueDate && new Date(t.dueDate) < now);
  const total = tasks.length || 1;
  const completionRate = Math.round((completed.length / (tasks.length || 1)) * 100);

  const byDay = {};
  for (let i = 6; i >= 0; i--) {
    const d = startOfDay(new Date(now.getTime() - i * 86400000));
    const key = d.toISOString().slice(0, 10);
    byDay[key] = { date: key, completed: 0, created: 0 };
  }
  for (const t of tasks) {
    if (t.completedAt) {
      const k = startOfDay(t.completedAt).toISOString().slice(0, 10);
      if (byDay[k]) byDay[k].completed += 1;
    }
    const ck = startOfDay(t.createdAt).toISOString().slice(0, 10);
    if (byDay[ck]) byDay[ck].created += 1;
  }

  const categories = {};
  for (const t of tasks) {
    const tags = t.tags && t.tags.length ? t.tags : ["untagged"];
    for (const tag of tags) {
      categories[tag] = (categories[tag] || 0) + 1;
    }
  }

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthly = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(monthStart.getFullYear(), monthStart.getMonth() - (5 - i), 1);
    const next = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    const done = tasks.filter(
      (t) => t.completedAt && t.completedAt >= d && t.completedAt < next
    ).length;
    return { month: d.toLocaleString("en", { month: "short" }), completed: done };
  });

  const timeSpent = tasks.reduce((s, t) => s + (t.timeSpent || 0), 0);

  res.json({
    totals: {
      total: tasks.length,
      completed: completed.length,
      pending: pending.length,
      overdue: overdue.length,
      completionRate,
      timeSpent,
    },
    weekly: Object.values(byDay),
    categories,
    monthly,
  });
};