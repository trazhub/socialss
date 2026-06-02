import { Link } from "react-router-dom";

const FEATURE_ICONS = {
  links: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M10 13a5 5 0 0 0 7.5.5l2.5-2.5a5 5 0 0 0-7-7l-1.5 1.5" />
      <path d="M14 11a5 5 0 0 0-7.5-.5L4 13a5 5 0 0 0 7 7l1.5-1.5" />
    </svg>
  ),
  status: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M13 2 4 14h7l-1 8 10-13h-7l1-7z" />
    </svg>
  ),
  edit: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
    </svg>
  ),
  share: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7" />
      <path d="M16 6 12 2 8 6" />
      <path d="M12 2v14" />
    </svg>
  ),
};

const FEATURES = [
  ["links", "All your socials", "GitHub, Instagram, YouTube, Spotify, Steam, Discord and more"],
  ["status", "Live Discord status", "Powered by Lanyard, with activity shown in real time"],
  ["edit", "Live preview builder", "See changes instantly as you type, then save when ready"],
  ["share", "One link, everywhere", "Share one URL in every bio across your platforms"],
];

export default function Home({ session }) {
  return (
    <div className="home-root">

      {/* Nav */}
      <header className="home-nav">
        <span className="brand-pill" style={{ pointerEvents: "none" }}>
          <span className="brand-mark">TL</span>
          <span>TrazLinks</span>
        </span>
        <div className="home-actions">
          {session ? (
            <Link to="/builder" className="btn btn-green btn-sm">Open builder</Link>
          ) : (
            <>
              <Link to="/auth" className="btn btn-sm nav-signin">Sign in</Link>
              <Link to="/auth" className="btn btn-yellow btn-sm nav-primary">Get started</Link>
            </>
          )}
        </div>
      </header>

      {/* Hero */}
      <section className="home-hero">
        <div className="home-hero-left">
          <div className="home-eyebrow">
            <span className="home-badge">Free - No installs - By TrazHub</span>
          </div>

          <h1 className="home-headline">
            One link for<br />
            <span className="home-headline-accent">everything you do.</span>
          </h1>

          <p className="home-desc">
            Build a beautiful, animated link page in minutes.
            One URL to share everywhere with all your socials, projects, and content.
          </p>

          <div className="home-cta">
            {session ? (
              <Link to="/builder" className="btn btn-green">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
                Open my builder
              </Link>
            ) : (
              <>
                <Link to="/auth" className="btn btn-yellow">
                  Create your page - free
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                </Link>
                <Link to="/auth" className="btn">Sign in</Link>
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

      {/* Made by credit */}
      <footer className="home-footer">
        <div className="home-footer-inner">
          <div className="home-made-by">
            <span>Designed &amp; built by</span>
            <a href="https://trazz.art/" target="_blank" rel="noreferrer" className="made-by-pill">
              <img
                src="https://avatars.githubusercontent.com/trazhub"
                alt="Garv / TrazHub"
                width={24} height={24}
                style={{ borderRadius: 4, border: "2px solid var(--ink)", display: "block" }}
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
            <Link to="/terms">Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
