import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import api from "../services/api";

export default function SearchPage() {
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState(params.get("q") || "");
  const [results, setResults] = useState([]);

  const go = async (query) => {
    const term = query ?? q;
    const { data } = await api.get("/ai/search", { params: { q: term } });
    setResults(data.results || []);
  };

  const qParam = params.get("q") || "";

  useEffect(() => {
    if (!qParam) return;
    setQ(qParam);
    go(qParam);
  }, [qParam]);

  return (
    <div>
      <div className="page-head">
        <div>
          <p className="muted">Search by meaning, not only keywords</p>
          <h1>Search</h1>
        </div>
      </div>
      <form
        className="card row"
        onSubmit={(e) => {
          e.preventDefault();
          setParams({ q });
          go(q);
        }}
      >
        <input
          className="field"
          placeholder="things related to my upcoming interview"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button className="btn">Search</button>
      </form>
      <div style={{ marginTop: 16 }}>
        {results.map((r, i) => (
          <div className="task-card" key={i}>
            <div>
              <span className="chip">{r.type}</span>
              <div style={{ marginTop: 8 }}>{r.item?.title || r.item?.originalName}</div>
              <p className="muted">
                {(r.item?.description || r.item?.content || r.item?.summary || "").slice(0, 180)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}