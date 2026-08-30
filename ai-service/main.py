from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Any

from assistant import extract_task, chat as assistant_chat
from summarizer import summarize
from task_planner import prioritize, plan_day

app = FastAPI(title="Kairo AI", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class TextBody(BaseModel):
    text: str = ""


class TasksBody(BaseModel):
    tasks: list[dict[str, Any]] = []


class ChatBody(BaseModel):
    message: str = ""
    context: dict[str, Any] = {}
    history: list[dict[str, Any]] = []


class SearchBody(BaseModel):
    q: str = ""
    tasks: list[dict[str, Any]] = []
    notes: list[dict[str, Any]] = []
    reminders: list[dict[str, Any]] = []
    documents: list[dict[str, Any]] = []


@app.get("/health")
def health():
    return {"ok": True, "name": "kairo-ai"}


@app.post("/extract-task")
def extract(body: TextBody):
    return extract_task(body.text)


@app.post("/prioritize")
def prio(body: TasksBody):
    return {"ranked": prioritize(body.tasks)}


@app.post("/summarize")
def sum_route(body: TextBody):
    return {"summary": summarize(body.text)}


@app.post("/plan-day")
def plan(body: dict[str, Any]):
    return {"plan": plan_day(body)}


@app.post("/chat")
def chat_route(body: ChatBody):
    reply = assistant_chat(body.message, body.context, body.history)
    return {"reply": reply}


def _tokens(s: str) -> list[str]:
    return [w for w in "".join(c.lower() if c.isalnum() else " " for c in s or "").split() if len(w) > 2]


def _score(q: list[str], blob: str) -> float:
    tokens = _tokens(blob)
    if not tokens:
        return 0
    hits = 0
    for w in q:
        if w in tokens:
            hits += 2
        elif any(w in t or t in w for t in tokens):
            hits += 1
    return hits / (len(tokens) ** 0.5)


@app.post("/search")
def search(body: SearchBody):
    q = _tokens(body.q)
    results = []
    for t in body.tasks:
        s = _score(q, f"{t.get('title')} {t.get('description')} {' '.join(t.get('tags') or [])}")
        if s:
            results.append({"type": "task", "score": s, "item": t})
    for n in body.notes:
        s = _score(q, f"{n.get('title')} {n.get('content')} {' '.join(n.get('tags') or [])}")
        if s:
            results.append({"type": "note", "score": s, "item": n})
    for r in body.reminders:
        s = _score(q, r.get("title") or "")
        if s:
            results.append({"type": "reminder", "score": s, "item": r})
    for d in body.documents:
        s = _score(q, f"{d.get('originalName')} {d.get('summary')} {d.get('excerpt')}")
        if s:
            results.append({"type": "document", "score": s, "item": d})
    results.sort(key=lambda x: x["score"], reverse=True)
    return {"results": results[:20]}