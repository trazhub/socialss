import jwt from "jsonwebtoken";
import { extractSessionToken } from "../lib/session.js";
import db from "../db.js";

export function requireAuth(req, res, next) {
  const token = extractSessionToken(req);
  if (!token) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ["HS256"],
    });
    const dbUser = db.prepare("SELECT token_version FROM users WHERE id = ?").get(payload.id);
    if (!dbUser || dbUser.token_version !== (payload.tv ?? 0)) {
      return res.status(401).json({ error: "Session expired. Please sign in again." });
    }
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}
