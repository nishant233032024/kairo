import React, { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { login, user } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");

  if (user) return <Navigate to="/" replace />;

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    try {
      await login(email, password);
    } catch (e2) {
      setErr(e2.response?.data?.message || "Could not enter");
    }
  };

  return (
    <div className="auth-wrap">
      <div className="auth-hero">
        <div className="brand">
          <div className="mark" />
          <span>Kairo</span>
        </div>
        <div>
          <p className="muted" style={{ letterSpacing: "0.2em", textTransform: "uppercase" }}>
            Personal productivity
          </p>
          <h1>The opportune moment.</h1>
        </div>
        <p className="muted">Ink, paper, and a quiet operator for the day ahead.</p>
      </div>
      <div className="auth-form">
        <form className="stack" onSubmit={submit}>
          <h2>Enter the studio</h2>
          <input className="field" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input
            className="field"
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {err && <div className="muted">{err}</div>}
          <button className="btn">Enter</button>
          <button
            type="button"
            className="btn ghost"
            onClick={async () => {
              setErr("");
              try {
                await login("demo@kairo.app", "kairo123");
              } catch (e2) {
                setErr(e2.response?.data?.message || "Guest studio is not seeded yet");
              }
            }}
          >
            Use studio guest
          </button>
          <p className="muted">Guest · demo@kairo.app · kairo123</p>
          <Link to="/register" className="muted">
            Need an account? Create one
          </Link>
        </form>
      </div>
    </div>
  );
}