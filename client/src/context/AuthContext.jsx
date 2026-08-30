import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import api from "../services/api";
import { connectSocket, disconnectSocket } from "../services/socket";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  const [toast, setToast] = useState(null);

  const attachSocket = (token) => {
    const s = connectSocket(token);
    s.on("reminder:due", (payload) => {
      setToast(`Reminder · ${payload.title}`);
      setTimeout(() => setToast(null), 6000);
    });
    s.on("task:shared", (payload) => {
      setToast(`Shared with you · ${payload.title} · ${payload.from}`);
      setTimeout(() => setToast(null), 6000);
    });
    return s;
  };

  useEffect(() => {
    const token = localStorage.getItem("kairo_token");
    if (!token) {
      setReady(true);
      return;
    }
    api
      .get("/auth/me")
      .then((r) => {
        setUser(r.data.user);
        attachSocket(token);
      })
      .catch(() => localStorage.removeItem("kairo_token"))
      .finally(() => setReady(true));
  }, []);

  const login = async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password });
    localStorage.setItem("kairo_token", data.token);
    setUser(data.user);
    attachSocket(data.token);
    document.documentElement.dataset.theme = data.user.theme || "light";
  };

  const register = async (name, email, password) => {
    const { data } = await api.post("/auth/register", { name, email, password });
    localStorage.setItem("kairo_token", data.token);
    setUser(data.user);
    attachSocket(data.token);
  };

  const logout = () => {
    localStorage.removeItem("kairo_token");
    disconnectSocket();
    setUser(null);
  };

  const value = useMemo(
    () => ({ user, setUser, login, register, logout, ready, toast, setToast }),
    [user, ready, toast]
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}