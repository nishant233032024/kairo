import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import { t } from "../i18n";

export default function Planner() {
  const { user, setToast } = useAuth();
  const lang = user?.language || "en";
  const [plan, setPlan] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = () => api.post("/ai/plan").then((r) => setPlan(r.data.plan));
  useEffect(() => {
    load();
  }, []);

  const apply = async () => {
    setBusy(true);
    try {
      const { data } = await api.post("/ai/plan/apply", { plan });
      setToast(`Placed ${data.events?.length || 0} blocks on the calendar.`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="page-head">
        <div>
          <p className="muted">Sequenced by deadline and weight</p>
          <h1>{t(lang, "planner")}</h1>
        </div>
        <div className="row">
          <button className="btn ghost" onClick={load}>
            {t(lang, "regenerate")}
          </button>
          <button className="btn" disabled={busy} onClick={apply}>
            {t(lang, "applyPlan")}
          </button>
        </div>
      </div>
      <div className="card">
        <p className="muted">{plan?.headline}</p>
        {(plan?.blocks || []).map((b) => (
          <div key={b.time + b.title} className="task-card">
            <div>
              <span className={`prio ${b.priority || "Medium"}`}>{b.time}</span>
              <div className="title">{b.title}</div>
            </div>
            <span className="chip">{b.priority}</span>
          </div>
        ))}
        <p className="muted">{plan?.notes}</p>
        <p className="muted">
          Applying writes calendar events and 10-minute reminders. Review them on{" "}
          <Link to="/calendar">Calendar</Link>.
        </p>
      </div>
    </div>
  );
}