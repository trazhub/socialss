import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import authRoutes from "./routes/auth.js";
import profileRoutes from "./routes/profile.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;
const isProd = process.env.NODE_ENV === "production";
const HOST = process.env.HOST || (isProd ? "127.0.0.1" : "0.0.0.0");
const allowedOrigin = process.env.PUBLIC_ORIGIN;

app.disable("x-powered-by");

// Behind a reverse proxy in production, trust the first hop so rate limiting and
// req.ip use the real client IP from X-Forwarded-For.
if (isProd) app.set("trust proxy", 1);

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  console.error("FATAL: JWT_SECRET must be set and at least 32 characters.");
  process.exit(1);
}

// Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      baseUri: ["'self'"],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
      formAction: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: ["'self'", "https://api.lanyard.rest", "https://lanyard.cnrad.dev"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// CORS: in prod the frontend is served by the same Express server, no CORS needed.
// In dev, Vite runs on a different port.
if (!isProd) {
  app.use(cors({ origin: "http://localhost:5173", credentials: true }));
}

app.use((req, res, next) => {
  if (req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS") {
    return next();
  }

  const origin = req.headers.origin;
  const host = req.headers.host;
  const expected = allowedOrigin || `${req.protocol}://${host}`;

  if (!origin || origin === expected) return next();

  return res.status(403).json({ error: "Cross-site request blocked." });
});

// Body parsing with size limit
app.use(express.json({ limit: "64kb" }));
app.use("/uploads", express.static(join(__dirname, "..", "uploads"), {
  maxAge: "1d",
  fallthrough: false,
  setHeaders: (res) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Cross-Origin-Resource-Policy", "same-origin");
  },
}));

// Rate limiting: auth endpoints get strict limits, everything else is generous.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 20,
  message: { error: "Too many requests. Please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 min
  max: 120,
  message: { error: "Too many requests." },
  standardHeaders: true,
  legacyHeaders: false,
});

const uploadLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 min
  max: 12,
  message: { error: "Too many avatar uploads. Try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use("/api/auth", authLimiter);
app.use("/api", apiLimiter);
app.use("/api/profile/me/avatar", uploadLimiter);

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, env: isProd ? "production" : "development" });
});

app.use("/api/auth", authRoutes);
app.use("/api/profile", profileRoutes);

// Global error handler catches multer errors and anything else.
app.use((err, req, res, _next) => {
  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({ error: "File too large. Max 5 MB." });
  }
  if (err.status && err.status < 500) {
    return res.status(err.status).json({ error: err.message || "Request failed." });
  }
  console.error(err);
  res.status(500).json({ error: "Internal server error." });
});

// Serve React in production
if (isProd) {
  const distPath = join(__dirname, "..", "dist");
  app.use(express.static(distPath, { maxAge: "1d" }));
  // SPA fallback: send index.html for any non-API GET (Express 5 named wildcard).
  app.get("/*splat", (_, res) => res.sendFile(join(distPath, "index.html")));
}

app.listen(PORT, HOST, () => {
  console.log(`[trazlinks] Server running on http://${HOST}:${PORT} (${isProd ? "production" : "development"})`);
});
