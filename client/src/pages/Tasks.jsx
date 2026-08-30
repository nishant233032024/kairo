import React, { useEffect, useState } from "react";
import api from "../services/api";
import TaskList from "../components/TaskList";

const empty = { title: "", description: "", priority: "Medium", dueDate: "", tags: "" };

export default function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [form, setForm] = useState(empty);
  const [nl, setNl] = useState("");
  const [filter, setFilter] = useState("");

  const load = () => api.get("/tasks").then((r) => setTasks(r.data.tasks));
  useEffect(() => {
    load();
  }, []);

  const create = async (e) => {
    e.preventDefault();
    await api.post("/tasks", {
      ...form,
      tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
    });
    setForm(empty);
    load();
  };

  const fromLanguage = async () => {
    if (!nl.trim()) return;
    await api.post("/ai/create-task", { text: nl });
    setNl("");
    load();
  };

  const shown = tasks.filter((t) => {
    if (filter === "shared") return (t.sharedWith || []).length > 0;
    if (!filter) return true;
    return t.status === filter;
  });

  return (
    <div>
      <div className="page-head">
        <div>
          <p className="muted">Capture, rank, complete</p>
          <h1>Tasks</h1>
        </div>
      </div>
      <div className="card" style={{ marginBottom: 16 }}>
        <h3>Speak a task into existence</h3>
        <div className="row">
          <input
            className="field"
            placeholder='e.g. Remind me to prepare for my interview next Friday'
            value={nl}
            onChange={(e) => setNl(e.target.value)}
          />
          <button className="btn" onClick={fromLanguage}>
            Interpret
          </button>
        </div>
      </div>
      <form className="card grid" style={{ marginBottom: 16 }} onSubmit={create}>
        <div className="row">
          <input className="field" placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          <select className="field" style={{ width: 140 }} value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
            <option>High</option>
            <option>Medium</option>
            <option>Low</option>
          </select>
          <input className="field" type="datetime-local" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
        </div>
        <input className="field" placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        <input className="field" placeholder="Tags, comma separated" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} />
        <button className="btn" style={{ width: 160 }}>
          Add task
        </button>
      </form>
      <div className="row" style={{ marginBottom: 12 }}>
        {["", "Pending", "In Progress", "Completed", "shared"].map((s) => (
          <button key={s || "all"} className={`btn ${filter === s ? "" : "ghost"}`} onClick={() => setFilter(s)}>
            {s === "shared" ? "Shared" : s || "All"}
          </button>
        ))}
      </div>
      <TaskList tasks={shown} onChange={load} />
    </div>
  );
}