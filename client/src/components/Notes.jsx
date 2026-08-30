import React from "react";
import api from "../services/api";

export default function Notes({ notes, onChange, onEdit }) {
  return (
    <div className="note-grid">
      {notes.map((n) => (
        <article key={n._id} className={`note ${n.pinned ? "pinned" : ""}`}>
          <div className="row" style={{ justifyContent: "space-between" }}>
            <strong>{n.title}</strong>
            <button className="btn ghost" onClick={() => api.patch(`/notes/${n._id}`, { pinned: !n.pinned }).then(onChange)}>
              {n.pinned ? "Unpin" : "Pin"}
            </button>
          </div>
          <p className="muted" style={{ minHeight: 72 }}>
            {(n.content || "").slice(0, 180)}
          </p>
          <div className="chips">
            <span className="chip">{n.category}</span>
            {(n.tags || []).map((t) => (
              <span className="chip" key={t}>
                {t}
              </span>
            ))}
          </div>
          <div className="row" style={{ marginTop: 10 }}>
            <button className="btn subtle" onClick={() => onEdit(n)}>
              Edit
            </button>
            <button
              className="btn subtle"
              onClick={() => api.post("/ai/summarize", { noteId: n._id }).then(onChange)}
            >
              Summarize
            </button>
            <button className="btn subtle" onClick={() => api.delete(`/notes/${n._id}`).then(onChange)}>
              Delete
            </button>
          </div>
          {n.summary && (
            <pre className="muted" style={{ whiteSpace: "pre-wrap", marginTop: 8 }}>
              {n.summary}
            </pre>
          )}
        </article>
      ))}
    </div>
  );
}