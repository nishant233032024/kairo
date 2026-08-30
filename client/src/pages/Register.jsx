import React, { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Register() {
  const { register, user } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  if (user) return <Navigate to="/" replace />;

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    try {
      await register(name, email, password);
    } catch (e2) {
      setErr(e2.response?.data?.message || "Could not create account");
    }
  };

  return (
    <div className="auth-wrap">
      <div className="auth-hero">
        <div className="brand">
          <div className="mark" />
          <span>Kairo</span>
        </div>
        <h1>Begin in stillness.</h1>
        <p className="muted">A workspace that listens, then arranges the day.</p>
      </div>
      <div className="auth-form">
        <form className="stack" onSubmit={submit}>
          <h2>Create account</h2>
          <input className="field" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
          <input className="field" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input
            className="field"
            type="password"
            placeholder="Password (6+ characters)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {err && <div className="muted">{err}</div>}
          <button className="btn">Create account</button>
          <Link to="/login" className="muted">
            Already here? Enter
          </Link>
        </form>
      </div>
    </div>
  );
}