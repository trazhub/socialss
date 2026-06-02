import { useEffect, useRef, useState } from "react";
import { getSafeUrl } from "../lib/urls";

const SOCIAL_ICONS = {
  github: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 2a10 10 0 0 0-3 19c.5.1.7-.2.7-.5v-2c-2.8.6-3.4-1.1-3.4-1.1-.5-1.1-1.1-1.4-1.1-1.4-.9-.6.1-.6.1-.6 1 0 1.6 1.1 1.6 1.1.9 1.5 2.4 1.1 2.9.8.1-.7.4-1.1.7-1.3-2.2-.3-4.6-1.1-4.6-5A4 4 0 0 1 7 7.3c-.1-.3-.5-1.3.1-2.7 0 0 .9-.3 2.8 1a9.7 9.7 0 0 1 5.2 0c1.9-1.3 2.8-1 2.8-1 .6 1.4.2 2.4.1 2.7A4 4 0 0 1 19.1 10c0 3.9-2.4 4.7-4.6 5 .4.3.7 1 .7 2v3.5c0 .3.2.6.7.5A10 10 0 0 0 12 2z" />
    </svg>
  ),
  instagram: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <path d="M17.5 6.5h.01" />
    </svg>
  ),
  youtube: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M22 12s0-3.5-.45-5.2c-.25-.95-1-1.7-1.95-1.95C17.9 4.4 12 4.4 12 4.4s-5.9 0-7.6.45c-.95.25-1.7 1-1.95 1.95C2 8.5 2 12 2 12s0 3.5.45 5.2c.25.95 1 1.7 1.95 1.95 1.7.45 7.6.45 7.6.45s5.9 0 7.6-.45c.95-.25 1.7-1 1.95-1.95C22 15.5 22 12 22 12z" />
      <path d="m10 9 5 3-5 3z" />
    </svg>
  ),
  spotify: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <path d="M7.5 9.5c3.4-1 6.4-.7 9 1" />
      <path d="M8.3 12.5c2.7-.8 5.2-.5 7.3.8" />
      <path d="M9.1 15.2c1.9-.5 3.7-.3 5.3.6" />
    </svg>
  ),
  steam: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="8" cy="16" r="3" />
      <circle cx="17" cy="7" r="3" />
      <path d="m10.6 14.4 3.8-4.8" />
      <path d="m5.2 14.6-2.4-1" />
      <path d="M17 4v6" />
    </svg>
  ),
  x: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m4 4 16 16" /><path d="M20 4 4 20" />
    </svg>
  ),
  discord: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M20.3 4.4A18.9 18.9 0 0 0 15.6 3c-.2.4-.4.9-.6 1.3a17.6 17.6 0 0 0-5.2 0A13.1 13.1 0 0 0 9.2 3 18.9 18.9 0 0 0 4.5 4.4 19.9 19.9 0 0 0 1 18.5a19 19 0 0 0 5.8 2.9c.5-.6.9-1.3 1.2-2a12.4 12.4 0 0 1-1.9-.9l.5-.3a13.5 13.5 0 0 0 11.5 0l.5.3c-.6.4-1.2.7-1.9.9.3.7.8 1.4 1.2 2a19 19 0 0 0 5.8-2.9 19.8 19.8 0 0 0-3.4-14.1zM8.5 15.2c-1.1 0-2-1-2-2.3s.9-2.3 2-2.3 2 1 2 2.3-.9 2.3-2 2.3zm7 0c-1.1 0-2-1-2-2.3s.9-2.3 2-2.3 2 1 2 2.3-.9 2.3-2 2.3z" />
    </svg>
  ),
  linkedin: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
      <rect x="2" y="9" width="4" height="12" />
      <circle cx="4" cy="4" r="2" />
    </svg>
  ),
  tiktok: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
    </svg>
  ),
};

const LINK_SVG = (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
  </svg>
);

const APPEARANCE_THEMES = {
  sunset: {
    "--profile-bg": "linear-gradient(145deg, #1a0533 0%, #6b1a4f 30%, #d4345c 65%, #f97316 100%)",
    "--profile-orb-bg": "radial-gradient(ellipse at 18% 22%, rgba(249,115,22,.4) 0%, transparent 55%), radial-gradient(ellipse at 82% 78%, rgba(212,52,92,.3) 0%, transparent 55%)",
    "--profile-ink": "#fff",
    "--profile-muted": "rgba(255,255,255,.58)",
    "--profile-accent": "#ffd1a0",
    "--profile-card-bg": "rgba(255,255,255,.11)",
    "--profile-card-bg-hover": "rgba(255,255,255,.19)",
    "--profile-card-border": "rgba(255,255,255,.16)",
    "--profile-avatar-border": "rgba(255,210,160,.45)",
  },
  midnight: {
    "--profile-bg": "linear-gradient(145deg, #060614 0%, #0f0c29 35%, #1e1b4b 70%, #312e81 100%)",
    "--profile-orb-bg": "radial-gradient(ellipse at 20% 25%, rgba(99,102,241,.4) 0%, transparent 52%), radial-gradient(ellipse at 80% 70%, rgba(139,92,246,.28) 0%, transparent 52%)",
    "--profile-ink": "#eef2ff",
    "--profile-muted": "rgba(238,242,255,.52)",
    "--profile-accent": "#a5b4fc",
    "--profile-card-bg": "rgba(255,255,255,.07)",
    "--profile-card-bg-hover": "rgba(255,255,255,.13)",
    "--profile-card-border": "rgba(165,180,252,.18)",
    "--profile-avatar-border": "rgba(165,180,252,.4)",
  },
  mint: {
    "--profile-bg": "linear-gradient(145deg, #011c14 0%, #064e3b 35%, #065f46 65%, #0d9488 100%)",
    "--profile-orb-bg": "radial-gradient(ellipse at 22% 20%, rgba(13,148,136,.45) 0%, transparent 52%), radial-gradient(ellipse at 78% 78%, rgba(6,95,70,.4) 0%, transparent 52%)",
    "--profile-ink": "#ecfdf5",
    "--profile-muted": "rgba(236,253,245,.55)",
    "--profile-accent": "#6ee7b7",
    "--profile-card-bg": "rgba(255,255,255,.09)",
    "--profile-card-bg-hover": "rgba(255,255,255,.16)",
    "--profile-card-border": "rgba(110,231,183,.2)",
    "--profile-avatar-border": "rgba(110,231,183,.4)",
  },
  graphite: {
    "--profile-bg": "linear-gradient(145deg, #09090b 0%, #18181b 45%, #27272a 100%)",
    "--profile-orb-bg": "radial-gradient(ellipse at 25% 25%, rgba(63,63,70,.6) 0%, transparent 50%), radial-gradient(ellipse at 75% 75%, rgba(39,39,42,.5) 0%, transparent 50%)",
    "--profile-ink": "#fafafa",
    "--profile-muted": "rgba(250,250,250,.48)",
    "--profile-accent": "#d4d4d8",
    "--profile-card-bg": "rgba(255,255,255,.05)",
    "--profile-card-bg-hover": "rgba(255,255,255,.09)",
    "--profile-card-border": "rgba(255,255,255,.08)",
    "--profile-avatar-border": "rgba(255,255,255,.18)",
  },
};

function normalizeSpotifyPayload(data) {
  if (!data) return null;

  const spotify = data.spotify;
  const activitySpotify = Array.isArray(data.activities)
    ? data.activities.find((activity) => activity?.name === "Spotify")
    : null;

  if (!data.listening_to_spotify && !spotify && !activitySpotify) {
    return null;
  }

  const artist = Array.isArray(spotify?.artist)
    ? spotify.artist.join(", ")
    : spotify?.artist || activitySpotify?.details || "";

  const song = spotify?.song || activitySpotify?.state || activitySpotify?.details || "";
  const album = spotify?.album || activitySpotify?.assets?.large_text || "";
  const albumArtUrl = spotify?.album_art_url || "";
  const trackId = spotify?.track_id || "";

  if (!song && !artist) return null;

  return {
    song: song || "Current track",
    artist: artist || "Spotify",
    album,
    albumArtUrl,
    trackUrl: trackId ? `https://open.spotify.com/track/${trackId}` : "",
  };
}

export default function ProfileView({ profile, isPreview = false }) {
  const cardRef = useRef(null);
  const [spotifyState, setSpotifyState] = useState(null);

  const {
    display_name = "",
    bio = "",
    avatar_url = "",
    discord_id = "",
    show_spotify_status = false,
    socials = {},
    links = [],
    username = "",
    appearance = {},
  } = profile || {};

  const appearanceConfig = {
    theme_id: appearance.theme_id || "sunset",
    background_style: appearance.background_style || "grid",
    card_style: appearance.card_style || "soft",
  };

  const activeSocials = Object.entries(socials)
    .map(([key, value]) => [key, getSafeUrl(value)])
    .filter(([, url]) => url);

  function getTrackedHref(type, value) {
    if (!username) return value;
    if (type === "social") return `/api/profile/${username}/out?type=social&key=${encodeURIComponent(value)}`;
    return `/api/profile/${username}/out?type=link&index=${value}`;
  }

  useEffect(() => {
    if (isPreview) return;
    const card = cardRef.current;
    if (!card) return;
    const onMove = (e) => {
      const rect = card.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      card.style.transform = `rotateX(${y * -4}deg) rotateY(${x * 5}deg)`;
    };
    const onLeave = () => { card.style.transform = ""; };
    card.addEventListener("pointermove", onMove);
    card.addEventListener("pointerleave", onLeave);
    return () => {
      card.removeEventListener("pointermove", onMove);
      card.removeEventListener("pointerleave", onLeave);
    };
  }, [isPreview]);

  useEffect(() => {
    if (!show_spotify_status || !discord_id) {
      setSpotifyState(null);
      return undefined;
    }

    let cancelled = false;

    async function loadSpotifyState() {
      try {
        const res = await fetch(`https://api.lanyard.rest/v1/users/${discord_id}`);
        const payload = await res.json();
        if (cancelled || !payload?.success) return;
        setSpotifyState(normalizeSpotifyPayload(payload.data));
      } catch {
        if (!cancelled) setSpotifyState(null);
      }
    }

    loadSpotifyState();
    const intervalId = window.setInterval(loadSpotifyState, 30000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [discord_id, show_spotify_status]);

  const spotifyPreviewState = show_spotify_status && isPreview
    ? {
        song: "Your current song",
        artist: "Spotify updates live",
        album: "Preview",
        albumArtUrl: "",
        trackUrl: "",
      }
    : null;

  const liveSpotify = spotifyState || spotifyPreviewState;
  const themeStyle = APPEARANCE_THEMES[appearanceConfig.theme_id] || APPEARANCE_THEMES.sunset;

  return (
    <div
      className={`profile-shell bg-${appearanceConfig.background_style} card-${appearanceConfig.card_style}${isPreview ? " is-preview" : ""}`}
      style={themeStyle}
    >
      <div className="profile-card" ref={cardRef}>
        <div className="avatar-wrap">
          {avatar_url ? (
            <img src={avatar_url} alt={display_name || username} className="avatar" />
          ) : (
            <div className="avatar-placeholder">No photo</div>
          )}
        </div>

        <p className="hand-name">{display_name || username || "Your name"}</p>
        <p className="profile-copy">{bio || "Your bio goes here."}</p>

        {discord_id && (
          <a
            className="lanyard-card"
            href={`https://discord.com/users/${discord_id}`}
            target="_blank"
            rel="noreferrer"
            aria-label="Discord profile"
          >
            <img
              src={`https://lanyard.cnrad.dev/api/${discord_id}?theme=dark&hideActivity=true`}
              alt="Discord presence"
              loading="lazy"
              onError={(e) => { e.currentTarget.closest(".lanyard-card").style.display = "none"; }}
            />
          </a>
        )}

        {liveSpotify && (
          <a
            className={`spotify-status-card${liveSpotify.trackUrl ? "" : " is-static"}`}
            href={liveSpotify.trackUrl || undefined}
            target={liveSpotify.trackUrl ? "_blank" : undefined}
            rel={liveSpotify.trackUrl ? "noreferrer" : undefined}
            aria-label="Current Spotify track"
          >
            <div className="spotify-status-cover" aria-hidden="true">
              {liveSpotify.albumArtUrl ? (
                <img src={liveSpotify.albumArtUrl} alt="" />
              ) : (
                SOCIAL_ICONS.spotify
              )}
            </div>
            <div className="spotify-status-copy">
              <span className="spotify-status-kicker">Listening on Spotify</span>
              <strong>{liveSpotify.song}</strong>
              <span>{liveSpotify.artist}</span>
              {liveSpotify.album && <small>{liveSpotify.album}</small>}
            </div>
          </a>
        )}

        {activeSocials.length > 0 && (
          <div className="social-row" aria-label="Social links">
            {activeSocials.map(([key, url]) => (
              <a key={key} href={isPreview ? url : getTrackedHref("social", key)} target="_blank" rel="noreferrer" aria-label={key}>
                {SOCIAL_ICONS[key] ?? LINK_SVG}
              </a>
            ))}
          </div>
        )}
      </div>

      <div className="link-stack">
        {links.map((link, i) => {
          const item = link && typeof link === "object" ? link : {};
          const href = getSafeUrl(item.url);
          const className = `link-card lc-${item.color || "default"}${href ? "" : " is-disabled"}`;
          const content = (
            <>
              <span className="link-icon">{LINK_SVG}</span>
              <span className="link-copy">
                <strong>{item.title || "Link title"}</strong>
                {item.description && <small>{item.description}</small>}
              </span>
              <span className="link-arrow">{href ? "↗" : "Draft"}</span>
            </>
          );

          return href ? (
            <a key={i} className={className} href={isPreview ? href : getTrackedHref("link", i)} target="_blank" rel="noreferrer">
              {content}
            </a>
          ) : (
            <div key={i} className={className} aria-disabled="true">
              {content}
            </div>
          );
        })}
        {links.length === 0 && (
          <div className="profile-empty-state">
            Add some links to get started
          </div>
        )}
      </div>

      {!isPreview && (
        <p className="profile-watermark">
          Powered by <a href="/" style={{ marginLeft: 4 }}>TrazLinks</a>
        </p>
      )}
    </div>
  );
}
