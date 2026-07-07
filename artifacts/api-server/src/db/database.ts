import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";

// Store DB in workspace root /data so it persists across restarts
const DATA_DIR = path.resolve(process.cwd(), "data");
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, "game.db");

const db = new Database(DB_PATH);

// Performance + integrity pragmas
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");
db.pragma("synchronous = NORMAL");

// ─── Schema ───────────────────────────────────────────────────────────────────

db.exec(`
  CREATE TABLE IF NOT EXISTS players_base (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT    NOT NULL UNIQUE,  -- enforce no duplicates
    initials    TEXT    NOT NULL,
    position    TEXT    NOT NULL,
    country     TEXT    NOT NULL,
    club        TEXT    NOT NULL,
    is_gk       INTEGER NOT NULL DEFAULT 0,  -- 0=shooter, 1=goalkeeper
    -- Shooter stats (relevant when is_gk = 0)
    fk          INTEGER,  -- Free Kick shooting (1-99)
    pk          INTEGER,  -- Penalty Kick shooting (1-99)
    -- Goalkeeper stats (relevant when is_gk = 1)
    fks         INTEGER,  -- Free Kick Saving (1-99)
    pks         INTEGER   -- Penalty Kick Saving (1-99)
  );

  CREATE TABLE IF NOT EXISTS users (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    username         TEXT    NOT NULL UNIQUE COLLATE NOCASE,
    password_hash    TEXT    NOT NULL,
    password_salt    TEXT    NOT NULL,
    coins            INTEGER NOT NULL DEFAULT 1000,
    last_daily_claim TEXT    -- ISO date string YYYY-MM-DD of last claim
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token      TEXT    PRIMARY KEY,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TEXT    NOT NULL DEFAULT (datetime('now')),
    expires_at TEXT    NOT NULL DEFAULT (datetime('now', '+30 days'))
  );

  CREATE TABLE IF NOT EXISTS user_inventory (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    player_id   INTEGER NOT NULL REFERENCES players_base(id),
    acquired_at TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_sessions_user    ON sessions(user_id);
  CREATE INDEX IF NOT EXISTS idx_inventory_user   ON user_inventory(user_id);
  CREATE INDEX IF NOT EXISTS idx_inventory_player ON user_inventory(player_id);
`);

// ─── Migrate existing DB: add expires_at column if absent ─────────────────────
// Must run BEFORE creating the index on expires_at so the column exists first.

const hasExpiresAt = (
  db
    .prepare("PRAGMA table_info(sessions)")
    .all() as Array<{ name: string }>
).some((col) => col.name === "expires_at");

if (!hasExpiresAt) {
  db.exec(
    `ALTER TABLE sessions ADD COLUMN expires_at TEXT NOT NULL DEFAULT (datetime('now', '+30 days'))`,
  );
}

// Now safe to create the expiry index (column guaranteed to exist)
db.exec(`CREATE INDEX IF NOT EXISTS idx_sessions_expiry ON sessions(expires_at)`);

export default db;
