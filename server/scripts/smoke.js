const API = "http://localhost:5000/api";
const WEB = "http://localhost:5173/";

function ok(name, cond, extra = "") {
  const pass = Boolean(cond);
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}${extra ? " — " + extra : ""}`);
  if (!pass) process.exitCode = 1;
  return pass;
}

async function json(url, opts = {}) {
  const res = await fetch(url, opts);
  const text = await res.text();
  let body;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return { status: res.status, body, headers: res.headers, text };
}

(async () => {
  const web = await fetch(WEB);
  ok("client serves", web.status === 200);

  const health = await json(`${API}/health`);
  ok("api health", health.status === 200 && health.body?.ok);

  const login = await json(`${API}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "demo@kairo.app", password: "kairo123" }),
  });
  ok("demo login", login.status === 200 && login.body?.token, login.body?.message);
  if (!login.body?.token) process.exit(1);
  const token = login.body.token;
  const auth = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  const me = await json(`${API}/auth/me`, { headers: auth });
  ok("auth me", me.status === 200 && me.body?.user?.email === "demo@kairo.app");

  const tasks = await json(`${API}/tasks`, { headers: auth });
  ok("list tasks", tasks.status === 200 && Array.isArray(tasks.body?.tasks) && tasks.body.tasks.length > 0, `${tasks.body?.tasks?.length || 0} tasks`);

  const notes = await json(`${API}/notes`, { headers: auth });
  ok("list notes", notes.status === 200 && Array.isArray(notes.body?.notes));

  const events = await json(`${API}/calendar/events`, { headers: auth });
  ok("calendar events", events.status === 200 && Array.isArray(events.body?.events));

  const reminders = await json(`${API}/calendar/reminders`, { headers: auth });
  ok("reminders", reminders.status === 200 && Array.isArray(reminders.body?.reminders));

  const analytics = await json(`${API}/analytics`, { headers: auth });
  ok("analytics", analytics.status === 200 && analytics.body?.totals);

  const docs = await json(`${API}/documents`, { headers: auth });
  ok("documents", docs.status === 200 && Array.isArray(docs.body?.documents));

  const search = await json(`${API}/ai/search?q=interview`, { headers: auth });
  ok("semantic search", search.status === 200 && Array.isArray(search.body?.results));

  const plan = await json(`${API}/ai/plan`, {
    method: "POST",
    headers: auth,
    body: "{}",
  });
  ok("ai plan", plan.status === 200 && plan.body?.plan?.blocks);

  const chat = await json(`${API}/ai/chat`, {
    method: "POST",
    headers: auth,
    body: JSON.stringify({ message: "What do I need to finish today?" }),
  });
  ok("ai chat", chat.status === 200 && typeof chat.body?.reply === "string" && chat.body.reply.length > 0);

  const parsed = await json(`${API}/ai/parse-task`, {
    method: "POST",
    headers: auth,
    body: JSON.stringify({ text: "Remind me to prepare for my interview next Friday" }),
  });
  ok("nl parse task", parsed.status === 200 && parsed.body?.parsed?.title);

  const created = await json(`${API}/tasks`, {
    method: "POST",
    headers: auth,
    body: JSON.stringify({ title: "Smoke test task", priority: "Low", status: "Pending", tags: ["smoke"] }),
  });
  ok("create task", created.status === 201 && created.body?.task?._id);
  const id = created.body?.task?._id;
  if (id) {
    const patched = await json(`${API}/tasks/${id}`, {
      method: "PATCH",
      headers: auth,
      body: JSON.stringify({ status: "Completed" }),
    });
    ok("complete task", patched.status === 200 && patched.body?.task?.status === "Completed");
    const del = await json(`${API}/tasks/${id}`, { method: "DELETE", headers: auth });
    ok("delete task", del.status === 200);
  }

  const feedToken = me.body?.user?.calendarToken;
  if (feedToken) {
    const feed = await fetch(`http://localhost:5000/api/calendar/feed/${feedToken}`);
    const ics = await feed.text();
    ok("calendar feed ics", feed.status === 200 && ics.includes("BEGIN:VCALENDAR"));
  } else {
    ok("calendar feed ics", false, "no calendarToken");
  }

  const llm = await json(`${API}/auth/llm-key/test`, { method: "POST", headers: auth, body: "{}" });
  ok(
    "llm probe (optional)",
    llm.status === 200 || llm.status === 400,
    llm.body?.ok ? llm.body.message : `no live model (${llm.body?.message || llm.status})`
  );

  const gated = await json(`${API}/tasks`);
  ok("reject unauthenticated tasks", gated.status === 401);

  console.log(process.exitCode ? "\nSMOKE: failures above" : "\nSMOKE: all required checks passed");
})().catch((err) => {
  console.error("SMOKE: crashed", err);
  process.exit(1);
});