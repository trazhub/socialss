import Database from "better-sqlite3";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { mkdirSync } from "fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbDir = join(__dirname, "..", "db");
mkdirSync(dbDir, { recursive: true });

const db = new Database(join(dbDir, "app.db"));

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS profiles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    display_name TEXT DEFAULT '',
    bio TEXT DEFAULT '',
    avatar_url TEXT DEFAULT '',
    discord_id TEXT DEFAULT '',
    theme_mode TEXT DEFAULT 'light',
    show_spotify_status INTEGER DEFAULT 0,
    appearance TEXT DEFAULT '{}',
    socials TEXT DEFAULT '{}',
    links TEXT DEFAULT '[]',
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS profile_daily_stats (
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    day TEXT NOT NULL,
    views INTEGER NOT NULL DEFAULT 0,
    link_clicks INTEGER NOT NULL DEFAULT 0,
    social_clicks INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (user_id, day)
  );
`);

const profileColumns = db.prepare("PRAGMA table_info(profiles)").all();
if (!profileColumns.some((column) => column.name === "theme_mode")) {
  db.exec("ALTER TABLE profiles ADD COLUMN theme_mode TEXT DEFAULT 'light'");
}
if (!profileColumns.some((column) => column.name === "show_spotify_status")) {
  db.exec("ALTER TABLE profiles ADD COLUMN show_spotify_status INTEGER DEFAULT 0");
}
if (!profileColumns.some((column) => column.name === "appearance")) {
  db.exec("ALTER TABLE profiles ADD COLUMN appearance TEXT DEFAULT '{}'");
}

export default db;
