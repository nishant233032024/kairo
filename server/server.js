const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
require("dotenv").config();

const http = require("http");
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");

const { startReminderScheduler } = require("./utils/scheduler");

function parseOrigins() {
  return (process.env.CLIENT_ORIGIN || "http://localhost:5173")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

const app = express();
const server = http.createServer(app);
const origins = parseOrigins();
const origin = origins.length === 1 ? origins[0] : origins;

if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

const io = new Server(server, {
  cors: { origin, credentials: true },
});
app.set("io", io);

io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error("auth"));
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || "kairo-dev-secret");
    socket.userId = payload.id;
    next();
  } catch {
    next(new Error("auth"));
  }
});

io.on("connection", (socket) => {
  socket.join(String(socket.userId));
});

app.use(cors({ origin, credentials: true }));
app.use(express.json({ limit: "2mb" }));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.get("/api/health", (_req, res) => res.json({ ok: true, name: "kairo" }));
app.use("/api/auth", require("./routes/auth"));
app.use("/api/tasks", require("./routes/tasks"));
app.use("/api/notes", require("./routes/notes"));
app.use("/api/calendar", require("./routes/calendar"));
app.use("/api/analytics", require("./routes/analytics"));
app.use("/api/documents", require("./routes/documents"));
app.use("/api/ai", require("./routes/ai"));

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ message: "Server error" });
});

const PORT = process.env.PORT || 5000;
const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/kairo";

async function connectDb() {
  const opts = { serverSelectionTimeoutMS: process.env.NODE_ENV === "production" ? 8000 : 2500 };
  try {
    await mongoose.connect(uri, opts);
    console.log("MongoDB connected");
  } catch (err) {
    if (process.env.NODE_ENV === "production") {
      console.error("MongoDB connection failed:", err.message);
      process.exit(1);
    }
    console.warn("MongoDB unavailable, using in-memory database:", err.message);
    const { MongoMemoryServer } = require("mongodb-memory-server");
    const mem = await MongoMemoryServer.create();
    await mongoose.connect(mem.getUri());
    console.log("In-memory MongoDB ready");
  }
}

connectDb()
  .then(() => {
    startReminderScheduler(io);
    const host = process.env.HOST || "0.0.0.0";
    server.listen(PORT, host, () => {
      console.log(`Kairo API on http://${host}:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Database bootstrap failed:", err);
    process.exit(1);
  });