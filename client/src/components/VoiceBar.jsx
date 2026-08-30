import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { runVoiceCommand } from "../services/voiceCommands";
import api from "../services/api";
import { speechLang, t } from "../i18n";

export default function VoiceBar() {
  const { user, setUser, setToast } = useAuth();
  const nav = useNavigate();
  const [listening, setListening] = useState(false);
  const [heard, setHeard] = useState("");
  const lang = user?.language || "en";

  const toggleTheme = async (theme) => {
    const { data } = await api.patch("/auth/profile", { theme });
    setUser(data.user);
    document.documentElement.dataset.theme = data.user.theme;
  };

  const listen = () => {
    const Rec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Rec) {
      setToast("Voice is not available in this browser.");
      return;
    }
    const rec = new Rec();
    rec.lang = speechLang(lang);
    rec.interimResults = false;
    rec.onstart = () => setListening(true);
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    rec.onresult = async (e) => {
      const text = e.results[0][0].transcript;
      setHeard(text);
      const reply = await runVoiceCommand(text, { navigate: nav, setToast, toggleTheme });
      setToast(reply);
      setTimeout(() => setToast(null), 5000);
    };
    rec.start();
  };

  return (
    <div className="voice-bar">
      <button type="button" className={`btn ghost ${listening ? "listening" : ""}`} onClick={listen}>
        {listening ? t(lang, "listening") : t(lang, "voice")}
      </button>
      {heard && <span className="muted">{heard}</span>}
    </div>
  );
}