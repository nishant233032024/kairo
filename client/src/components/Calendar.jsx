import React from "react";

function startOfMonth(d) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export default function Calendar({ date, events, tasks, onSelect }) {
  const start = startOfMonth(date);
  const firstDow = start.getDay();
  const days = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= days; d++) cells.push(new Date(date.getFullYear(), date.getMonth(), d));

  const itemsFor = (day) => {
    if (!day) return [];
    const key = day.toDateString();
    const ev = (events || []).filter((e) => new Date(e.start).toDateString() === key);
    const ts = (tasks || []).filter((t) => t.dueDate && new Date(t.dueDate).toDateString() === key);
    return [
      ...ev.map((e) => ({ label: e.title, type: e.type })),
      ...ts.map((t) => ({ label: t.title, type: "deadline" })),
    ];
  };

  return (
    <div>
      <div className="cal" style={{ marginBottom: 8 }}>
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d} className="muted" style={{ padding: "0 8px" }}>
            {d}
          </div>
        ))}
      </div>
      <div className="cal">
        {cells.map((day, i) => (
          <div
            key={i}
            className={`cell ${day ? "" : "muted"}`}
            onClick={() => day && onSelect?.(day)}
          >
            {day && <strong>{day.getDate()}</strong>}
            {itemsFor(day)
              .slice(0, 3)
              .map((it, n) => (
                <div className="dot-item" key={n}>
                  {it.label}
                </div>
              ))}
          </div>
        ))}
      </div>
    </div>
  );
}