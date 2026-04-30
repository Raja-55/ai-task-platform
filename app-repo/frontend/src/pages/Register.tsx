import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { api } from "../lib/api";
import { errorMessageFromAxios } from "../lib/error";

export function RegisterPage() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api.post("/api/auth/register", { email, password });
      nav("/login");
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) setError(errorMessageFromAxios(err));
      else if (err instanceof Error) setError(err.message);
      else setError("Registration failed");
    } finally {
      setBusy(false);
    }
  };

  const passwordStrength = password.length >= 8 ? "strong" : "weak";

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", padding: "16px" }}>
      <div className="card" style={{ maxWidth: "420px", width: "100%" }}>
        <div style={{ marginBottom: "32px" }}>
          <h1 style={{ fontSize: "32px", marginBottom: "8px", textAlign: "center" }}>Create Account</h1>
          <p className="muted" style={{ textAlign: "center" }}>Join us to start managing your tasks</p>
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
            <span style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", alignItems: "center" }}>
              Password
              <span className={`muted`} style={{ fontSize: "12px", color: passwordStrength === "strong" ? "#86efac" : "#fde68a" }}>
                {passwordStrength === "strong" ? "✓ Strong" : "Minimum 8 characters"}
              </span>
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
          <label>
            <span style={{ marginBottom: "8px", display: "block" }}>Confirm Password</span>
            <input
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
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
            {busy ? "Creating account..." : "Create account"}
          </button>
        </form>
        <div style={{ marginTop: "24px", padding: "16px", background: "rgba(96, 165, 250, 0.05)", borderRadius: "10px", textAlign: "center", border: "1px solid rgba(96, 165, 250, 0.15)" }}>
          <p className="muted" style={{ marginBottom: "8px" }}>Already have an account?</p>
          <Link to="/login" style={{ color: "#60a5fa", fontWeight: "600", textDecoration: "none" }}>
            Sign in here
          </Link>
        </div>
      </div>
    </div>
  );
}
