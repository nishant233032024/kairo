import React, { useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { speechLang } from "../i18n";
import api from "../services/api";

export default function ChatAssistant() {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const log = useRef(null);

  useEffect(() => {
    api.get("/ai/history").then((r) => setMessages(r.data.messages || []));
  }, []);

  useEffect(() => {
    log.current?.scrollTo(0, log.current.scrollHeight);
  }, [messages]);

  const send = async (value) => {
    const message = (value ?? text).trim();
    if (!message) return;
    setText("");
    setMessages((m) => [...m, { role: "user", content: message }]);
    setBusy(true);
    try {
      const { data } = await api.post("/ai/chat", { message });
      setMessages((m) => [...m, { role: "assistant", content: data.reply }]);
    } catch {
      setMessages((m) => [...m, { role: "assistant", content: "Kairo is quiet for a moment. Try again." }]);
    } finally {
      setBusy(false);
    }
  };

  const listen = () => {
    const Rec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Rec) {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: "Voice is not available in this browser." },
      ]);
      return;
    }
    const rec = new Rec();
    rec.lang = speechLang(user?.language || "en");
    rec.onresult = (e) => send(e.results[0][0].transcript);
    rec.start();
  };

  return (
    <div className="chat">
      <div className="chat-log" ref={log}>
        {messages.length === 0 && (
          <div className="muted">Ask what to finish today, how to prioritize, or to plan the day.</div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`bubble ${m.role}`}>
            {m.content}
          </div>
        ))}
        {busy && <div className="muted">Listening to your workspace…</div>}
      </div>
      <div className="row" style={{ marginTop: 12 }}>
        <input
          className="field"
          value={text}
          placeholder="Speak in plain language…"
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
        />
        <button className="btn" onClick={() => send()}>
          Send
        </button>
        <button className="btn ghost" onClick={listen} type="button">
          Voice
        </button>
      </div>
    </div>
  );
}