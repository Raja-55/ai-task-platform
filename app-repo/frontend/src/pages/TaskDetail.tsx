import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import axios from "axios";
import { api } from "../lib/api";
import { errorMessageFromAxios } from "../lib/error";
import type { TaskDetail } from "../types";

export function TaskDetailPage() {
  const { id } = useParams();
  const [task, setTask] = useState<TaskDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    const tick = async () => {
      try {
        const res = await api.get(`/api/tasks/${id}`);
        if (alive) setTask(res.data);
      } catch (err: unknown) {
        if (!alive) return;
        if (axios.isAxiosError(err)) setError(errorMessageFromAxios(err));
        else if (err instanceof Error) setError(err.message);
        else setError("Failed to load task");
      }
    };
    tick();
    const t = window.setInterval(tick, 2000);
    return () => {
      alive = false;
      window.clearInterval(t);
    };
  }, [id]);

  if (error) return <div className="card" style={{ maxWidth: "600px", margin: "0 auto" }}><p className="error" style={{ margin: 0 }}>{error}</p></div>;
  if (!task) return <div className="card" style={{ maxWidth: "600px", margin: "0 auto" }}><p className="muted" style={{ margin: 0 }}>Loading task details...</p></div>;

  return (
    <div style={{ maxWidth: "900px", margin: "0 auto" }}>
      <div className="card">
        <div className="row" style={{ marginBottom: "24px" }}>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: "28px", marginBottom: "8px" }}>{task.title}</h1>
            <p className="muted" style={{ marginBottom: "12px" }}>
              Task ID: <span className="mono">{task.id}</span>
            </p>
            <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
              <span className={`badge ${task.status}`}>{task.status}</span>
              <span className="muted" style={{ fontSize: "12px" }}>
                {new Date(task.createdAt || "").toLocaleString()}
              </span>
            </div>
          </div>
          <Link to="/" className="secondaryLink" style={{ height: "fit-content" }}>
            Back to Tasks
          </Link>
        </div>

        <div style={{ borderTop: "1px solid rgba(71, 85, 127, 0.2)", paddingTop: "24px" }}>
          <div style={{ marginBottom: "24px" }}>
            <h3 style={{ fontSize: "16px", marginBottom: "12px", color: "#e2e8f0" }}>Result Output</h3>
            <div className="pre">
              {typeof task.result === "string" ? (
                task.result
              ) : (
                JSON.stringify(task.result, null, 2)
              )}
            </div>
          </div>

          {task.logs && task.logs.length > 0 && (
            <div>
              <h3 style={{ fontSize: "16px", marginBottom: "12px", color: "#e2e8f0" }}>Processing Logs</h3>
              <ul className="logs">
                {task.logs.map((l, idx) => (
                  <li key={idx} className={l.level}>
                    <span style={{ display: "flex", justifyContent: "space-between", gap: "12px" }}>
                      <span className="mono" style={{ color: "#94a3b8", fontSize: "11px" }}>
                        {new Date(l.ts).toLocaleTimeString()}
                      </span>
                      <span>{l.message}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
