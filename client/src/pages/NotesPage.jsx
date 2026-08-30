import React, { useEffect, useState } from "react";
import api from "../services/api";
import Notes from "../components/Notes";

const empty = { title: "", content: "", category: "text", tags: "" };

export default function NotesPage() {
  const [notes, setNotes] = useState([]);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState(null);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");

  const load = () =>
    api.get("/notes", { params: { q: q || undefined, category: cat || undefined } }).then((r) => setNotes(r.data.notes));

  useEffect(() => {
    load();
  }, [cat]);

  const save = async (e) => {
    e.preventDefault();
    const body = { ...form, tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean) };
    if (editing) await api.patch(`/notes/${editing}`, body);
    else await api.post("/notes", body);
    setForm(empty);
    setEditing(null);
    load();
  };

  return (
    <div>
      <div className="page-head">
        <div>
          <p className="muted">Paper, without the clutter</p>
          <h1>Notes</h1>
        </div>
      </div>
      <form className="card" onSubmit={save} style={{ marginBottom: 16 }}>
        <div className="row">
          <input className="field" placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          <select className="field" style={{ width: 160 }} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
            <option value="text">Text</option>
            <option value="meeting">Meeting</option>
            <option value="idea">Idea</option>
            <option value="study">Study</option>
            <option value="project">Project</option>
          </select>
        </div>
        <textarea className="field" style={{ marginTop: 10 }} placeholder="Write freely" value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} />
        <input className="field" style={{ marginTop: 10 }} placeholder="Tags" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} />
        <button className="btn" style={{ marginTop: 12 }}>
          {editing ? "Update" : "Save note"}
        </button>
      </form>
      <div className="row" style={{ marginBottom: 16 }}>
        <input className="field" placeholder="Search notes" value={q} onChange={(e) => setQ(e.target.value)} />
        <button className="btn ghost" onClick={load}>
          Search
        </button>
        <select className="field" style={{ width: 160 }} value={cat} onChange={(e) => setCat(e.target.value)}>
          <option value="">All kinds</option>
          <option value="text">Text</option>
          <option value="meeting">Meeting</option>
          <option value="idea">Idea</option>
          <option value="study">Study</option>
          <option value="project">Project</option>
        </select>
      </div>
      <Notes
        notes={notes}
        onChange={load}
        onEdit={(n) => {
          setEditing(n._id);
          setForm({ title: n.title, content: n.content, category: n.category, tags: (n.tags || []).join(", ") });
        }}
      />
    </div>
  );
}