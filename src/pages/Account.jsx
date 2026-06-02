import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { Toast } from "../components/Toast";
import { useToast } from "../hooks/useToast";

function Section({ title, children, className = "" }) {
  return (
    <div className={`acct-section${className ? ` ${className}` : ""}`}>
      <div className="acct-section-head">{title}</div>
      <div className="acct-section-body">{children}</div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div className="field">
      <label>{label}</label>
      {children}
    </div>
  );
}

export default function Account({ onLoggedOut }) {
  const [user, setUser] = useState(null);
  const [emailForm, setEmailForm]   = useState({ email: "", password: "" });
  const [passForm, setPassForm]     = useState({ current_password: "", new_password: "", confirm: "" });
  const [deleteForm, setDeleteForm] = useState({ password: "" });
  const [loadingEmail, setLoadingEmail]   = useState(false);
  const [loadingPass, setLoadingPass]     = useState(false);
  const [loadingDelete, setLoadingDelete] = useState(false);
  const [copied, setCopied] = useState(false);
  const { msg, show, toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    api.auth.me()
      .then((d) => {
        setUser(d.user);
        setEmailForm((f) => ({ ...f, email: d.user.email }));
      })
      .catch(() => toast("Failed to load account."));
  }, [toast]);

  const profileUrl = user ? `${window.location.origin}/u/${user.username}` : "";

  function copyLink() {
    navigator.clipboard.writeText(profileUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => toast("Copy failed. Select and copy the link manually."));
  }

  async function submitEmail(e) {
    e.preventDefault();
    setLoadingEmail(true);
    try {
      await api.auth.changeEmail(emailForm);
      setUser((u) => ({ ...u, email: emailForm.email }));
      setEmailForm((f) => ({ ...f, password: "" }));
      toast("Email updated.");
    } catch (err) {
      toast(err.message);
    } finally {
      setLoadingEmail(false);
    }
  }

  async function submitPassword(e) {
    e.preventDefault();
    if (passForm.new_password !== passForm.confirm) {
      toast("New passwords don't match.");
      return;
    }
    setLoadingPass(true);
    try {
      await api.auth.changePassword({
        current_password: passForm.current_password,
        new_password: passForm.new_password,
      });
      setPassForm({ current_password: "", new_password: "", confirm: "" });
      toast("Password updated.");
    } catch (err) {
      toast(err.message);
    } finally {
      setLoadingPass(false);
    }
  }

  async function submitDelete(e) {
    e.preventDefault();
    if (!window.confirm("This will permanently delete your account and all your data. Are you sure?")) return;
    setLoadingDelete(true);
    try {
      await api.auth.deleteAccount({ password: deleteForm.password });
      onLoggedOut?.();
      navigate("/");
    } catch (err) {
      toast(err.message);
      setLoadingDelete(false);
    }
  }

  async function logout() {
    try {
      await api.auth.logout();
    } finally {
      onLoggedOut?.();
      navigate("/");
    }
  }

  return (
    <div className="acct-layout">
      {/* Nav */}
      <nav className="builder-nav">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Link to="/" className="brand-pill">
            <span className="brand-mark">TL</span>
            <span>TrazLinks</span>
          </Link>
          <span style={{ color: "var(--muted)", fontSize: ".82rem", fontWeight: 600 }}>
            Account settings
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Link to="/insights" className="btn btn-sm">
            Insights
          </Link>
          <Link to="/builder" className="btn btn-sm btn-yellow">
            <svg viewBox="0 0 24 24" style={{ width: 14, height: 14 }} aria-hidden="true"><path d="m12 19-7-7 7-7" /><path d="M19 12H5" /></svg>
            Builder
          </Link>
          <button
            onClick={logout}
            className="icon-btn dark"
            title="Sign out"
          >
            <svg viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
          </button>
        </div>
      </nav>

      <div className="acct-body">
        <div className="acct-inner">

          {/* Your page */}
          <Section title="Your page">
            <p style={{ fontSize: ".88rem", fontWeight: 600, color: "var(--muted)", marginBottom: 10 }}>
              Share this link - it is your public profile.
            </p>
            <div className="acct-url-row">
              <span className="acct-url">{profileUrl || "Loading..."}</span>
              <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                <button onClick={copyLink} className="btn btn-sm btn-yellow">
                  {copied ? (
                    <><svg viewBox="0 0 24 24" style={{ width: 14, height: 14 }}><path d="M20 6 9 17l-5-5" /></svg>Copied</>
                  ) : (
                    <><svg viewBox="0 0 24 24" style={{ width: 14, height: 14 }}><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>Copy</>
                  )}
                </button>
                {user && (
                  <a href={`/u/${user.username}`} target="_blank" rel="noreferrer" className="btn btn-sm">
                    <svg viewBox="0 0 24 24" style={{ width: 14, height: 14 }}><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
                    Open
                  </a>
                )}
              </div>
            </div>
            {user && (
              <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                <span style={{ fontSize: ".78rem", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".04em" }}>
                  Username:
                </span>
                <code style={{ fontSize: ".82rem", background: "var(--bg-alt)", padding: "2px 8px", borderRadius: 4, border: "1.5px solid var(--border-strong)", fontWeight: 700 }}>
                  @{user.username}
                </code>
                <span style={{ fontSize: ".76rem", color: "var(--muted)", fontWeight: 600 }}>
                  (username cannot be changed)
                </span>
              </div>
            )}
          </Section>

          <Section title="Insights">
            <p style={{ fontSize: ".88rem", fontWeight: 600, color: "var(--muted)", marginBottom: 10 }}>
              Open your analytics dashboard to see profile views, custom link clicks, and social icon clicks.
            </p>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <Link to="/insights" className="btn btn-yellow">
                <svg viewBox="0 0 24 24" style={{ width: 14, height: 14 }} aria-hidden="true"><path d="M4 19h16" /><path d="M7 15V9" /><path d="M12 15V5" /><path d="M17 15v-3" /></svg>
                Open insights
              </Link>
              <span style={{ fontSize: ".78rem", color: "var(--muted)", fontWeight: 600, alignSelf: "center" }}>
                Updates when people visit or click your public page.
              </span>
            </div>
          </Section>

          {/* Change email */}
          <Section title="Change email">
            <form onSubmit={submitEmail} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <Field label="New email address">
                <input
                  type="email"
                  value={emailForm.email}
                  onChange={(e) => setEmailForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="you@email.com"
                  required
                />
              </Field>
              <Field label="Current password (to confirm)">
                <input
                  type="password"
                  value={emailForm.password}
                  onChange={(e) => setEmailForm((f) => ({ ...f, password: e.target.value }))}
                  placeholder="Password"
                  required
                />
              </Field>
              <button type="submit" disabled={loadingEmail} className="btn btn-green" style={{ alignSelf: "flex-start" }}>
                {loadingEmail ? "Saving..." : "Update email"}
              </button>
            </form>
          </Section>

          {/* Change password */}
          <Section title="Change password">
            <form onSubmit={submitPassword} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <Field label="Current password">
                <input
                  type="password"
                  value={passForm.current_password}
                  onChange={(e) => setPassForm((f) => ({ ...f, current_password: e.target.value }))}
                  placeholder="Current password"
                  required
                />
              </Field>
              <Field label="New password">
                <input
                  type="password"
                  value={passForm.new_password}
                  onChange={(e) => setPassForm((f) => ({ ...f, new_password: e.target.value }))}
                  placeholder="Min 8 characters"
                  required
                />
              </Field>
              <Field label="Confirm new password">
                <input
                  type="password"
                  value={passForm.confirm}
                  onChange={(e) => setPassForm((f) => ({ ...f, confirm: e.target.value }))}
                  placeholder="Confirm password"
                  required
                />
              </Field>
              <button type="submit" disabled={loadingPass} className="btn btn-green" style={{ alignSelf: "flex-start" }}>
                {loadingPass ? "Saving..." : "Update password"}
              </button>
            </form>
          </Section>

          {/* Danger zone */}
          <Section title="Danger zone" className="danger">
            <p style={{ fontSize: ".88rem", fontWeight: 600, color: "var(--muted)", marginBottom: 12 }}>
              Permanently deletes your account, profile, and all your links. This cannot be undone.
            </p>
            <form onSubmit={submitDelete} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <Field label="Enter your password to confirm">
                <input
                  type="password"
                  value={deleteForm.password}
                  onChange={(e) => setDeleteForm({ password: e.target.value })}
                  placeholder="Password"
                  required
                />
              </Field>
              <button type="submit" disabled={loadingDelete} className="btn btn-tomato" style={{ alignSelf: "flex-start" }}>
                {loadingDelete ? "Deleting..." : "Delete my account"}
              </button>
            </form>
          </Section>

        </div>
      </div>

      <Toast msg={msg} show={show} />
    </div>
  );
}
