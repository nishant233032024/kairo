/**
 * Seeds a lived-in studio day for the guest account.
 *   email:    demo@kairo.app
 *   password: kairo123
 *
 * Run from /server:  npm run seed
 */
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", "..", ".env") });
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const fs = require("fs");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const User = require("../models/User");
const Task = require("../models/Task");
const Note = require("../models/Note");
const Reminder = require("../models/Reminder");
const Event = require("../models/Event");
const Document = require("../models/Document");
const ChatMessage = require("../models/ChatMessage");

const EMAIL = "demo@kairo.app";
const PASSWORD = "kairo123";

function at(day, hours, minutes = 0) {
  const d = new Date(day);
  d.setHours(hours, minutes, 0, 0);
  return d;
}

function addDays(day, n) {
  const d = new Date(day);
  d.setDate(d.getDate() + n);
  return d;
}

async function connect() {
  const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/kairo";
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 2500 });
  } catch (err) {
    console.warn("MongoDB unavailable, using in-memory database:", err.message);
    const { MongoMemoryServer } = require("mongodb-memory-server");
    const mem = await MongoMemoryServer.create();
    await mongoose.connect(mem.getUri());
    console.warn("In-memory Mongo will not persist into the running API. Start MongoDB, then seed again.");
  }
}

async function run() {
  await connect();

  const now = new Date();
  const today = at(now, 0, 0);
  const hashed = await bcrypt.hash(PASSWORD, 10);

  let user = await User.findOne({ email: EMAIL });
  if (!user) {
    user = await User.create({
      name: "Asha Rao",
      email: EMAIL,
      password: hashed,
      timezone: "Asia/Kolkata",
      language: "en",
      theme: "light",
    });
  } else {
    user.name = "Asha Rao";
    user.password = hashed;
    user.timezone = "Asia/Kolkata";
    await user.save();
  }

  const uid = user._id;
  await Promise.all([
    Task.deleteMany({ user: uid }),
    Note.deleteMany({ user: uid }),
    Reminder.deleteMany({ user: uid }),
    Event.deleteMany({ user: uid }),
    Document.deleteMany({ user: uid }),
    ChatMessage.deleteMany({ user: uid }),
  ]);

  const tInterview = await Task.create({
    user: uid,
    title: "Prepare interview presentation",
    description: "Narrative, three product stories, and a closing ask. Rehearse once standing.",
    priority: "High",
    status: "In Progress",
    dueDate: at(today, 18, 0),
    tags: ["interview", "career"],
    estimatedEffort: 4,
    timeSpent: 2,
    source: "ai",
  });

  const tApi = await Task.create({
    user: uid,
    title: "Complete API integration",
    description: "Auth handshake, retry on 429, and wire the task list to the live feed.",
    priority: "High",
    status: "Pending",
    dueDate: at(today, 11, 0),
    tags: ["api", "kairo"],
    estimatedEffort: 3,
    timeSpent: 1,
  });

  const tDocs = await Task.create({
    user: uid,
    title: "Complete documentation",
    description: "README, env examples, and a one-page operator guide.",
    priority: "Medium",
    status: "Pending",
    dueDate: addDays(today, 1),
    tags: ["docs"],
    estimatedEffort: 2,
  });

  const tFiles = await Task.create({
    user: uid,
    title: "Organize project files",
    description: "Archive last week's experiments. Keep only the current atelier.",
    priority: "Low",
    status: "Pending",
    dueDate: addDays(today, 4),
    tags: ["studio"],
    estimatedEffort: 1,
  });

  const tReview = await Task.create({
    user: uid,
    title: "Final review before ship",
    description: "Walk the dashboard, assistant, and search as a first-time guest.",
    priority: "High",
    status: "Pending",
    dueDate: addDays(today, 1),
    tags: ["review", "kairo"],
    estimatedEffort: 2,
    dependencies: [tApi._id],
  });

  const tTesting = await Task.create({
    user: uid,
    title: "Finish integration testing",
    description: "Happy path, empty states, overdue tasks, and a late reminder.",
    priority: "Medium",
    status: "Pending",
    dueDate: at(today, 16, 0),
    tags: ["testing"],
    estimatedEffort: 2,
  });

  const weekDone = [
    ["Monday stand-up notes filed", -6, 1],
    ["Sketch Atelier layout", -5, 3],
    ["Auth and session hardening", -4, 4],
    ["Notes search and pinning", -3, 2],
    ["Calendar ICS export", -2, 2],
    ["Pulse charts in greyscale", -1, 3],
  ];

  for (const [title, dayOffset, hours] of weekDone) {
    const completedAt = at(addDays(today, dayOffset), 17, 30);
    await Task.create({
      user: uid,
      title,
      description: "Closed as part of this week's atelier.",
      priority: "Medium",
      status: "Completed",
      dueDate: completedAt,
      completedAt,
      tags: ["kairo"],
      estimatedEffort: hours,
      timeSpent: hours,
      createdAt: at(addDays(today, dayOffset - 1), 9, 0),
    });
  }

  await Task.create({
    user: uid,
    title: "Send vendor invoice follow-up",
    description: "Overdue by design — shows on Pulse as drift.",
    priority: "Medium",
    status: "Pending",
    dueDate: at(addDays(today, -2), 12, 0),
    tags: ["admin"],
    estimatedEffort: 1,
  });

  await Note.create({
    user: uid,
    title: "Interview brief",
    category: "study",
    pinned: true,
    tags: ["interview"],
    content: [
      "Role: product engineer for a quiet productivity studio.",
      "They care about judgment under incomplete information.",
      "Stories: shipping Kairo's assistant with user context, not a generic chatbot.",
      "Ask: how they protect deep work on the team.",
      "Close with the day-plan heuristic: deadline × weight × remaining load.",
    ].join("\n"),
    summary:
      "Key Points\n- Interview is for a product engineer who can hold context\n- Lead with the Kairo assistant that reads the user's own work\n- Prepare one question about protecting deep work",
  });

  await Note.create({
    user: uid,
    title: "Project status — Friday ship",
    category: "project",
    pinned: true,
    tags: ["kairo", "deadline"],
    content: [
      "Project deadline is Friday.",
      "API integration is pending.",
      "Testing needs to be completed.",
      "Final review is scheduled tomorrow.",
      "Documentation can follow the review, not block it.",
    ].join("\n"),
    summary:
      "Key Points\n- Project deadline is Friday\n- API integration is pending\n- Testing needs to be completed\n- Final review is scheduled tomorrow",
  });

  await Note.create({
    user: uid,
    title: "Team meeting — morning",
    category: "meeting",
    tags: ["meeting"],
    content: [
      "09:00 Team Meeting.",
      "Owners: Asha (API), Kabir (docs), Mira (review).",
      "Risk: interview prep collides with the 11:00 integration block.",
      "Decision: protect 11:00–13:00. Docs move to late afternoon.",
    ].join("\n"),
  });

  await Note.create({
    user: uid,
    title: "Idea: quieter notifications",
    category: "idea",
    tags: ["product"],
    content:
      "Reminders should arrive as a single line, never a stack. If three fire in ten minutes, fold them into one toast: “Three things, now.”",
  });

  await Note.create({
    user: uid,
    title: "Study — system design flash",
    category: "study",
    tags: ["interview", "study"],
    content:
      "Rate limiting, idempotent writes, and why search by meaning is embeddings plus a fallback tokenizer when the model is dark.",
  });

  await Event.create({
    user: uid,
    title: "Team Meeting",
    start: at(today, 9, 0),
    end: at(today, 9, 45),
    type: "meeting",
    notes: "Stand-up. Keep to owners and risks.",
  });
  await Event.create({
    user: uid,
    title: "Complete API",
    start: at(today, 11, 0),
    end: at(today, 13, 0),
    type: "event",
  });
  await Event.create({
    user: uid,
    title: "Project Review",
    start: at(today, 15, 0),
    end: at(today, 16, 0),
    type: "meeting",
  });
  await Event.create({
    user: uid,
    title: "Study",
    start: at(today, 18, 0),
    end: at(today, 19, 0),
    type: "event",
  });
  await Event.create({
    user: uid,
    title: "Interview loop",
    start: at(addDays(today, 5), 10, 0),
    end: at(addDays(today, 5), 12, 0),
    type: "meeting",
    notes: "Next Friday. Presentation first.",
  });

  await Reminder.create({
    user: uid,
    title: "Project review at 15:00",
    remindAt: at(today, 14, 45),
    relatedTask: tReview._id,
    notified: at(today, 14, 45) <= now,
  });
  await Reminder.create({
    user: uid,
    title: "Protect the API deep-work block",
    remindAt: at(today, 10, 50),
    relatedTask: tApi._id,
    notified: at(today, 10, 50) <= now,
  });
  await Reminder.create({
    user: uid,
    title: "Rehearse interview close",
    remindAt: at(today, 17, 30),
    relatedTask: tInterview._id,
    notified: false,
  });
  await Reminder.create({
    user: uid,
    title: "Project review tomorrow at 10 AM",
    remindAt: at(addDays(today, 1), 10, 0),
    notified: false,
  });

  const uploads = path.join(__dirname, "..", "uploads");
  fs.mkdirSync(uploads, { recursive: true });
  const filename = `demo-operator-guide.txt`;
  const excerpt = [
    "Kairo operator guide",
    "",
    "The studio is meant to be quiet. Capture work in plain language.",
    "Ask the assistant what is due today before rearranging the board.",
    "Search by meaning: things related to my upcoming interview.",
    "Project deadline is Friday. API integration is pending.",
    "Testing needs to be completed. Final review is scheduled tomorrow.",
  ].join("\n");
  fs.writeFileSync(path.join(uploads, filename), excerpt, "utf8");

  await Document.create({
    user: uid,
    originalName: "operator-guide.txt",
    filename,
    mimeType: "text/plain",
    size: excerpt.length,
    excerpt,
    summary:
      "Key Points\n- Capture work in plain language\n- Ask what is due today before rearranging\n- Search by meaning for the interview\n- Deadline Friday; API still pending; review tomorrow",
  });

  await ChatMessage.insertMany([
    {
      user: uid,
      role: "user",
      content: "What do I need to finish today?",
      createdAt: at(today, 8, 12),
    },
    {
      user: uid,
      role: "assistant",
      content:
        "Today:\n• Complete API integration (High) — 11:00\n• Finish integration testing (Medium) — 16:00\n• Prepare interview presentation (High) — 18:00\n\nThe overdue vendor follow-up can wait until after the review.",
      createdAt: at(today, 8, 12),
    },
    {
      user: uid,
      role: "user",
      content: "Which tasks should I prioritize?",
      createdAt: at(today, 8, 14),
    },
    {
      user: uid,
      role: "assistant",
      content:
        "High — Prepare interview presentation\nHigh — Complete API integration\nHigh — Final review before ship\nMedium — Finish integration testing\nMedium — Complete documentation\nLow — Organize project files",
      createdAt: at(today, 8, 14),
    },
    {
      user: uid,
      role: "user",
      content: "Plan my day.",
      createdAt: at(today, 8, 16),
    },
    {
      user: uid,
      role: "assistant",
      content:
        "A focused day, sequenced by deadline and weight.\n09:00  Team Meeting\n11:00  Complete API integration\n15:00  Project Review\n16:00  Integration testing\n18:00  Interview rehearsal\n\nProtect the first deep-work block. Leave 18:00 open for review.",
      createdAt: at(today, 8, 16),
    },
  ]);

  // createdAt on completed tasks: mongoose timestamps may overwrite unless we use update
  // Re-stamp completedAt is already set. createdAt on insertMany/create uses now unless passed —
  // Task.create with createdAt in the object should work if timestamps allow.

  console.log("Kairo demo day seeded.");
  console.log(`  Guest  ${EMAIL}`);
  console.log(`  Key    ${PASSWORD}`);
  console.log(`  Name   Asha Rao`);
  console.log(`  Open   http://localhost:5173/login`);
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
