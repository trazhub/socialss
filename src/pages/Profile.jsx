import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../lib/api";
import ProfileView from "../components/ProfileView";

export default function Profile() {
  const { username } = useParams();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    api.profile.get(username)
      .then((d) => setProfile(d.profile))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [username]);

  if (loading) {
    return (
      <div style={{ minHeight: "100svh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14 }}>
        <span className="brand-mark" style={{ width: 40, height: 40, fontSize: ".85rem", borderRadius: 12 }}>TL</span>
        <span style={{ fontSize: ".82rem", color: "var(--ink-3)", fontWeight: 500 }}>Loading…</span>
      </div>
    );
  }

  if (notFound) {
    return (
      <div style={{ minHeight: "100svh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 20, textAlign: "center", padding: 24 }}>
        <span className="brand-mark" style={{ width: 40, height: 40, fontSize: ".85rem", borderRadius: 12 }}>TL</span>
        <h1 style={{ fontSize: "1.8rem", fontFamily: "var(--font-display)", fontWeight: 700, letterSpacing: "-0.02em" }}>Page not found</h1>
        <p style={{ color: "var(--ink-2)", fontWeight: 400, fontSize: ".95rem" }}>No profile for @{username} yet.</p>
        <Link to="/" className="btn btn-primary">
          <svg viewBox="0 0 24 24" style={{ width: 14, height: 14 }} aria-hidden="true"><path d="m12 19-7-7 7-7" /><path d="M19 12H5" /></svg>
          Go home
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="profile-page">
        <ProfileView profile={profile} />
      </div>

      {/* CTA banner */}
      <div className="profile-cta-bar">
        <div className="profile-cta-inner">
          <div>
            <strong>Want your own page like this?</strong>
            <span style={{ color: "var(--muted)", marginLeft: 8, fontSize: ".85rem", fontWeight: 600 }}>
              Free / Takes 2 minutes
            </span>
          </div>
          <Link to="/auth" className="btn btn-primary btn-sm">
            Create your page
            <svg viewBox="0 0 24 24" style={{ width: 14, height: 14 }}><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
          </Link>
        </div>
      </div>

      <footer className="profile-footer">
        <span>
          Made with{" "}
          <Link to="/" style={{ color: "var(--tomato)", fontWeight: 700 }}>TrazLinks</Link>
          {" / "}
          Built by{" "}
          <a href="https://trazz.art/" target="_blank" rel="noreferrer" style={{ color: "var(--ink)", fontWeight: 700 }}>TrazHub</a>
        </span>
        <span style={{ opacity: .35 }}>/</span>
        <span>
          Discord presence by{" "}
          <a href="https://lanyard.cnrad.dev" target="_blank" rel="noreferrer" style={{ color: "var(--blue)", fontWeight: 700 }}>Lanyard</a>
          {" / "}
          <a href="https://discord.gg/HK949gsjF" target="_blank" rel="noreferrer" style={{ color: "var(--blue)", fontWeight: 700 }}>their Discord</a>
        </span>
        <span style={{ opacity: .35 }}>/</span>
        <span>
          <Link to="/privacy" style={{ color: "var(--ink)", fontWeight: 700 }}>Privacy</Link>
          {" / "}
          <Link to="/terms" style={{ color: "var(--ink)", fontWeight: 700 }}>Terms</Link>
        </span>
      </footer>
    </>
  );
}
