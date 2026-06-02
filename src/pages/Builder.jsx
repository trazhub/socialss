import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { api } from "../lib/api";
import ProfileView from "../components/ProfileView";
import { Toast } from "../components/Toast";
import { useToast } from "../hooks/useToast";

const SOCIALS = ["github", "instagram", "youtube", "spotify", "steam", "x", "discord", "linkedin", "tiktok"];
const BUILDER_TABS = [
  { id: "overview", label: "Overview" },
  { id: "content", label: "Content" },
  { id: "design", label: "Design" },
  { id: "links", label: "Links" },
];
const COLORS = [
  { id: "green", hex: "#eafff3" },
  { id: "blue", hex: "#eef7ff" },
  { id: "red", hex: "#fff0e9" },
  { id: "pink", hex: "#ffeaf2" },
  { id: "cyan", hex: "#e9f7ff" },
  { id: "yellow", hex: "#fffbe9" },
  { id: "purple", hex: "#f3eeff" },
  { id: "default", hex: "#fffdf7" },
];
const THEME_OPTIONS = [
  { id: "sunset", name: "Sunset Pop", desc: "Warm paper, bold coral accents." },
  { id: "midnight", name: "Midnight", desc: "Deep navy glass with bright highlights." },
  { id: "mint", name: "Mint Studio", desc: "Fresh green palette with airy cards." },
  { id: "graphite", name: "Graphite", desc: "Monochrome editorial look." },
];
const BACKGROUND_OPTIONS = [
  { id: "grid", name: "Grid" },
  { id: "spotlight", name: "Spotlight" },
  { id: "mesh", name: "Mesh" },
  { id: "minimal", name: "Minimal" },
];
const CARD_STYLE_OPTIONS = [
  { id: "soft", name: "Soft" },
  { id: "outline", name: "Outline" },
  { id: "glass", name: "Glass" },
];

const DEFAULT_PROFILE = {
  display_name: "",
  bio: "",
  avatar_url: "",
  discord_id: "",
  theme_mode: "light",
  show_spotify_status: false,
  appearance: {
    theme_id: "sunset",
    background_style: "grid",
    card_style: "soft",
  },
  socials: {},
  links: [],
};

function toEditableProfile(profile) {
  const appearance = profile.appearance || DEFAULT_PROFILE.appearance;
  return {
    display_name: profile.display_name || "",
    bio: profile.bio || "",
    avatar_url: profile.avatar_url || "",
    discord_id: profile.discord_id || "",
    theme_mode: profile.theme_mode === "dark" ? "dark" : "light",
    show_spotify_status: Boolean(profile.show_spotify_status),
    appearance: {
      theme_id: appearance.theme_id || "sunset",
      background_style: appearance.background_style || "grid",
      card_style: appearance.card_style || "soft",
    },
    socials: profile.socials || {},
    links: profile.links || [],
  };
}

function BuilderStat({ label, value, tone = "default" }) {
  return (
    <div className={`builder-stat-card tone-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export default function Builder({ onLoggedOut }) {
  const [profile, setProfile] = useState(DEFAULT_PROFILE);
  const [username, setUsername] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const { msg, show, toast } = useToast();
  const savedTimer = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    api.profile.me()
      .then((d) => {
        setUsername(d.profile.username);
        setProfile(toEditableProfile(d.profile));
      })
      .catch(() => toast("Failed to load profile."));
  }, [toast]);

  useEffect(() => () => clearTimeout(savedTimer.current), []);

  const setField = useCallback((key) => (e) => {
    setProfile((p) => ({ ...p, [key]: e.target.value }));
  }, []);

  function setAppearance(key, value) {
    setProfile((p) => ({
      ...p,
      appearance: { ...p.appearance, [key]: value },
    }));
  }

  function setSocial(key, value) {
    setProfile((p) => ({ ...p, socials: { ...p.socials, [key]: value } }));
  }

  function setSocialEnabled(key, enabled) {
    setProfile((p) => {
      const socials = { ...p.socials };
      if (enabled) socials[key] = socials[key] || "";
      else delete socials[key];
      return { ...p, socials };
    });
  }

  function addLink() {
    setProfile((p) => ({
      ...p,
      links: [...p.links, { title: "", description: "", url: "", color: "default" }],
    }));
    setActiveTab("links");
  }

  function updateLink(i, patch) {
    setProfile((p) => {
      const links = [...p.links];
      links[i] = { ...links[i], ...patch };
      return { ...p, links };
    });
  }

  function removeLink(i) {
    setProfile((p) => ({ ...p, links: p.links.filter((_, j) => j !== i) }));
  }

  function moveLink(i, dir) {
    setProfile((p) => {
      const links = [...p.links];
      const j = i + dir;
      if (j < 0 || j >= links.length) return p;
      [links[i], links[j]] = [links[j], links[i]];
      return { ...p, links };
    });
  }

  async function save() {
    setSaving(true);
    try {
      const data = await api.profile.update(profile);
      setProfile(toEditableProfile(data.profile));
      setSaved(true);
      clearTimeout(savedTimer.current);
      savedTimer.current = setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      toast(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function uploadAvatar(file) {
    if (!file) return;
    setUploading(true);
    try {
      const data = await api.profile.uploadAvatar(file);
      setProfile((p) => ({ ...p, avatar_url: data.avatar_url }));
      toast("Avatar uploaded.");
    } catch (err) {
      toast(err.message);
    } finally {
      setUploading(false);
    }
  }

  async function deleteAvatar() {
    if (!window.confirm("Remove your profile photo?")) return;
    setUploading(true);
    try {
      await api.profile.deleteAvatar();
      setProfile((p) => ({ ...p, avatar_url: "" }));
      toast("Photo removed.");
    } catch (err) {
      toast(err.message);
    } finally {
      setUploading(false);
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

  const previewProfile = { ...profile, username };
  const enabledSocialCount = Object.keys(profile.socials).length;
  const cardThemeName = THEME_OPTIONS.find((item) => item.id === profile.appearance.theme_id)?.name || "Theme";

  return (
    <div className="builder-layout builder-dashboard">
      <nav className="builder-nav">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Link to="/" className="brand-pill">
            <span className="brand-mark">TL</span>
            <span>TrazLinks</span>
          </Link>
          <span style={{ color: "var(--muted)", fontSize: ".82rem", fontWeight: 600 }}>
            /u/{username}
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span className={`saved-badge${saved ? " show" : ""}`}>
            <svg viewBox="0 0 24 24" style={{ width: 14, height: 14 }}><path d="M20 6 9 17l-5-5" /></svg>
            Saved
          </span>

          <a
            href={`/u/${username}`}
            target="_blank"
            rel="noreferrer"
            className="btn btn-sm"
            style={{ color: "var(--panel)", borderColor: "rgba(255,255,255,.25)", background: "transparent" }}
          >
            <svg viewBox="0 0 24 24" style={{ width: 14, height: 14 }}><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
            View page
          </a>

          <button onClick={save} disabled={saving} className="btn btn-green btn-sm">
            {saving ? "Saving..." : "Save"}
          </button>

          <Link to="/insights" className="btn btn-sm btn-yellow">
            Insights
          </Link>

          <Link to="/account" className="icon-btn dark" title="Account settings">
            <svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" /></svg>
          </Link>

          <button onClick={logout} className="icon-btn dark" title="Sign out">
            <svg viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
          </button>
        </div>
      </nav>

      <div className="builder-body">
        <aside className="builder-form builder-dashboard-sidebar">
          <div className="builder-form-inner">
            <section className="builder-summary">
              <div className="builder-summary-head">
                <div>
                  <p className="builder-kicker">Creator dashboard</p>
                  <h1>{profile.display_name || username || "Your page"}</h1>
                </div>
                <span className="builder-theme-chip">{cardThemeName}</span>
              </div>
              <div className="builder-summary-grid">
                <BuilderStat label="Links" value={profile.links.length} tone="yellow" />
                <BuilderStat label="Socials" value={enabledSocialCount} tone="blue" />
                <BuilderStat label="Theme" value={profile.appearance.background_style} tone="green" />
              </div>
            </section>

            <section className="builder-tabs-card">
              <div className="builder-tabs-list" role="tablist" aria-label="Builder sections">
                {BUILDER_TABS.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    className={`builder-tab-btn${activeTab === tab.id ? " active" : ""}`}
                    onClick={() => setActiveTab(tab.id)}
                    role="tab"
                    aria-selected={activeTab === tab.id}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </section>

            {activeTab === "overview" && (
              <>
                <div className="builder-section">
                  <div className="builder-section-head">Workspace</div>
                  <div className="builder-section-body">
                    <p className="builder-note">
                      Separate your page setup into content, design, and links. The preview updates instantly, and saved changes go live on your public page.
                    </p>
                    <div className="builder-shortcuts">
                      <button type="button" className="btn btn-yellow btn-sm" onClick={() => setActiveTab("content")}>Edit content</button>
                      <button type="button" className="btn btn-sm" onClick={() => setActiveTab("design")}>Customize design</button>
                      <button type="button" className="btn btn-sm" onClick={addLink}>Add link</button>
                    </div>
                  </div>
                </div>

                <div className="builder-section">
                  <div className="builder-section-head">Page status</div>
                  <div className="builder-section-body">
                    <div className="builder-checklist">
                      <div className={`builder-check-item${profile.display_name ? " is-done" : ""}`}>Display name is set</div>
                      <div className={`builder-check-item${profile.bio ? " is-done" : ""}`}>Bio is written</div>
                      <div className={`builder-check-item${profile.links.length ? " is-done" : ""}`}>At least one custom link</div>
                      <div className={`builder-check-item${enabledSocialCount ? " is-done" : ""}`}>Social icons enabled</div>
                    </div>
                  </div>
                </div>

                <div className="builder-section">
                  <div className="builder-section-head">Insights</div>
                  <div className="builder-section-body">
                    <p className="builder-note">
                      Profile traffic, link clicks, and social taps have their own analytics dashboard.
                    </p>
                    <Link to="/insights" className="btn btn-yellow" style={{ justifyContent: "center" }}>
                      <svg viewBox="0 0 24 24" style={{ width: 14, height: 14 }} aria-hidden="true"><path d="M4 19h16" /><path d="M7 15V9" /><path d="M12 15V5" /><path d="M17 15v-3" /></svg>
                      Open insights
                    </Link>
                  </div>
                </div>
              </>
            )}

            {activeTab === "content" && (
              <>
                <div className="builder-section">
                  <div className="builder-section-head">Profile</div>
                  <div className="builder-section-body">
                    <div className="field">
                      <label>Display name</label>
                      <input type="text" value={profile.display_name} onChange={setField("display_name")} placeholder="Your name" />
                    </div>
                    <div className="field">
                      <label>Bio</label>
                      <textarea rows={3} value={profile.bio} onChange={setField("bio")} placeholder="A short description about yourself" />
                    </div>
                    <div className="field">
                      <label>Discord ID</label>
                      <input type="text" value={profile.discord_id} onChange={setField("discord_id")} placeholder="835584835443228702" />
                    </div>
                    <p className="builder-inline-help">
                      Join the <a href="https://discord.gg/lanyard" target="_blank" rel="noreferrer">Lanyard Discord</a> if you want Discord presence and Spotify listening status to render consistently.
                    </p>
                    <div className="status-option-card">
                      <div className="social-toggle-row">
                        <div>
                          <div className="social-toggle-label">Show live Spotify status</div>
                          <div className="status-option-copy">
                            Requires your Discord ID above. Shows your current track via Lanyard.
                          </div>
                        </div>
                        <label className="toggle-switch">
                          <input
                            type="checkbox"
                            checked={profile.show_spotify_status}
                            onChange={(e) => setProfile((p) => ({ ...p, show_spotify_status: e.target.checked }))}
                          />
                          <span className="toggle-track" />
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="builder-section">
                  <div className="builder-section-head">Photo</div>
                  <div className="builder-section-body">
                    <label className="avatar-upload-area" htmlFor="avatar-input" style={{ cursor: uploading ? "wait" : "pointer" }}>
                      {profile.avatar_url && (
                        <img src={profile.avatar_url} alt="Avatar" className="avatar-preview-thumb" />
                      )}
                      <div style={{ fontSize: ".82rem", fontWeight: 700, color: "var(--muted)" }}>
                        {uploading ? "Uploading..." : profile.avatar_url ? "Click to change photo" : "Click to upload photo"}
                      </div>
                      <div style={{ fontSize: ".72rem", color: "var(--muted)", marginTop: 4, fontWeight: 600 }}>
                        JPG, PNG, GIF up to 5 MB
                      </div>
                      <div className="upload-privacy-note">
                        Uploaded photos are stored by the service and shown publicly on your profile page until you replace or delete them.
                      </div>
                      <input
                        id="avatar-input"
                        type="file"
                        accept="image/*"
                        onChange={(e) => uploadAvatar(e.target.files[0])}
                        disabled={uploading}
                      />
                    </label>
                    {profile.avatar_url && (
                      <button
                        type="button"
                        onClick={deleteAvatar}
                        disabled={uploading}
                        className="btn btn-sm"
                        style={{ marginTop: 8, color: "var(--tomato)", borderColor: "var(--tomato)", background: "transparent", width: "100%", justifyContent: "center" }}
                      >
                        <svg viewBox="0 0 24 24" style={{ width: 14, height: 14 }}><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" /></svg>
                        Remove photo
                      </button>
                    )}
                  </div>
                </div>

                <div className="builder-section">
                  <div className="builder-section-head">Social icons</div>
                  <div className="builder-section-body">
                    <div className="social-toggle-list">
                      {SOCIALS.map((key) => {
                        const on = Object.hasOwn(profile.socials, key);
                        return (
                          <div key={key} className="social-toggle-item">
                            <div className="social-toggle-row">
                              <span className="social-toggle-label">{key}</span>
                              <label className="toggle-switch">
                                <input
                                  type="checkbox"
                                  checked={on}
                                  onChange={(e) => setSocialEnabled(key, e.target.checked)}
                                />
                                <span className="toggle-track" />
                              </label>
                            </div>
                            {on && (
                              <input
                                type="url"
                                className="social-toggle-input"
                                value={profile.socials[key] || ""}
                                onChange={(e) => setSocial(key, e.target.value)}
                                placeholder={`https://${key}.com/yourhandle`}
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </>
            )}

            {activeTab === "design" && (
              <>
                <div className="builder-section">
                  <div className="builder-section-head">Theme presets</div>
                  <div className="builder-section-body">
                    <div className="theme-grid">
                      {THEME_OPTIONS.map((theme) => (
                        <button
                          key={theme.id}
                          type="button"
                          className={`theme-preset-card${profile.appearance.theme_id === theme.id ? " active" : ""}`}
                          onClick={() => setAppearance("theme_id", theme.id)}
                        >
                          <strong>{theme.name}</strong>
                          <span>{theme.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="builder-section">
                  <div className="builder-section-head">Canvas</div>
                  <div className="builder-section-body">
                    <div className="option-pill-grid">
                      {BACKGROUND_OPTIONS.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          className={`option-pill${profile.appearance.background_style === item.id ? " active" : ""}`}
                          onClick={() => setAppearance("background_style", item.id)}
                        >
                          {item.name}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="builder-section">
                  <div className="builder-section-head">Card style</div>
                  <div className="builder-section-body">
                    <div className="option-pill-grid">
                      {CARD_STYLE_OPTIONS.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          className={`option-pill${profile.appearance.card_style === item.id ? " active" : ""}`}
                          onClick={() => setAppearance("card_style", item.id)}
                        >
                          {item.name}
                        </button>
                      ))}
                    </div>

                  </div>
                </div>
              </>
            )}

            {activeTab === "links" && (
              <div className="builder-section">
                <div className="builder-section-head">
                  <span>Links</span>
                  <button onClick={addLink} className="btn btn-sm btn-yellow" style={{ boxShadow: "2px 2px 0 var(--ink)" }}>
                    + Add link
                  </button>
                </div>
                <div className="builder-section-body">
                  {profile.links.length === 0 && (
                    <p style={{ color: "var(--muted)", fontSize: ".85rem", fontWeight: 600, textAlign: "center", padding: "8px 0" }}>
                      No links yet. Hit "Add link" above.
                    </p>
                  )}
                  <div className="link-editor-list">
                    {profile.links.map((link, i) => (
                      <div key={i} className="link-editor-item">
                        <div className="link-editor-item-head">
                          <span style={{ fontSize: ".78rem", fontWeight: 700, flex: 1, color: "var(--muted)" }}>
                            {link.title || `Link ${i + 1}`}
                          </span>
                          <button type="button" onClick={() => moveLink(i, -1)} className="icon-btn" style={{ width: 24, height: 24, borderColor: "var(--ink)", color: "var(--ink)" }} title="Move up">
                            <svg viewBox="0 0 24 24" style={{ width: 12, height: 12 }}><path d="m18 15-6-6-6 6" /></svg>
                          </button>
                          <button type="button" onClick={() => moveLink(i, 1)} className="icon-btn" style={{ width: 24, height: 24, borderColor: "var(--ink)", color: "var(--ink)" }} title="Move down">
                            <svg viewBox="0 0 24 24" style={{ width: 12, height: 12 }}><path d="m6 9 6 6 6-6" /></svg>
                          </button>
                          <button type="button" onClick={() => removeLink(i)} className="icon-btn" style={{ width: 24, height: 24, borderColor: "var(--tomato)", color: "var(--tomato)" }} title="Remove">
                            <svg viewBox="0 0 24 24" style={{ width: 12, height: 12 }}><path d="M18 6 6 18M6 6l12 12" /></svg>
                          </button>
                        </div>
                        <div className="link-editor-item-body">
                          <div className="field">
                            <label>Title</label>
                            <input type="text" value={link.title} onChange={(e) => updateLink(i, { title: e.target.value })} placeholder="Link title" />
                          </div>
                          <div className="field">
                            <label>Description</label>
                            <input type="text" value={link.description} onChange={(e) => updateLink(i, { description: e.target.value })} placeholder="Short description (optional)" />
                          </div>
                          <div className="field">
                            <label>URL</label>
                            <input type="url" value={link.url} onChange={(e) => updateLink(i, { url: e.target.value })} placeholder="https://..." />
                          </div>
                          <div className="field">
                            <label>Color</label>
                            <div className="color-row">
                              {COLORS.map((c) => (
                                <button
                                  key={c.id}
                                  type="button"
                                  className={`color-swatch${link.color === c.id ? " active" : ""}`}
                                  style={{ background: c.hex }}
                                  title={c.id}
                                  onClick={() => updateLink(i, { color: c.id })}
                                />
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <button onClick={save} disabled={saving} className="btn btn-green" style={{ justifyContent: "center" }}>
              {saving ? "Saving..." : "Save changes"}
            </button>
          </div>
        </aside>

        <div className="builder-preview">
          <div className="preview-scale">
            <div className="builder-preview-head">
              <div>
                <span className="builder-preview-kicker">Live preview</span>
                <h2>Public page</h2>
              </div>
              <span className="builder-preview-note">Changes show instantly before publish.</span>
            </div>
            <div className="profile-page profile-page-preview" style={{ minHeight: "auto", padding: 0, width: "100%" }}>
              <ProfileView profile={previewProfile} isPreview />
            </div>
          </div>
        </div>
      </div>

      <Toast msg={msg} show={show} />
    </div>
  );
}
