import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [plan, setPlan] = useState(null);
  const [ranked, setRanked] = useState([]);

  useEffect(() => {
    api.get("/analytics").then((r) => setStats(r.data));
    api.post("/ai/plan").then((r) => setPlan(r.data.plan));
    api.post("/ai/prioritize").then((r) => setRanked(r.data.ranked || []));
  }, []);

  const t = stats?.totals || {};
  const weekly = stats?.weekly || [];
  const max = Math.max(1, ...weekly.map((d) => d.completed));

  return (
    <div>
      <div className="page-head">
        <div>
          <p className="muted">Good day, {user?.name}</p>
          <h1>Atelier</h1>
        </div>
        <div className="row">
          <Link className="btn ghost" to="/planner">
            Day plan
          </Link>
          <Link className="btn" to="/assistant">
            Ask Kairo
          </Link>
        </div>
      </div>
      <div className="grid four">
        {[
          ["Completed", t.completed],
          ["Pending", t.pending],
          ["Overdue", t.overdue],
          ["Rate", `${t.completionRate || 0}%`],
        ].map(([l, n]) => (
          <div className="card stat" key={l}>
            <div className="l">{l}</div>
            <div className="n">{n ?? "—"}</div>
          </div>
        ))}
      </div>
      <div className="grid two" style={{ marginTop: 16 }}>
        <div className="card">
          <h3>Weekly pulse</h3>
          {weekly.map((d) => (
            <div className="bar-row" key={d.date}>
              <span>{new Date(d.date).toLocaleDateString(undefined, { weekday: "short" })}</span>
              <div className="bar">
                <i style={{ width: `${(d.completed / max) * 100}%` }} />
              </div>
              <span>{d.completed}</span>
            </div>
          ))}
        </div>
        <div className="card">
          <h3>Day plan</h3>
          <p className="muted">{plan?.headline}</p>
          {(plan?.blocks || []).map((b) => (
            <div key={b.time} className="row" style={{ justifyContent: "space-between", margin: "10px 0" }}>
              <span>{b.time}</span>
              <span>{b.title}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="card" style={{ marginTop: 16 }}>
        <h3>Suggested order</h3>
        {ranked.slice(0, 5).map((t) => (
          <div key={t._id} className="task-card" style={{ marginBottom: 8 }}>
            <div>
              <span className={`prio ${t.recommended}`}>{t.recommended} priority</span>
              <div className="title">{t.title}</div>
            </div>
          </div>
        ))}
        {!ranked.length && <p className="muted">Create a task and Kairo will rank the queue.</p>}
      </div>
    </div>
  );
}