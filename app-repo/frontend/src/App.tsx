import "./App.css";
import { Link, Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import axios from "axios";
import { authChangedEvent, clearToken, getToken } from "./lib/auth";
import { api, setAuthToken } from "./lib/api";
import { LoginPage } from "./pages/Login";
import { RegisterPage } from "./pages/Register";
import { DashboardPage } from "./pages/Dashboard";
import { TaskDetailPage } from "./pages/TaskDetail";

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const token = getToken();
  return token ? <>{children}</> : <Navigate to="/login" replace />;
}

export default function App() {
  const nav = useNavigate();
  const [token, setTokenState] = useState<string | null>(getToken());
  const [meEmail, setMeEmail] = useState<string | null>(null);
  const [sessionRevision, setSessionRevision] = useState(0);

  useEffect(() => {
    setAuthToken(token);
  }, [token]);

  useEffect(() => {
    const onAuthChanged = () => setTokenState(getToken());
    window.addEventListener(authChangedEvent, onAuthChanged);
    window.addEventListener("storage", onAuthChanged);
    return () => {
      window.removeEventListener(authChangedEvent, onAuthChanged);
      window.removeEventListener("storage", onAuthChanged);
    };
  }, []);

  useEffect(() => {
    const loadMe = async () => {
      if (!token) {
        setMeEmail(null);
        return;
      }
      try {
        const res = await api.get("/api/auth/me");
        setMeEmail(String(res.data.email ?? ""));
      } catch {
        setMeEmail(null);
      }
    };
    void loadMe();
  }, [token]);

  const logout = async () => {
    try {
      await api.post("/api/auth/logout");
    } catch (err) {
      if (!axios.isAxiosError(err) || err.response?.status !== 401) {
        console.error("Logout cleanup request failed", err);
      }
    } finally {
      clearToken();
      setTokenState(null);
      setMeEmail(null);
      setSessionRevision((v) => v + 1);
      setAuthToken(null);
      nav("/login");
    }
  };

  return (
    <div className="shell">
      <header className="topbar">
        <Link to="/" className="brand">
          AI Task Platform
        </Link>
        <nav className="nav">
          {token ? (
            <>
              <span className="muted">{meEmail ?? "Signed in"}</span>
              <button className="secondary" onClick={() => void logout()}>
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login">Login</Link>
              <Link to="/register">Register</Link>
            </>
          )}
        </nav>
      </header>

      <main className="container">
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route
            path="/"
            element={
              <PrivateRoute>
                <DashboardPage key={`dash-${sessionRevision}-${token ?? "none"}`} />
              </PrivateRoute>
            }
          />
          <Route
            path="/tasks/:id"
            element={
              <PrivateRoute>
                <TaskDetailPage key={`detail-${sessionRevision}-${token ?? "none"}`} />
              </PrivateRoute>
            }
          />
        </Routes>
      </main>
    </div>
  );
}
