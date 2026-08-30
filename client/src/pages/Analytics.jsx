import React, { useEffect, useState } from "react";
import api from "../services/api";

export default function Analytics() {
  const [data, setData] = useState(null);
  useEffect(() => {
    api.get("/analytics").then((r) => setData(r.data));
  }, []);
  if (!data) return <p className="muted">Gathering pulse…</p>;
  const { totals, weekly, monthly, categories } = data;
  const maxW = Math.max(1, ...weekly.map((d) => d.completed));
  const maxM = Math.max(1, ...monthly.map((d) => d.completed));
  const cats = Object.entries(categories || {});
  const maxC = Math.max(1, ...cats.map(([, n]) => n));

  return (
    <div>
      <div className="page-head">
        <div>
          <p className="muted">Completion, load, and drift</p>
          <h1>Pulse</h1>
        </div>
      </div>
      <div className="grid four">
        <div className="card stat">
          <div className="l">Completed</div>
          <div className="n">{totals.completed}</div>
        </div>
        <div className="card stat">
          <div className="l">Pending</div>
          <div className="n">{totals.pending}</div>
        </div>
        <div className="card stat">
          <div className="l">Overdue</div>
          <div className="n">{totals.overdue}</div>
        </div>
        <div className="card stat">
          <div className="l">Time logged</div>
          <div className="n">{totals.timeSpent}h</div>
        </div>
      </div>
      <div className="grid two" style={{ marginTop: 16 }}>
        <div className="card">
          <h3>Tasks completed / day</h3>
          {weekly.map((d) => (
            <div className="bar-row" key={d.date}>
              <span>{new Date(d.date).toLocaleDateString(undefined, { weekday: "short" })}</span>
              <div className="bar">
                <i style={{ width: `${(d.completed / maxW) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
        <div className="card">
          <h3>Monthly productivity</h3>
          {monthly.map((d) => (
            <div className="bar-row" key={d.month}>
              <span>{d.month}</span>
              <div className="bar">
                <i style={{ width: `${(d.completed / maxM) * 100}%` }} />
              </div>
              <span>{d.completed}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="card" style={{ marginTop: 16 }}>
        <h3>Category-wise workload</h3>
        {cats.map(([k, n]) => (
          <div className="bar-row" key={k}>
            <span style={{ width: 90 }}>{k}</span>
            <div className="bar">
              <i style={{ width: `${(n / maxC) * 100}%` }} />
            </div>
            <span>{n}</span>
          </div>
        ))}
      </div>
    </div>
  );
}