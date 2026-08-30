import React from "react";
import ChatAssistant from "../components/ChatAssistant";

export default function Assistant() {
  return (
    <div>
      <div className="page-head">
        <div>
          <p className="muted">A quiet operator with your full context</p>
          <h1>Kairo</h1>
        </div>
      </div>
      <div className="card">
        <ChatAssistant />
      </div>
    </div>
  );
}