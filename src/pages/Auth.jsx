import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { api } from "../lib/api";

export default function Auth({ onAuthed }) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ email: "", username: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = mode === "login"
        ? await api.auth.login({ email: form.email, password: form.password })
        : await api.auth.register(form);
      onAuthed(data.user);
      navigate("/builder");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-box">
        <div className="auth-header">
          <Link to="/" className="auth-back">
            <svg viewBox="0 0 24 24" style={{ width: 14, height: 14 }} aria-hidden="true"><path d="m12 19-7-7 7-7" /><path d="M19 12H5" /></svg>
            Back
          </Link>
          <h1 style={{ marginTop: 6 }}>{mode === "login" ? "Sign in" : "Create account"}</h1>
        </div>

        <form className="auth-body" onSubmit={submit} noValidate>
          {error && <div className="auth-error">{error}</div>}

          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" type="email" value={form.email} onChange={set("email")} placeholder="you@email.com" required autoComplete="email" />
          </div>

          {mode === "register" && (
            <div className="field">
              <label htmlFor="username">Username</label>
              <input id="username" type="text" value={form.username} onChange={set("username")} placeholder="yourname" required autoComplete="username" />
              <span style={{ fontSize: ".76rem", color: "var(--muted)", fontWeight: 600 }}>
                Your page will be at /u/{form.username || "yourname"}
              </span>
            </div>
          )}

          <div className="field">
            <label htmlFor="password">Password</label>
            <input id="password" type="password" value={form.password} onChange={set("password")} placeholder="Password" required autoComplete={mode === "login" ? "current-password" : "new-password"} />
          </div>

          <button type="submit" className="btn btn-green" disabled={loading} style={{ width: "100%", justifyContent: "center" }}>
            {loading ? "Loading..." : mode === "login" ? "Sign in" : "Create account"}
          </button>

          <p className="auth-legal">
            By using TrazLinks, you agree that profile content and uploaded avatars may be stored by the service and shown publicly on your page.
            {" "}
            <Link to="/privacy">Privacy</Link>
            {" / "}
            <Link to="/terms">Terms</Link>
          </p>

          <p className="auth-toggle">
            {mode === "login" ? "No account?" : "Already have one?"}{" "}
            <button type="button" onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}>
              {mode === "login" ? "Sign up" : "Sign in"}
            </button>
          </p>
        </form>
      </div>
    </div>
  );
}
