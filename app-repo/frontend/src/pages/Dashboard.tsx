import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { api } from "../lib/api";
import { errorMessageFromAxios } from "../lib/error";
import type { Operation, TaskListItem } from "../types";

export function DashboardPage() {
  const [tasks, setTasks] = useState<TaskListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [inputText, setInputText] = useState("");
  const [operation, setOperation] = useState<Operation>("uppercase");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const opLabel = useMemo(
    () => ({
      uppercase: "Uppercase",
      lowercase: "Lowercase",
      reverse: "Reverse",
      word_count: "Word count",
    }),
    []
  );
  const statusCounts = useMemo(
    () =>
      tasks.reduce(
        (acc, task) => {
          acc[task.status] += 1;
          return acc;
        },
        { pending: 0, running: 0, success: 0, failed: 0 }
      ),
    [tasks]
  );

  const refresh = async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/tasks");
      setTasks(res.data.tasks ?? []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const t0 = window.setTimeout(() => {
      void refresh();
    }, 0);
    const t = window.setInterval(refresh, 3000);
    return () => {
      window.clearTimeout(t0);
      window.clearInterval(t);
    };
  }, []);

  const createTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.post("/api/tasks", { title, inputText, operation });
      setTitle("");
      setInputText("");
      setOperation("uppercase");
      await refresh();
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) setError(errorMessageFromAxios(err));
      else if (err instanceof Error) setError(err.message);
      else setError("Failed to create task");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid">
      <div className="card">
        <div style={{ marginBottom: "24px" }}>
          <h2 style={{ marginBottom: "4px" }}>Create New Task</h2>
          <p className="muted">Define your text processing task</p>
        </div>
        <form onSubmit={createTask} className="form">
          <label>
            <span style={{ display: "flex", justifyContent: "space-between" }}>
              Task Title
              <span className="muted" style={{ fontSize: "12px" }}>{title.length} / 50</span>
            </span>
            <input 
              value={title} 
              onChange={(e) => setTitle(e.target.value.slice(0, 50))} 
              required 
              placeholder="e.g., Convert Email to Uppercase"
            />
          </label>
          <label>
            <span style={{ display: "flex", justifyContent: "space-between" }}>
              Input Text
              <span className="muted" style={{ fontSize: "12px" }}>{inputText.length} characters</span>
            </span>
            <textarea 
              value={inputText} 
              onChange={(e) => setInputText(e.target.value)} 
              required 
              rows={6}
              placeholder="Paste or type the text you want to process..."
              style={{ fontFamily: "'Fira Code', monospace", fontSize: "13px" }}
            />
          </label>
          <label>
            <span style={{ marginBottom: "8px", display: "block" }}>Select Operation</span>
            <select 
              value={operation} 
              onChange={(e) => setOperation(e.target.value as Operation)}
              style={{ cursor: "pointer" }}
            >
              <option value="uppercase">🔤 {opLabel.uppercase}</option>
              <option value="lowercase">🔤 {opLabel.lowercase}</option>
              <option value="reverse">↔️ {opLabel.reverse}</option>
              <option value="word_count">📊 {opLabel.word_count}</option>
            </select>
          </label>
          {error ? <p className="error" style={{ margin: 0 }}>{error}</p> : null}
          <button disabled={busy} type="submit" style={{ marginTop: "12px" }}>
            {busy ? "Processing..." : "✨ Run Task"}
          </button>
        </form>
      </div>

      <div className="card">
        <div className="row" style={{ marginBottom: "20px" }}>
          <div>
            <h2 style={{ marginBottom: "4px" }}>Tasks Overview</h2>
            <p className="muted">Monitor all your processing tasks</p>
          </div>
          <button className="secondary" onClick={refresh} disabled={loading} style={{ whiteSpace: "nowrap" }}>
            {loading ? "Refreshing..." : "🔄 Refresh"}
          </button>
        </div>
        <div className="statsRow" style={{ marginBottom: "20px" }}>
          <span className="badge pending">⏳ Pending: {statusCounts.pending}</span>
          <span className="badge running">▶️ Running: {statusCounts.running}</span>
          <span className="badge success">✅ Success: {statusCounts.success}</span>
          <span className="badge failed">❌ Failed: {statusCounts.failed}</span>
        </div>
        <div className="table">
          <div className="thead">
            <div>Title</div>
            <div>Operation</div>
            <div>Status</div>
            <div>Action</div>
          </div>
          {tasks.map((t) => (
            <div className="trow" key={t.id}>
              <div className="mono" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.title}</div>
              <div style={{ fontSize: "13px" }}>{opLabel[t.operation]}</div>
              <div>
                <span className={`badge ${t.status}`}>{t.status}</span>
              </div>
              <div>
                <Link to={`/tasks/${t.id}`} style={{ display: "inline-block" }}>View Details →</Link>
              </div>
            </div>
          ))}
          {!tasks.length ? (
            <div style={{ padding: "40px 20px", textAlign: "center" }}>
              <p className="muted" style={{ marginBottom: "8px", fontSize: "14px" }}>No tasks yet</p>
              <p className="muted" style={{ fontSize: "12px" }}>Create your first task using the form on the left to get started</p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
