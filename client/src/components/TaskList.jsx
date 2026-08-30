import React, { useState } from "react";
import api from "../services/api";

export default function TaskList({ tasks, onChange }) {
  const [shareId, setShareId] = useState(null);
  const [email, setEmail] = useState("");

  const patch = async (id, body) => {
    await api.patch(`/tasks/${id}`, body);
    onChange();
  };

  return (
    <div>
      {tasks.map((task) => (
        <article key={task._id} className={`task-card ${task.status === "Completed" ? "completed" : ""}`}>
          <div>
            <div className="title">{task.title}</div>
            <div className="muted" style={{ marginTop: 6 }}>
              {task.description}
            </div>
            <div className="row" style={{ marginTop: 10 }}>
              <span className={`prio ${task.priority}`}>{task.priority}</span>
              <span className="chip">{task.status}</span>
              {task.dueDate && (
                <span className="chip">{new Date(task.dueDate).toLocaleString()}</span>
              )}
              {(task.tags || []).map((tag) => (
                <span className="chip" key={tag}>
                  {tag}
                </span>
              ))}
              {(task.sharedWith || []).length > 0 && <span className="chip">Shared</span>}
              {task.user?.email && <span className="chip">{task.user.email}</span>}
            </div>
          </div>
          <div className="row" style={{ flexDirection: "column", alignItems: "flex-end" }}>
            <button
              className="btn ghost"
              onClick={() =>
                patch(task._id, {
                  status: task.status === "Completed" ? "Pending" : "Completed",
                })
              }
            >
              {task.status === "Completed" ? "Reopen" : "Complete"}
            </button>
            <select
              className="field"
              style={{ width: 130 }}
              value={task.priority}
              onChange={(e) => patch(task._id, { priority: e.target.value })}
            >
              <option>High</option>
              <option>Medium</option>
              <option>Low</option>
            </select>
            <button className="btn subtle" onClick={() => setShareId(task._id)}>
              Share
            </button>
            <button className="btn subtle" onClick={() => api.delete(`/tasks/${task._id}`).then(onChange)}>
              Delete
            </button>
          </div>
        </article>
      ))}
      {shareId && (
        <div className="modal-bg" onClick={() => setShareId(null)}>
          <div className="card modal" onClick={(e) => e.stopPropagation()}>
            <h3>Share task</h3>
            {(tasks.find((x) => x._id === shareId)?.sharedWith || []).map((p) => (
              <div className="row" key={p._id || p} style={{ justifyContent: "space-between" }}>
                <span className="muted">{p.email || p}</span>
                <button
                  className="btn subtle"
                  type="button"
                  onClick={() =>
                    api.post(`/tasks/${shareId}/unshare`, { email: p.email }).then(() => onChange())
                  }
                >
                  Remove
                </button>
              </div>
            ))}
            <input
              className="field"
              placeholder="Collaborator email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <div className="row" style={{ marginTop: 12 }}>
              <button
                className="btn"
                onClick={() =>
                  api.post(`/tasks/${shareId}/share`, { email }).then(() => {
                    setShareId(null);
                    setEmail("");
                    onChange();
                  })
                }
              >
                Invite
              </button>
              <button className="btn ghost" onClick={() => setShareId(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}