import { Link } from "react-router-dom";
import ThreeBackground from "../components/ThreeBackground";

const FEATURE_ICONS = {
  links: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M10 13a5 5 0 0 0 7.5.5l2.5-2.5a5 5 0 0 0-7-7l-1.5 1.5" />
      <path d="M14 11a5 5 0 0 0-7.5-.5L4 13a5 5 0 0 0 7 7l1.5-1.5" />
    </svg>
  ),
  status: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12h4l2-4 2 8 2-4h2" />
    </svg>
  ),
  edit: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 20h16" />
      <path d="M6 16V8" />
      <path d="M12 16V4" />
      <path d="M18 16v-6" />
    </svg>
  ),
  share: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3v12" />
      <path d="m7 8 5-5 5 5" />
      <path d="M5 13v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5" />
    </svg>
  ),
};

const FEATURES = [
  ["links", "Everything in one place", "Socials, projects, music, contact links, and anything you want to ship."],
  ["status", "Live presence", "Discord and Spotify context through Lanyard, tuned for a clean public profile."],
  ["edit", "Fast builder", "Edit content, preview the page, and publish without fighting a bloated dashboard."],
  ["share", "One URL", "Use your TrazLinks page across every bio, profile, README, and launch."],
];

export default function Home({ session }) {
  return (
    <div className="home-root">
      <ThreeBackground />

      <header className="home-nav">
        <span className="brand-pill" style={{ pointerEvents: "none" }}>
          <span className="brand-mark">TL</span>
          <span>TrazLinks</span>
        </span>
        <div className="home-actions">
          {session ? (
            <Link to="/builder" className="btn btn-primary btn-sm">Open builder</Link>
          ) : (
            <>
              <Link to="/auth" className="btn btn-sm nav-signin">Sign in</Link>
              <Link to="/auth" className="btn btn-primary btn-sm nav-primary">Create free</Link>
            </>
          )}
        </div>
      </header>

      <section className="home-hero">
        <div className="home-hero-left">
          <div className="home-eyebrow">
            <span className="home-badge">Free / private dashboard / public link page</span>
          </div>

          <h1 className="home-headline">
            One link for everything.
          </h1>

          <p className="home-desc">
            A minimal link-in-bio page for creators who want their work, socials,
            Discord presence, and currently playing music in one calm place.
          </p>

          <div className="home-cta">
            {session ? (
              <Link to="/builder" className="btn btn-primary">
                Open my builder
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
              </Link>
            ) : (
              <>
                <Link to="/auth" className="btn btn-primary">
                  Create your page — free
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
                </Link>
                <Link to="/auth" className="btn btn-outline">Sign in</Link>
              </>
            )}
          </div>

          <div className="home-features-inline">
            {FEATURES.map(([icon, title, desc]) => (
              <div key={title} className="home-feature-row">
                <span className="home-feature-icon">{FEATURE_ICONS[icon]}</span>
                <div>
                  <strong>{title}</strong>
                  <p>{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="home-footer">
        <div className="home-footer-inner">
          <div className="home-made-by">
            <span>Designed &amp; built by</span>
            <a href="https://trazz.art/" target="_blank" rel="noreferrer" className="made-by-pill">
              <img
                src="https://avatars.githubusercontent.com/trazhub"
                alt="Garv / TrazHub"
                width={24}
                height={24}
                style={{ borderRadius: 4, border: "1px solid var(--border-strong)", display: "block" }}
              />
              <strong>Garv</strong>
              <span style={{ opacity: .55 }}>/ TrazHub</span>
            </a>
          </div>

          <div className="home-credits">
            <span style={{ color: "var(--muted)" }}>Discord presence powered by</span>
            <a href="https://lanyard.cnrad.dev" target="_blank" rel="noreferrer">Lanyard</a>
            <span className="credit-dot">/</span>
            <a href="https://discord.gg/HK949gsjF" target="_blank" rel="noreferrer">Join their Discord</a>
          </div>

          <div className="home-legal-links">
            <Link to="/privacy">Privacy</Link>
            <span className="credit-dot">/</span>
            <Link to="/terms">Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
