import { Router } from "express";
import multer from "multer";
import { requireAuth } from "../middleware/auth.js";
import { uploadToR2, deleteFromR2 } from "../lib/r2.js";
import db from "../db.js";

// Use memory storage; uploads stream directly to R2 and never touch disk.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_, file, cb) => {
    const ALLOWED = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);
    if (ALLOWED.has(file.mimetype)) cb(null, true);
    else {
      const err = new Error("Only JPEG, PNG, GIF, or WebP images are allowed.");
      err.status = 415;
      cb(err);
    }
  },
});

const router = Router();

function parseProfile(row) {
  if (!row) return null;
  return {
    ...row,
    theme_mode: row.theme_mode === "dark" ? "dark" : "light",
    show_spotify_status: Boolean(row.show_spotify_status),
    appearance: normalizeAppearance(row.appearance, row.theme_mode),
    socials: JSON.parse(row.socials || "{}"),
    links: JSON.parse(row.links || "[]"),
  };
}

function sanitizeText(str, maxLen) {
  return String(str ?? "").trim().slice(0, maxLen);
}

function normalizePublicUrl(value, maxLen) {
  const candidate = sanitizeText(value, maxLen);
  if (!candidate) return "";

  try {
    const url = new URL(candidate);
    return ["http:", "https:"].includes(url.protocol) ? url.href : "";
  } catch {
    return "";
  }
}

function detectImageType(buffer) {
  if (!buffer || buffer.length < 12) return null;

  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { ext: "jpg", mime: "image/jpeg" };
  }

  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return { ext: "png", mime: "image/png" };
  }

  const header = buffer.subarray(0, 6).toString("ascii");
  if (header === "GIF87a" || header === "GIF89a") {
    return { ext: "gif", mime: "image/gif" };
  }

  const riff = buffer.subarray(0, 4).toString("ascii");
  const webp = buffer.subarray(8, 12).toString("ascii");
  if (riff === "RIFF" && webp === "WEBP") {
    return { ext: "webp", mime: "image/webp" };
  }

  return null;
}

const MAX_LINKS = 20;
const ALLOWED_SOCIALS = new Set(["github","instagram","youtube","spotify","steam","x","discord","linkedin","tiktok"]);
const ALLOWED_COLORS  = new Set(["green","blue","red","pink","cyan","yellow","purple","default"]);
const ALLOWED_THEME_IDS = new Set(["sunset", "midnight", "mint", "graphite"]);
const ALLOWED_BACKGROUND_STYLES = new Set(["grid", "spotlight", "mesh", "minimal"]);
const ALLOWED_CARD_STYLES = new Set(["soft", "outline", "glass"]);
const DEFAULT_APPEARANCE = {
  theme_id: "sunset",
  background_style: "grid",
  card_style: "soft",
};
const USERNAME_RE = /^[a-z0-9_-]{3,30}$/;

function normalizeAppearance(rawValue, themeMode = "light") {
  let parsed = {};

  try {
    parsed = JSON.parse(rawValue || "{}");
  } catch {
    parsed = {};
  }

  const fallbackTheme = themeMode === "dark" ? "midnight" : "sunset";

  return {
    theme_id: ALLOWED_THEME_IDS.has(parsed?.theme_id) ? parsed.theme_id : fallbackTheme,
    background_style: ALLOWED_BACKGROUND_STYLES.has(parsed?.background_style)
      ? parsed.background_style
      : DEFAULT_APPEARANCE.background_style,
    card_style: ALLOWED_CARD_STYLES.has(parsed?.card_style)
      ? parsed.card_style
      : DEFAULT_APPEARANCE.card_style,
  };
}

function readPrivateProfile(userId) {
  return db
    .prepare("SELECT p.*, u.username FROM profiles p JOIN users u ON u.id = p.user_id WHERE p.user_id = ?")
    .get(userId);
}

function readPublicProfile(userId) {
  return db
    .prepare("SELECT p.display_name, p.bio, p.avatar_url, p.discord_id, p.theme_mode, p.show_spotify_status, p.appearance, p.socials, p.links, p.updated_at, u.username FROM profiles p JOIN users u ON u.id = p.user_id WHERE p.user_id = ?")
    .get(userId);
}

function bumpDailyStat(userId, field) {
  if (!["views", "link_clicks", "social_clicks"].includes(field)) return;

  db.prepare(`
    INSERT INTO profile_daily_stats (user_id, day, ${field})
    VALUES (?, date('now'), 1)
    ON CONFLICT(user_id, day)
    DO UPDATE SET ${field} = ${field} + 1
  `).run(userId);
}

router.get("/me", requireAuth, (req, res) => {
  const profile = readPrivateProfile(req.user.id);
  res.json({ profile: parseProfile(profile) });
});

router.get("/me/insights", requireAuth, (req, res) => {
  const last30 = db.prepare(`
    SELECT day, views, link_clicks, social_clicks
    FROM profile_daily_stats
    WHERE user_id = ? AND day >= date('now', '-29 days')
    ORDER BY day ASC
  `).all(req.user.id);

  const totals = db.prepare(`
    SELECT
      COALESCE(SUM(views), 0) AS views,
      COALESCE(SUM(link_clicks), 0) AS link_clicks,
      COALESCE(SUM(social_clicks), 0) AS social_clicks
    FROM profile_daily_stats
    WHERE user_id = ?
  `).get(req.user.id);

  const today = db.prepare(`
    SELECT
      COALESCE(views, 0) AS views,
      COALESCE(link_clicks, 0) AS link_clicks,
      COALESCE(social_clicks, 0) AS social_clicks
    FROM profile_daily_stats
    WHERE user_id = ? AND day = date('now')
  `).get(req.user.id) || { views: 0, link_clicks: 0, social_clicks: 0 };

  res.json({
    insights: {
      totals,
      today,
      last30,
    },
  });
});

router.put("/me", requireAuth, (req, res) => {
  const { display_name, bio, discord_id, theme_mode, show_spotify_status, appearance, socials, links } = req.body ?? {};

  const cleanName    = sanitizeText(display_name, 60);
  const cleanBio     = sanitizeText(bio, 280);
  const cleanDiscord = sanitizeText(discord_id, 30).replace(/\D/g, "");

  const cleanAppearance = normalizeAppearance(JSON.stringify(appearance || {}), theme_mode);

  const cleanSocials = {};
  if (socials && typeof socials === "object") {
    for (const [k, v] of Object.entries(socials)) {
      const url = normalizePublicUrl(v, 200);
      if (ALLOWED_SOCIALS.has(k) && url) {
        cleanSocials[k] = url;
      }
    }
  }

  const cleanLinks = [];
  if (Array.isArray(links)) {
    for (const link of links.slice(0, MAX_LINKS)) {
      if (!link || typeof link !== "object") continue;

      cleanLinks.push({
        title:       sanitizeText(link.title, 80),
        description: sanitizeText(link.description, 160),
        url:         normalizePublicUrl(link.url, 500),
        color:       ALLOWED_COLORS.has(link.color) ? link.color : "default",
      });
    }
  }

  db.prepare(`
    UPDATE profiles SET
      display_name = ?, bio = ?, discord_id = ?,
      theme_mode = ?, show_spotify_status = ?, appearance = ?, socials = ?, links = ?, updated_at = datetime('now')
    WHERE user_id = ?
  `).run(
    cleanName,
    cleanBio,
    cleanDiscord,
    cleanAppearance.theme_id === "midnight" || cleanAppearance.theme_id === "graphite" ? "dark" : "light",
    show_spotify_status ? 1 : 0,
    JSON.stringify(cleanAppearance),
    JSON.stringify(cleanSocials),
    JSON.stringify(cleanLinks),
    req.user.id,
  );

  const profile = readPrivateProfile(req.user.id);
  res.json({ profile: parseProfile(profile) });
});

router.delete("/me/avatar", requireAuth, async (req, res) => {
  const existing = db.prepare("SELECT avatar_url FROM profiles WHERE user_id = ?").get(req.user.id);
  if (!existing?.avatar_url) return res.status(404).json({ error: "No avatar to delete." });

  await deleteFromR2(existing.avatar_url);
  db.prepare("UPDATE profiles SET avatar_url = '' WHERE user_id = ?").run(req.user.id);
  res.json({ avatar_url: "" });
});

router.post("/me/avatar", requireAuth, upload.single("avatar"), async (req, res, next) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded." });

  try {
    const detected = detectImageType(req.file.buffer);
    if (!detected || detected.mime !== req.file.mimetype) {
      return res.status(415).json({ error: "Invalid image file." });
    }

    // Delete old avatar from R2 if it exists
    const existing = db.prepare("SELECT avatar_url FROM profiles WHERE user_id = ?").get(req.user.id);
    if (existing?.avatar_url) {
      await deleteFromR2(existing.avatar_url);
    }

    const filename = `avatars/${req.user.id}_${Date.now()}.${detected.ext}`;
    const avatarUrl = await uploadToR2(req.file.buffer, filename, detected.mime);

    db.prepare("UPDATE profiles SET avatar_url = ? WHERE user_id = ?").run(avatarUrl, req.user.id);
    res.json({ avatar_url: avatarUrl });
  } catch (err) {
    next(err);
  }
});

router.get("/:username", (req, res) => {
  const username = req.params.username.toLowerCase().trim();
  if (!USERNAME_RE.test(username)) {
    return res.status(404).json({ error: "Profile not found." });
  }

  const user = db.prepare("SELECT id FROM users WHERE username = ?").get(username);
  if (!user) return res.status(404).json({ error: "Profile not found." });

  bumpDailyStat(user.id, "views");
  const profile = readPublicProfile(user.id);
  res.json({ profile: parseProfile(profile) });
});

router.get("/:username/out", (req, res) => {
  const username = req.params.username.toLowerCase().trim();
  if (!USERNAME_RE.test(username)) {
    return res.status(404).send("Profile not found.");
  }

  const user = db.prepare("SELECT id FROM users WHERE username = ?").get(username);
  if (!user) return res.status(404).send("Profile not found.");

  const profile = parseProfile(readPublicProfile(user.id));
  const type = String(req.query.type || "").trim();

  if (type === "link") {
    const index = Number.parseInt(String(req.query.index ?? ""), 10);
    if (!Number.isInteger(index) || index < 0 || index >= profile.links.length) {
      return res.status(404).send("Link not found.");
    }

    const href = profile.links[index]?.url;
    if (!href) return res.status(404).send("Link not found.");

    bumpDailyStat(user.id, "link_clicks");
    return res.redirect(302, href);
  }

  if (type === "social") {
    const key = String(req.query.key || "").trim();
    const href = profile.socials?.[key];
    if (!href) return res.status(404).send("Link not found.");

    bumpDailyStat(user.id, "social_clicks");
    return res.redirect(302, href);
  }

  return res.status(400).send("Invalid link type.");
});

export default router;
