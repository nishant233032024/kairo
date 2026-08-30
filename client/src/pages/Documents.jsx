import React, { useEffect, useState } from "react";
import api from "../services/api";

export default function Documents() {
  const [docs, setDocs] = useState([]);
  const [drag, setDrag] = useState(false);
  const load = () => api.get("/documents").then((r) => setDocs(r.data.documents));
  useEffect(() => {
    load();
  }, []);

  const send = async (file) => {
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    await api.post("/documents", fd, { headers: { "Content-Type": "multipart/form-data" } });
    load();
  };

  return (
    <div>
      <div className="page-head">
        <div>
          <p className="muted">Upload, then let Kairo read</p>
          <h1>Documents</h1>
        </div>
      </div>
      <div
        className={`card dropzone ${drag ? "on" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          send(e.dataTransfer.files[0]);
        }}
      >
        <p>Drop a file here, or choose one. Text, markdown, CSV, JSON, and ICS are summarized.</p>
        <input type="file" onChange={(e) => send(e.target.files?.[0])} />
      </div>
      {docs.map((d) => (
        <article className="card" key={d._id} style={{ marginBottom: 12, marginTop: 12 }}>
          <div className="row" style={{ justifyContent: "space-between" }}>
            <strong>{d.originalName}</strong>
            <div className="row">
              <button className="btn subtle" onClick={() => api.post(`/documents/${d._id}/summarize`).then(load)}>
                Summarize
              </button>
              <button className="btn subtle" onClick={() => api.delete(`/documents/${d._id}`).then(load)}>
                Delete
              </button>
            </div>
          </div>
          <pre className="muted" style={{ whiteSpace: "pre-wrap" }}>
            {d.summary || "No extractable text yet — tap Summarize if the file is readable."}
          </pre>
        </article>
      ))}
    </div>
  );
}