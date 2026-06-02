# TrazLinks

A link-in-bio page builder. Users sign up, build a profile (avatar, bio,
socials, and a list of custom links), and share it at `/u/<username>`.

## Stack

- **Frontend**: React 19 + Vite, React Router
- **Backend**: Express 5, SQLite (better-sqlite3), JWT auth, bcrypt
- **Storage**: Cloudflare R2 for avatar images (optional)

In production a single Express process serves the built frontend (`dist/`) and
the `/api`.

## Local development

Two processes: Vite (port 5173) proxies `/api` and `/uploads` to the Express
server (port 3001).

```bash
npm install
cat > .env <<'EOF'
JWT_SECRET=replace-with-a-long-random-secret-at-least-32-characters
PORT=3001
HOST=127.0.0.1
NODE_ENV=development
EOF
npm run dev:server          # terminal 1: API on :3001
npm run dev                 # terminal 2: Vite on :5173
```

## Production / deployment

```bash
npm install
npm run build               # -> dist/
npm start                   # NODE_ENV=production, serves everything on :3001
```

See **[DEPLOY.md](./DEPLOY.md)** for full VPS deployment steps.

## Environment variables

Minimum `.env`:

```bash
JWT_SECRET=replace-with-a-long-random-secret-at-least-32-characters
PORT=3001
HOST=127.0.0.1
NODE_ENV=production
```

Optional R2 variables:

```bash
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET=
R2_PUBLIC_URL=
```

`JWT_SECRET` is required. The `R2_*` vars are optional. Without them the app
runs, and avatar uploads fall back to local disk storage in `uploads/`.

For deployment diagnostics, `GET /api/health` returns JSON when the server is up.

## API

| Method | Path | Notes |
| ------ | ---- | ----- |
| POST | `/api/auth/register` | email, username, password |
| POST | `/api/auth/login` | |
| GET | `/api/auth/me` | bearer token |
| PUT | `/api/auth/email`, `/api/auth/password` | auth |
| DELETE | `/api/auth/account` | auth |
| GET | `/api/profile/me` | auth |
| PUT | `/api/profile/me` | auth |
| POST | `/api/profile/me/avatar` | auth, multipart |
| GET | `/api/profile/:username` | public |
| GET | `/api/health` | deployment health check |
