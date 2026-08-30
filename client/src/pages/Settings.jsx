import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import { t } from "../i18n";

export default function Settings() {
  const { user, setUser } = useAuth();
  const [name, setName] = useState(user?.name || "");
  const [language, setLanguage] = useState(user?.language || "en");
  const [theme, setTheme] = useState(user?.theme || "light");
  const [llmKey, setLlmKey] = useState("");
  const [llmProvider, setLlmProvider] = useState(user?.llmProvider || "nvidia");
  const [llmModel, setLlmModel] = useState(user?.llmModel || "meta/muse-glimmer-30b");
  const [llmBaseUrl, setLlmBaseUrl] = useState(user?.llmBaseUrl || "https://integrate.api.nvidia.com/v1");
  const [currentPassword, setCurrent] = useState("");
  const [newPassword, setNew] = useState("");
  const [msg, setMsg] = useState("");
  const [install, setInstall] = useState(null);
  const lang = user?.language || "en";

  useEffect(() => {
    const onPrompt = (e) => {
      e.preventDefault();
      setInstall(e);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  const feedUrl = useMemo(() => {
    if (!user?.calendarToken) return "";
    const origin = (import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace(/\/api$/, "");
    return `${origin}/api/calendar/feed/${user.calendarToken}`;
  }, [user]);

  const save = async (e) => {
    e.preventDefault();
    const { data } = await api.patch("/auth/profile", { name, language, theme });
    setUser(data.user);
    document.documentElement.dataset.theme = data.user.theme;
    setMsg("Studio updated");
  };

  const password = async (e) => {
    e.preventDefault();
    await api.post("/auth/password", { currentPassword, newPassword });
    setCurrent("");
    setNew("");
    setMsg("Password changed");
  };

  return (
    <div>
      <div className="page-head">
        <div>
          <p className="muted">{user?.email}</p>
          <h1>{t(lang, "settings")}</h1>
        </div>
      </div>
      <form className="card stack" onSubmit={save}>
        <input className="field" value={name} onChange={(e) => setName(e.target.value)} />
        <select className="field" value={language} onChange={(e) => setLanguage(e.target.value)}>
          <option value="en">English</option>
          <option value="hi">Hindi</option>
          <option value="es">Español</option>
        </select>
        <select className="field" value={theme} onChange={(e) => setTheme(e.target.value)}>
          <option value="light">Light — paper</option>
          <option value="dark">Dark — ink</option>
        </select>
        <button className="btn">Save profile</button>
      </form>
      <form
        className="card stack"
        style={{ marginTop: 16 }}
        onSubmit={async (e) => {
          e.preventDefault();
          const { data } = await api.post("/auth/llm-key", {
            apiKey: llmKey || undefined,
            provider: llmProvider,
            model: llmModel,
            baseUrl: llmBaseUrl,
          });
          setUser(data.user);
          setLlmKey("");
          setMsg("LLM key saved");
        }}
      >
        <h3>Language model</h3>
        <p className="muted">
          NVIDIA NIM for <strong>meta/muse-glimmer-30b</strong> via
          https://integrate.api.nvidia.com/v1/chat/completions (temperature 0.95, reasoning).
          Paste the NVIDIA API catalog key for that model (nvapi-…).
          {user?.hasLlmKey ? " A key is already on this studio." : " Heuristics run until a key is saved."}
        </p>
        <select
          className="field"
          value={llmProvider}
          onChange={(e) => {
            const p = e.target.value;
            setLlmProvider(p);
            if (p === "nvidia") {
              setLlmModel("meta/muse-glimmer-30b");
              setLlmBaseUrl("https://integrate.api.nvidia.com/v1");
            } else if (p === "groq") {
              setLlmModel("llama-3.3-70b-versatile");
              setLlmBaseUrl("https://api.groq.com/openai/v1");
            } else {
              setLlmModel("gpt-4o-mini");
              setLlmBaseUrl("https://api.openai.com/v1");
            }
          }}
        >
          <option value="nvidia">NVIDIA NIM</option>
          <option value="openai">OpenAI</option>
          <option value="groq">Groq</option>
        </select>
        <input
          className="field"
          value={llmModel}
          onChange={(e) => setLlmModel(e.target.value)}
          placeholder="meta/muse-glimmer-30b"
        />
        <input
          className="field"
          value={llmBaseUrl}
          onChange={(e) => setLlmBaseUrl(e.target.value)}
          placeholder="https://integrate.api.nvidia.com/v1"
        />
        <input
          className="field"
          type="password"
          autoComplete="off"
          placeholder={user?.hasLlmKey ? "••••••••  replace key" : "API key"}
          value={llmKey}
          onChange={(e) => setLlmKey(e.target.value)}
        />
        <div className="row">
          <button className="btn">Save key</button>
          <button
            type="button"
            className="btn ghost"
            onClick={() =>
              api.post("/auth/llm-key/test").then((r) => setMsg(r.data.message)).catch((e) => setMsg(e.response?.data?.message || "Key failed"))
            }
          >
            Test
          </button>
          {user?.hasLlmKey && (
            <button
              type="button"
              className="btn ghost"
              onClick={() =>
                api.delete("/auth/llm-key").then((r) => {
                  setUser(r.data.user);
                  setMsg("Key removed");
                })
              }
            >
              Remove
            </button>
          )}
        </div>
      </form>
      <form className="card stack" style={{ marginTop: 16 }} onSubmit={password}>
        <h3>Change password</h3>
        <input className="field" type="password" placeholder="Current" value={currentPassword} onChange={(e) => setCurrent(e.target.value)} />
        <input className="field" type="password" placeholder="New" value={newPassword} onChange={(e) => setNew(e.target.value)} />
        <button className="btn ghost">Update password</button>
      </form>
      <div className="card stack" style={{ marginTop: 16 }}>
        <h3>Calendar subscription</h3>
        <p className="muted">Paste this URL into Apple Calendar, Google Calendar, or Outlook as a subscription.</p>
        <input className="field" readOnly value={feedUrl} />
        <div className="row">
          <button
            type="button"
            className="btn ghost"
            onClick={() => navigator.clipboard.writeText(feedUrl)}
          >
            Copy URL
          </button>
          <button
            type="button"
            className="btn ghost"
            onClick={() =>
              api.post("/auth/calendar-token").then((r) => {
                setUser(r.data.user);
                setMsg("Feed token rotated");
              })
            }
          >
            Rotate token
          </button>
        </div>
      </div>
      <div className="card stack" style={{ marginTop: 16 }}>
        <h3>Progressive web app</h3>
        <p className="muted">Install Kairo on this device. Offline shell stays on paper while the network is away.</p>
        <button
          type="button"
          className="btn"
          disabled={!install}
          onClick={async () => {
            install.prompt();
            await install.userChoice;
            setInstall(null);
          }}
        >
          {t(lang, "install")}
        </button>
      </div>
      {msg && <p className="muted">{msg}</p>}
    </div>
  );
}