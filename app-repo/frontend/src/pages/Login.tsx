import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { api, setAuthToken } from "../lib/api";
import { setToken } from "../lib/auth";
import { errorMessageFromAxios } from "../lib/error";

export function LoginPage() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await api.post("/api/auth/login", { email, password });
      const token = String(res.data.token ?? "");
      if (!token) throw new Error("Missing token");
      setToken(token);
      setAuthToken(token);
      nav("/");
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) setError(errorMessageFromAxios(err));
      else if (err instanceof Error) setError(err.message);
      else setError("Login failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", padding: "16px" }}>
      <div className="card" style={{ maxWidth: "420px", width: "100%" }}>
        <div style={{ marginBottom: "32px" }}>
          <h1 style={{ fontSize: "32px", marginBottom: "8px", textAlign: "center" }}>Welcome Back</h1>
          <p className="muted" style={{ textAlign: "center" }}>Sign in to your account to continue</p>
        </div>
        <form onSubmit={onSubmit} className="form">
          <label>
            <span style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
              Email Address
              <span className="muted" style={{ fontSize: "12px" }}>Required</span>
            </span>
            <input 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              type="email" 
              required 
              placeholder="you@example.com"
              style={{ width: "100%", boxSizing: "border-box" }}
            />
          </label>
          <label>
            <span style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
              Password
              <span className="muted" style={{ fontSize: "12px" }}>Min 8 characters</span>
            </span>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              required
              minLength={8}
              placeholder="••••••••"
              style={{ width: "100%", boxSizing: "border-box" }}
            />
          </label>
          {error ? <p className="error" style={{ margin: 0 }}>{error}</p> : null}
          <button 
            disabled={busy} 
            type="submit"
            style={{ width: "100%", marginTop: "8px" }}
          >
            {busy ? "Signing in..." : "Sign in"}
          </button>
        </form>
        <div style={{ marginTop: "24px", padding: "16px", background: "rgba(96, 165, 250, 0.05)", borderRadius: "10px", textAlign: "center", border: "1px solid rgba(96, 165, 250, 0.15)" }}>
          <p className="muted" style={{ marginBottom: "8px" }}>Don't have an account?</p>
          <Link to="/register" style={{ color: "#60a5fa", fontWeight: "600", textDecoration: "none" }}>
            Create one now
          </Link>
        </div>
      </div>
    </div>
  );
}
