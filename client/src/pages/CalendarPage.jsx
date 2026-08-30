import React, { useEffect, useState } from "react";
import api from "../services/api";
import Calendar from "../components/Calendar";

export default function CalendarPage() {
  const [date, setDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [title, setTitle] = useState("");
  const [start, setStart] = useState("");
  const [type, setType] = useState("meeting");
  const [msg, setMsg] = useState("");

  const load = () =>
    api.get("/calendar/events").then((r) => {
      setEvents(r.data.events);
      setTasks(r.data.tasks);
    });

  useEffect(() => {
    load();
  }, []);

  const add = async (e) => {
    e.preventDefault();
    await api.post("/calendar/events", { title, start, type });
    setTitle("");
    load();
  };

  const ics = () => {
    const token = localStorage.getItem("kairo_token");
    fetch(`${import.meta.env.VITE_API_URL || "http://localhost:5000/api"}/calendar/export.ics`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.blob())
      .then((b) => {
        const url = URL.createObjectURL(b);
        const a = document.createElement("a");
        a.href = url;
        a.download = "kairo.ics";
        a.click();
      });
  };

  const importFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    const { data } = await api.post("/calendar/import", fd);
    setMsg(`Imported ${data.imported} events`);
    e.target.value = "";
    load();
  };

  const shift = (n) => setDate(new Date(date.getFullYear(), date.getMonth() + n, 1));

  return (
    <div>
      <div className="page-head">
        <div>
          <p className="muted">
            {date.toLocaleString(undefined, { month: "long", year: "numeric" })}
          </p>
          <h1>Calendar</h1>
        </div>
        <div className="row">
          <button className="btn ghost" onClick={() => shift(-1)}>
            Prev
          </button>
          <button className="btn ghost" onClick={() => shift(1)}>
            Next
          </button>
          <button className="btn ghost" onClick={ics}>
            Export ICS
          </button>
          <label className="btn ghost">
            Import ICS
            <input type="file" accept=".ics,text/calendar" hidden onChange={importFile} />
          </label>
        </div>
      </div>
      {msg && <p className="muted">{msg}</p>}
      <form className="card row" style={{ marginBottom: 16 }} onSubmit={add}>
        <input className="field" placeholder="Event title" value={title} onChange={(e) => setTitle(e.target.value)} required />
        <input className="field" type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} required />
        <select className="field" style={{ width: 160 }} value={type} onChange={(e) => setType(e.target.value)}>
          <option value="meeting">Meeting</option>
          <option value="event">Event</option>
          <option value="deadline">Deadline</option>
        </select>
        <button className="btn">Add</button>
      </form>
      <Calendar date={date} events={events} tasks={tasks} />
    </div>
  );
}