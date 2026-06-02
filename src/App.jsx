import { Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { api } from "./lib/api";
import Home from "./pages/Home";
import Auth from "./pages/Auth";
import Builder from "./pages/Builder";
import Account from "./pages/Account";
import Insights from "./pages/Insights";
import Profile from "./pages/Profile";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";

export default function App() {
  const [session, setSession] = useState(undefined);

  useEffect(() => {
    let active = true;
    api.auth.me()
      .then((d) => {
        if (active) setSession(d.user);
      })
      .catch(() => {
        if (active) setSession(null);
      });

    return () => {
      active = false;
    };
  }, []);

  if (session === undefined) {
    return (
      <div className="app-loading">
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
          <span className="brand-mark" style={{ width: 40, height: 40, fontSize: ".85rem", borderRadius: 12 }}>TL</span>
          <span style={{ fontSize: ".82rem", color: "var(--ink-3)", fontWeight: 500 }}>Loading…</span>
        </div>
      </div>
    );
  }

  const authed = (el) => session ? el : <Navigate to="/auth" replace />;

  return (
    <Routes>
      <Route path="/"        element={<Home session={session} />} />
      <Route path="/auth"    element={session ? <Navigate to="/builder" replace /> : <Auth onAuthed={setSession} />} />
      <Route path="/builder" element={authed(<Builder session={session} onLoggedOut={() => setSession(null)} />)} />
      <Route path="/account" element={authed(<Account session={session} onLoggedOut={() => setSession(null)} />)} />
      <Route path="/insights" element={authed(<Insights onLoggedOut={() => setSession(null)} />)} />
      <Route path="/u/:username" element={<Profile />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
