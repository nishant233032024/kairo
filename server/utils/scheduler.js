const cron = require("node-cron");
const Reminder = require("../models/Reminder");

function startReminderScheduler(io) {
  cron.schedule("* * * * *", async () => {
    const due = await Reminder.find({
      notified: false,
      remindAt: { $lte: new Date() },
    }).limit(50);
    for (const r of due) {
      io.to(String(r.user)).emit("reminder:due", {
        id: r._id,
        title: r.title,
        remindAt: r.remindAt,
      });
      r.notified = true;
      await r.save();
    }
  });
}

module.exports = { startReminderScheduler };