import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import db from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { deleteFromR2 } from "../lib/r2.js";
import { clearSessionCookie, extractSessionToken, setSessionCookie, signSessionToken } from "../lib/session.js";

const router = Router();

const USERNAME_RE = /^[a-z0-9_-]{3,30}$/;

const RESERVED = new Set([
  "admin","administrator","root","api","auth","me","u","user","users","profile",
  "profiles","login","logout","register","signup","settings","account","dashboard",
  "builder","static","assets","uploads","public","support","help","about","contact",
  "terms","privacy","legal","linkpage","trazlinks","trazhub","trazz","garv","mod","moderator","staff",
]);

router.post("/register", async (req, res) => {
  const { email, username, password } = req.body ?? {};

  if (!email || !username || !password)
    return res.status(400).json({ error: "All fields are required." });

  const cleanUsername = username.toLowerCase().trim();
  const cleanEmail    = email.toLowerCase().trim();

  if (!USERNAME_RE.test(cleanUsername))
    return res.status(400).json({ error: "Username must be 3-30 lowercase letters, numbers, _ or -" });
  if (RESERVED.has(cleanUsername))
    return res.status(400).json({ error: "That username is reserved." });
  if (!cleanEmail.includes("@") || cleanEmail.length > 254)
    return res.status(400).json({ error: "Enter a valid email address." });
  if (password.length < 8)
    return res.status(400).json({ error: "Password must be at least 8 characters." });
  if (password.length > 128)
    return res.status(400).json({ error: "Password too long." });

  const hash = await bcrypt.hash(password, 12);

  try {
    const user = db
      .prepare("INSERT INTO users (email, username, password_hash) VALUES (?, ?, ?) RETURNING id, email, username")
      .get(cleanEmail, cleanUsername, hash);

    db.prepare("INSERT INTO profiles (user_id) VALUES (?)").run(user.id);

    const token = signSessionToken(user);
    setSessionCookie(res, token);
    res.status(201).json({ user: { id: user.id, email: user.email, username: user.username } });
  } catch (err) {
    if (err.message?.includes("UNIQUE")) {
      return res.status(409).json({ error: "That account information is already in use." });
    }
    console.error("Register error:", err);
    res.status(500).json({ error: "Registration failed. Please try again." });
  }
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body ?? {};
  if (!email || !password) return res.status(400).json({ error: "Email and password are required." });

  const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email.toLowerCase().trim());

  if (user?.locked_until && new Date(user.locked_until) > new Date()) {
    return res.status(429).json({ error: "Account temporarily locked. Try again later." });
  }

  const hash = user?.password_hash ?? "$2b$12$invalidhashpaddingtopreventinitiming";
  const ok   = await bcrypt.compare(password, hash);

  if (!user || !ok) {
    if (user) {
      const newAttempts = (user.failed_login_attempts ?? 0) + 1;
      if (newAttempts >= 10) {
        db.prepare("UPDATE users SET failed_login_attempts = ?, locked_until = datetime('now', '+15 minutes') WHERE id = ?").run(newAttempts, user.id);
      } else {
        db.prepare("UPDATE users SET failed_login_attempts = ? WHERE id = ?").run(newAttempts, user.id);
      }
    }
    return res.status(401).json({ error: "Invalid email or password." });
  }

  db.prepare("UPDATE users SET failed_login_attempts = 0, locked_until = NULL WHERE id = ?").run(user.id);

  const token = signSessionToken(user);
  setSessionCookie(res, token);
  res.json({ user: { id: user.id, email: user.email, username: user.username } });
});

router.get("/me", (req, res) => {
  const token = extractSessionToken(req);
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ["HS256"],
    });
    const user = db.prepare("SELECT id, email, username FROM users WHERE id = ?").get(payload.id);
    if (!user) return res.status(404).json({ error: "User not found." });
    res.json({ user });
  } catch {
    res.status(401).json({ error: "Invalid or expired token." });
  }
});

router.post("/logout", requireAuth, (_req, res) => {
  db.prepare("UPDATE users SET token_version = token_version + 1 WHERE id = ?").run(_req.user.id);
  clearSessionCookie(res);
  res.json({ message: "Signed out." });
});

// Account management (all require auth)

router.put("/email", requireAuth, async (req, res) => {
  const { email, password } = req.body ?? {};
  if (!email || !password) return res.status(400).json({ error: "Email and current password are required." });

  const cleanEmail = email.toLowerCase().trim();
  if (!cleanEmail.includes("@") || cleanEmail.length > 254)
    return res.status(400).json({ error: "Enter a valid email address." });

  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(req.user.id);
  const ok   = await bcrypt.compare(password, user.password_hash);
  if (!ok) return res.status(401).json({ error: "Current password is incorrect." });

  try {
    db.prepare("UPDATE users SET email = ? WHERE id = ?").run(cleanEmail, req.user.id);
    db.prepare("UPDATE users SET token_version = token_version + 1 WHERE id = ?").run(req.user.id);
    const freshUser = db.prepare("SELECT id, username, token_version FROM users WHERE id = ?").get(req.user.id);
    setSessionCookie(res, signSessionToken(freshUser));
    res.json({ message: "Email updated." });
  } catch (err) {
    if (err.message?.includes("UNIQUE")) return res.status(409).json({ error: "That email is already in use." });
    res.status(500).json({ error: "Failed to update email." });
  }
});

router.put("/password", requireAuth, async (req, res) => {
  const { current_password, new_password } = req.body ?? {};
  if (!current_password || !new_password)
    return res.status(400).json({ error: "Both current and new password are required." });
  if (new_password.length < 8)
    return res.status(400).json({ error: "New password must be at least 8 characters." });
  if (new_password.length > 128)
    return res.status(400).json({ error: "New password too long." });

  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(req.user.id);
  const ok   = await bcrypt.compare(current_password, user.password_hash);
  if (!ok) return res.status(401).json({ error: "Current password is incorrect." });

  const hash = await bcrypt.hash(new_password, 12);
  db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(hash, req.user.id);
  db.prepare("UPDATE users SET token_version = token_version + 1 WHERE id = ?").run(req.user.id);
  const freshUser = db.prepare("SELECT id, username, token_version FROM users WHERE id = ?").get(req.user.id);
  setSessionCookie(res, signSessionToken(freshUser));
  res.json({ message: "Password updated." });
});

router.delete("/account", requireAuth, async (req, res) => {
  const { password } = req.body ?? {};
  if (!password) return res.status(400).json({ error: "Password is required to delete your account." });

  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(req.user.id);
  const ok   = await bcrypt.compare(password, user.password_hash);
  if (!ok) return res.status(401).json({ error: "Incorrect password." });

  // Clean up R2 avatar if present
  const profile = db.prepare("SELECT avatar_url FROM profiles WHERE user_id = ?").get(req.user.id);
  if (profile?.avatar_url) await deleteFromR2(profile.avatar_url);

  // Cascade deletes profile via FK
  db.prepare("DELETE FROM users WHERE id = ?").run(req.user.id);
  clearSessionCookie(res);
  res.json({ message: "Account deleted." });
});

export default router;
