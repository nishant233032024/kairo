from datetime import datetime, timedelta
from typing import Any


def prioritize(tasks: list[dict[str, Any]]) -> list[dict[str, Any]]:
    now = datetime.now().timestamp() * 1000

    def score(t: dict) -> float:
        due = t.get("dueDate")
        try:
            due_ms = datetime.fromisoformat(str(due).replace("Z", "")).timestamp() * 1000 if due else now + 14 * 86400000
        except Exception:
            due_ms = now + 14 * 86400000
        urgency = max(0, 10 - (due_ms - now) / 86400000)
        p = {"High": 3, "Low": 1}.get(t.get("priority"), 2)
        effort = float(t.get("estimatedEffort") or 1)
        return urgency * 1.4 + p * 3 + min(effort, 5) * 0.4

    ranked = []
    for t in tasks:
        s = score(t)
        rec = "High" if s >= 12 or t.get("priority") == "High" else "Low" if t.get("priority") == "Low" else "Medium"
        ranked.append({**t, "score": s, "recommended": rec})
    ranked.sort(key=lambda t: t["score"], reverse=True)
    return ranked


def plan_day(context: dict[str, Any]) -> dict[str, Any]:
    from assistant import _llm

    llm = _llm(
        "Create a day plan JSON with headline, notes, and blocks: [{time, title, priority}].",
        str(context)[:6000],
    )
    if llm:
        try:
            import json

            start, end = llm.find("{"), llm.rfind("}")
            if start >= 0:
                return json.loads(llm[start : end + 1])
        except Exception:
            pass

    now = datetime.now()
    pending = [t for t in context.get("tasks") or [] if t.get("status") != "Completed"]
    soon = []
    for t in pending:
        due = t.get("dueDate")
        if not due and t.get("priority") == "High":
            soon.append(t)
            continue
        try:
            d = datetime.fromisoformat(str(due).replace("Z", "+00:00").replace("+00:00", ""))
            if d <= now + timedelta(days=2):
                soon.append(t)
        except Exception:
            continue
    blocks = []
    hour = 9
    for t in soon[:6]:
        blocks.append(
            {
                "time": f"{hour:02d}:00",
                "title": t.get("title"),
                "priority": t.get("priority"),
            }
        )
        hour += 2
    if not blocks:
        blocks = [
            {"time": "09:00", "title": "Review inbox and set three outcomes", "priority": "High"},
            {"time": "11:00", "title": "Deep work on the most overdue item", "priority": "High"},
            {"time": "15:00", "title": "Notes, tags, and tomorrow's outline", "priority": "Medium"},
        ]
    return {
        "headline": "A focused day, sequenced by deadline and weight.",
        "blocks": blocks,
        "notes": "Protect the first deep-work block. Leave 18:00 open for review.",
    }