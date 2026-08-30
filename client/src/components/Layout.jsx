import React from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { t } from "../i18n";
import VoiceBar from "./VoiceBar";
import api from "../services/api";

const links = [
  ["/", "dashboard"],
  ["/planner", "planner"],
  ["/tasks", "tasks"],
  ["/notes", "notes"],
  ["/calendar", "calendar"],
  ["/reminders", "reminders"],
  ["/assistant", "assistant"],
  ["/search", "search"],
  ["/analytics", "analytics"],
  ["/documents", "documents"],
  ["/settings", "settings"],
];

export default function Layout() {
  const { user, setUser, logout } = useAuth();
  const nav = useNavigate();
  const lang = user?.language || "en";

  const flipTheme = async () => {
    const theme = user?.theme === "dark" ? "light" : "dark";
    const { data } = await api.patch("/auth/profile", { theme });
    setUser(data.user);
    document.documentElement.dataset.theme = data.user.theme;
  };

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="mark" />
          <span>Kairo</span>
        </div>
        <nav className="nav">
          {links.map(([to, key]) => (
            <NavLink key={to} to={to} end={to === "/"}>
              {t(lang, key)}
            </NavLink>
          ))}
        </nav>
        <div className="spacer" />
        <VoiceBar />
        <button className="btn ghost leave" type="button" onClick={flipTheme}>
          {user?.theme === "dark" ? t(lang, "light") : t(lang, "dark")}
        </button>
        <button
          className="btn ghost leave"
          onClick={() => {
            logout();
            nav("/login");
          }}
        >
          {t(lang, "logout")}
        </button>
      </aside>
      <div className="main">
        <Outlet />
      </div>
    </div>
  );
}