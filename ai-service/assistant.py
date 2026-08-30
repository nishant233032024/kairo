import os
import re
from datetime import datetime, timedelta
from typing import Any

from dotenv import load_dotenv

load_dotenv()

WEEKDAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]


def _next_weekday(now: datetime, name: str) -> datetime:
    target = WEEKDAYS.index(name)
    delta = (target + 7 - now.weekday() - 1) % 7
    # Python Monday=0; our list Sunday=0
    py_target = (WEEKDAYS.index(name) - 1) % 7
    delta = (py_target - now.weekday()) % 7
    if delta == 0:
        delta = 7
    return now + timedelta(days=delta)


def parse_when(text: str, now: datetime | None = None) -> datetime | None:
    now = now or datetime.now()
    t = text.lower()
    date = None
    if re.search(r"\btomorrow\b", t):
        date = now + timedelta(days=1)
    if re.search(r"\btoday\b", t):
        date = now
    if re.search(r"\bnext week\b", t):
        date = now + timedelta(days=7)
    m = re.search(
        r"\bnext\s+(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b", t
    )
    if m:
        date = _next_weekday(now, m.group(1))
    time = re.search(r"\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b", t)
    if date and time:
        h = int(time.group(1))
        minute = int(time.group(2) or 0)
        ap = time.group(3)
        if ap == "pm" and h < 12:
            h += 12
        if ap == "am" and h == 12:
            h = 0
        date = date.replace(hour=h, minute=minute, second=0, microsecond=0)
    elif date:
        date = date.replace(hour=9, minute=0, second=0, microsecond=0)
    return date


def infer_priority(text: str) -> str:
    t = text.lower()
    if re.search(r"urgent|asap|interview|deadline|critical|important", t):
        return "High"
    if re.search(r"later|someday|optional|organize|cleanup", t):
        return "Low"
    return "Medium"


def extract_title(text: str) -> str:
    t = re.sub(r"^remind me (to|about)\s+", "", text.strip(), flags=re.I)
    t = re.sub(r"^please\s+", "", t, flags=re.I)
    t = t.strip()
    return t[:1].upper() + t[1:] if t else "New task"


def extract_task(text: str) -> dict[str, Any]:
    llm = _llm_json(
        "Extract a task as JSON with keys title, description, priority (High|Medium|Low), "
        "dueDate (ISO or null), remindAt (ISO or null), tags (array).",
        text,
    )
    if llm:
        return llm
    due = parse_when(text)
    iso = due.isoformat() if due else None
    return {
        "title": extract_title(text),
        "description": text,
        "priority": infer_priority(text),
        "dueDate": iso,
        "remindAt": iso if "remind" in text.lower() else None,
        "tags": ["interview"] if "interview" in text.lower() else [],
    }


def _llm_json(system: str, user: str) -> dict | None:
    raw = _llm(system + " Return only JSON.", user)
    if not raw:
        return None
    try:
        import json

        start = raw.find("{")
        end = raw.rfind("}")
        if start >= 0 and end > start:
            return json.loads(raw[start : end + 1])
    except Exception:
        return None
    return None


def _llm(system: str, user: str) -> str | None:
    key = os.getenv("OPENAI_API_KEY") or os.getenv("GROQ_API_KEY")
    if not key:
        return None
    try:
        from openai import OpenAI

        base = None
        model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
        if os.getenv("GROQ_API_KEY") and not os.getenv("OPENAI_API_KEY"):
            base = "https://api.groq.com/openai/v1"
            model = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
            key = os.getenv("GROQ_API_KEY")
        client = OpenAI(api_key=key, base_url=base) if base else OpenAI(api_key=key)
        resp = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            temperature=0.3,
        )
        return resp.choices[0].message.content
    except Exception:
        return None


def chat(message: str, context: dict, history: list) -> str:
    compact = {
        "tasks": [
            {
                "title": t.get("title"),
                "priority": t.get("priority"),
                "status": t.get("status"),
                "dueDate": t.get("dueDate"),
            }
            for t in (context.get("tasks") or [])[:40]
        ],
        "notes": [
            {"title": n.get("title"), "content": (n.get("content") or "")[:400]}
            for n in (context.get("notes") or [])[:20]
        ],
        "reminders": [
            {"title": r.get("title"), "remindAt": r.get("remindAt")}
            for r in (context.get("reminders") or [])[:15]
        ],
    }
    system = (
        "You are Kairo, a calm personal productivity operator. "
        "Use the user's tasks, notes, and reminders. Be concise and specific. "
        "Never invent work they did not store."
    )
    hist = "\n".join(
        f"{h.get('role')}: {h.get('content')}" for h in (history or [])[-8:]
    )
    reply = _llm(system, f"CONTEXT:{compact}\n\nHISTORY:\n{hist}\n\nUSER:{message}")
    return reply or ""