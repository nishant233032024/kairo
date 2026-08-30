const crypto = require("crypto");
const User = require("../models/User");
const Event = require("../models/Event");
const Task = require("../models/Task");

function stamp(d) {
  return new Date(d).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function buildIcs({ events, tasks }) {
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Kairo//EN", "CALSCALE:GREGORIAN"];
  for (const e of events) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:${e._id}@kairo.app`,
      `DTSTAMP:${stamp(e.createdAt || Date.now())}`,
      `DTSTART:${stamp(e.start)}`,
      `SUMMARY:${(e.title || "").replace(/\n/g, " ")}`,
      "END:VEVENT"
    );
  }
  for (const t of tasks) {
    if (!t.dueDate) continue;
    lines.push(
      "BEGIN:VEVENT",
      `UID:task-${t._id}@kairo.app`,
      `DTSTAMP:${stamp(t.createdAt || Date.now())}`,
      `DTSTART:${stamp(t.dueDate)}`,
      `SUMMARY:${(t.title || "").replace(/\n/g, " ")}`,
      "END:VEVENT"
    );
  }
  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

function parseIcsDate(raw) {
  if (!raw) return null;
  const compact = raw.trim().replace(/Z$/, "");
  const m = compact.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?)?/);
  if (!m) return null;
  const iso = `${m[1]}-${m[2]}-${m[3]}T${m[4] || "09"}:${m[5] || "00"}:${m[6] || "00"}`;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

function parseIcs(text) {
  const events = [];
  const blocks = String(text || "").split(/BEGIN:VEVENT/i).slice(1);
  for (const block of blocks) {
    const summary = (block.match(/SUMMARY(?:;[^:]*)?:([^\r\n]+)/i) || [])[1];
    const dt = (block.match(/DTSTART(?:;[^:]*)?:([^\r\n]+)/i) || [])[1];
    const start = parseIcsDate(dt);
    if (summary && start) events.push({ title: summary.trim(), start, type: "event" });
  }
  return events;
}

async function icsPayload(userId) {
  const events = await Event.find({ user: userId });
  const tasks = await Task.find({
    $or: [{ user: userId }, { sharedWith: userId }],
    dueDate: { $ne: null },
  });
  return buildIcs({ events, tasks });
}

async function ensureCalendarToken(user) {
  if (user.calendarToken) return user.calendarToken;
  user.calendarToken = crypto.randomBytes(18).toString("hex");
  await user.save();
  return user.calendarToken;
}

async function userByFeedToken(token) {
  if (!token) return null;
  return User.findOne({ calendarToken: token });
}

module.exports = { buildIcs, parseIcs, icsPayload, ensureCalendarToken, userByFeedToken };