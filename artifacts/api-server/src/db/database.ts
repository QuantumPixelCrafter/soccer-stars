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
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    name              TEXT    NOT NULL UNIQUE,
    initials          TEXT    NOT NULL,
    position          TEXT    NOT NULL,
    country           TEXT    NOT NULL,
    club              TEXT    NOT NULL,
    is_gk             INTEGER NOT NULL DEFAULT 0,
    fk                INTEGER,
    pk                INTEGER,
    fks               INTEGER,
    pks               INTEGER,
    overall           INTEGER,
    tactical_position TEXT    NOT NULL DEFAULT 'ST',
    is_bench_pool     INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS users (
    id                   INTEGER PRIMARY KEY AUTOINCREMENT,
    username             TEXT    NOT NULL UNIQUE COLLATE NOCASE,
    password_hash        TEXT    NOT NULL,
    password_salt        TEXT    NOT NULL,
    coins                INTEGER NOT NULL DEFAULT 1000,
    last_daily_claim     TEXT,
    has_starter_pack     INTEGER NOT NULL DEFAULT 0
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
    acquired_at TEXT    NOT NULL DEFAULT (datetime('now')),
    is_listed   INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS user_squads (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    squad_type TEXT    NOT NULL CHECK(squad_type IN ('main','daily_objective')),
    updated_at TEXT    NOT NULL DEFAULT (datetime('now')),
    UNIQUE(user_id, squad_type)
  );

  CREATE TABLE IF NOT EXISTS squad_slots (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    squad_id     INTEGER NOT NULL REFERENCES user_squads(id) ON DELETE CASCADE,
    slot_key     TEXT    NOT NULL,
    inventory_id INTEGER REFERENCES user_inventory(id) ON DELETE SET NULL,
    UNIQUE(squad_id, slot_key)
  );

  CREATE TABLE IF NOT EXISTS market_listings (
    id                 INTEGER PRIMARY KEY AUTOINCREMENT,
    seller_id          INTEGER NOT NULL REFERENCES users(id),
    inventory_id       INTEGER NOT NULL UNIQUE REFERENCES user_inventory(id),
    player_id          INTEGER NOT NULL REFERENCES players_base(id),
    starting_bid       INTEGER NOT NULL,
    current_bid        INTEGER NOT NULL,
    current_bidder_id  INTEGER REFERENCES users(id),
    expires_at         INTEGER NOT NULL,
    resolved           INTEGER NOT NULL DEFAULT 0,
    created_at         TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS daily_objective_cache (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    date      TEXT    NOT NULL UNIQUE,
    formation TEXT    NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_sessions_user     ON sessions(user_id);
  CREATE INDEX IF NOT EXISTS idx_sessions_expiry   ON sessions(expires_at);
  CREATE INDEX IF NOT EXISTS idx_inventory_user    ON user_inventory(user_id);
  CREATE INDEX IF NOT EXISTS idx_inventory_player  ON user_inventory(player_id);
  CREATE INDEX IF NOT EXISTS idx_market_expires    ON market_listings(expires_at) WHERE resolved=0;
  CREATE INDEX IF NOT EXISTS idx_market_seller     ON market_listings(seller_id);
  CREATE INDEX IF NOT EXISTS idx_squad_slots       ON squad_slots(squad_id);
`);

// ─── Safe migrations for existing DBs ─────────────────────────────────────────

function columnExists(table: string, col: string): boolean {
  const rows = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
  return rows.some((r) => r.name === col);
}

// sessions.expires_at
if (!columnExists("sessions", "expires_at")) {
  db.exec(`ALTER TABLE sessions ADD COLUMN expires_at TEXT NOT NULL DEFAULT (datetime('now', '+30 days'))`);
}

// players_base extras
if (!columnExists("players_base", "overall")) {
  db.exec(`ALTER TABLE players_base ADD COLUMN overall INTEGER`);
  // Back-fill overall for existing rows
  db.exec(`
    UPDATE players_base SET overall = ROUND((fk + pk) / 2.0) WHERE is_gk = 0 AND overall IS NULL;
    UPDATE players_base SET overall = ROUND((fks + pks) / 2.0) WHERE is_gk = 1 AND overall IS NULL;
  `);
}
if (!columnExists("players_base", "tactical_position")) {
  db.exec(`ALTER TABLE players_base ADD COLUMN tactical_position TEXT NOT NULL DEFAULT 'FW'`);
  // Existing Gold Card GKs → 'GK'; FW players keep 'FW'; MF players get 'CM'
  db.exec(`
    UPDATE players_base SET tactical_position = 'GK' WHERE is_gk = 1;
    UPDATE players_base SET tactical_position = 'CM' WHERE is_gk = 0 AND position = 'MF';
  `);
}
if (!columnExists("players_base", "is_bench_pool")) {
  db.exec(`ALTER TABLE players_base ADD COLUMN is_bench_pool INTEGER NOT NULL DEFAULT 0`);
}

// users extras
if (!columnExists("users", "has_starter_pack")) {
  db.exec(`ALTER TABLE users ADD COLUMN has_starter_pack INTEGER NOT NULL DEFAULT 0`);
}

// user_inventory.is_listed
if (!columnExists("user_inventory", "is_listed")) {
  db.exec(`ALTER TABLE user_inventory ADD COLUMN is_listed INTEGER NOT NULL DEFAULT 0`);
}

export default db;
