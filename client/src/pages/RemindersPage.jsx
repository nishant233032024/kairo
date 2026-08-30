import React, { useEffect, useState } from "react";
import api from "../services/api";

export default function RemindersPage() {
  const [items, setItems] = useState([]);
  const [title, setTitle] = useState("");
  const [at, setAt] = useState("");
  const [nl, setNl] = useState("");

  const load = () => api.get("/calendar/reminders").then((r) => setItems(r.data.reminders));
  useEffect(() => {
    load();
  }, []);

  const add = async (e) => {
    e.preventDefault();
    await api.post("/calendar/reminders", { title, remindAt: at });
    setTitle("");
    load();
  };

  const fromLanguage = async () => {
    const { data } = await api.post("/ai/parse-task", { text: nl });
    if (data.parsed?.remindAt || data.parsed?.dueDate) {
      await api.post("/calendar/reminders", {
        title: data.parsed.title,
        remindAt: data.parsed.remindAt || data.parsed.dueDate,
      });
      setNl("");
      load();
    }
  };

  return (
    <div>
      <div className="page-head">
        <div>
          <p className="muted">Arrive on time, without noise</p>
          <h1>Reminders</h1>
        </div>
      </div>
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="row">
          <input
            className="field"
            placeholder='Remind me about the project review tomorrow at 10 AM'
            value={nl}
            onChange={(e) => setNl(e.target.value)}
          />
          <button className="btn" onClick={fromLanguage}>
            Schedule
          </button>
        </div>
      </div>
      <form className="card row" onSubmit={add} style={{ marginBottom: 16 }}>
        <input className="field" placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} required />
        <input className="field" type="datetime-local" value={at} onChange={(e) => setAt(e.target.value)} required />
        <button className="btn">Set reminder</button>
      </form>
      {items.map((r) => (
        <div className="task-card" key={r._id}>
          <div>
            <div>{r.title}</div>
            <div className="muted">{new Date(r.remindAt).toLocaleString()}</div>
            {r.notified && <span className="chip">Delivered</span>}
          </div>
          <button className="btn subtle" onClick={() => api.delete(`/calendar/reminders/${r._id}`).then(load)}>
            Delete
          </button>
        </div>
      ))}
    </div>
  );
}