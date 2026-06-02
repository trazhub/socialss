import jwt from "jsonwebtoken";

const SESSION_COOKIE = "trazlinks_session";
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

function parseCookies(header = "") {
  const cookies = {};

  for (const part of header.split(";")) {
    const trimmed = part.trim();
    if (!trimmed) continue;

    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;

    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    cookies[key] = decodeURIComponent(value);
  }

  return cookies;
}

export function extractSessionToken(req) {
  const cookies = parseCookies(req.headers.cookie);
  return cookies[SESSION_COOKIE] ?? null;
}

export function signSessionToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username },
    process.env.JWT_SECRET,
    { algorithm: "HS256", expiresIn: "30d" },
  );
}

export function setSessionCookie(res, token) {
  const secure = process.env.NODE_ENV === "production";
  const parts = [
    `${SESSION_COOKIE}=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${Math.floor(THIRTY_DAYS_MS / 1000)}`,
  ];

  if (secure) parts.push("Secure");

  res.setHeader("Set-Cookie", parts.join("; "));
}

export function clearSessionCookie(res) {
  const secure = process.env.NODE_ENV === "production";
  const parts = [
    `${SESSION_COOKIE}=`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    "Max-Age=0",
  ];

  if (secure) parts.push("Secure");

  res.setHeader("Set-Cookie", parts.join("; "));
}
