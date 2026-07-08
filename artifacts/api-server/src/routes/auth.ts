import { Router } from "express";
import crypto from "node:crypto";
import db from "../db/database.js";
import { emitToUser } from "../lib/socket.js";
import { requireAuth, type AuthRequest } from "../middleware/auth.js";
import { logger } from "../lib/logger.js";

const router = Router();

// ─── Helpers ──────────────────────────────────────────────────────────────────

function hashPassword(password: string, salt: string): string {
  return crypto.scryptSync(password, salt, 64).toString("hex");
}

function generateToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

// ─── Starter Pack ─────────────────────────────────────────────────────────────

const MID_ROLL_OPTIONS: Array<{ positions: string[]; counts: number[] }> = [
  { positions: ["CM"],         counts: [2] },   // 2 CM
  { positions: ["CDM"],        counts: [2] },   // 2 CDM
  { positions: ["CM", "CAM"], counts: [1, 1] }, // 1 CM + 1 CAM
];

/**
 * Grants a position-perfect 11-card starter pack atomically.
 * Draws from the bench pool exclusively.
 * Must be called inside a db.transaction.
 */
function grantStarterPack(userId: number): void {
  const insertInv = db.prepare(
    "INSERT INTO user_inventory (user_id, player_id) VALUES (?,?)",
  );

  function drawFromPool(tacticalPos: string, limit: number): number[] {
    const rows = db
      .prepare(
        `SELECT id FROM players_base
         WHERE is_bench_pool=1 AND tactical_position=?
         ORDER BY RANDOM() LIMIT ?`,
      )
      .all(tacticalPos, limit) as Array<{ id: number }>;
    return rows.map((r) => r.id);
  }

  const playerIds: number[] = [];

  // Fixed slots
  playerIds.push(...drawFromPool("GK",  1));
  playerIds.push(...drawFromPool("CB",  2));
  playerIds.push(...drawFromPool("RB",  1));
  playerIds.push(...drawFromPool("LB",  1));
  playerIds.push(...drawFromPool("ST",  1));
  playerIds.push(...drawFromPool("RW",  1));
  playerIds.push(...drawFromPool("LW",  1));

  // Midfield dynamic mix
  const roll = MID_ROLL_OPTIONS[Math.floor(Math.random() * MID_ROLL_OPTIONS.length)]!;
  for (let i = 0; i < roll.positions.length; i++) {
    playerIds.push(...drawFromPool(roll.positions[i]!, roll.counts[i]!));
  }

  // Insert all into inventory (should always be 11, but guard gracefully)
  for (const playerId of playerIds) {
    insertInv.run(userId, playerId);
  }

  logger.info({ userId, cards: playerIds.length, midMix: roll.positions }, "Starter pack granted");

  db.prepare("UPDATE users SET has_starter_pack=1 WHERE id=?").run(userId);
}

// ─── POST /api/auth/register ──────────────────────────────────────────────────

router.post("/register", (req, res) => {
  const { username, password } = req.body as {
    username?: string;
    password?: string;
  };

  if (!username || !password) {
    res.status(400).json({ error: "username and password are required" });
    return;
  }
  if (username.trim().length < 3 || username.trim().length > 32) {
    res.status(400).json({ error: "username must be 3–32 characters" });
    return;
  }
  if (password.length < 6) {
    res.status(400).json({ error: "password must be at least 6 characters" });
    return;
  }

  const existing = db
    .prepare("SELECT id FROM users WHERE username = ?")
    .get(username.trim()) as { id: number } | undefined;
  if (existing) {
    res.status(409).json({ error: "Username already taken" });
    return;
  }

  const salt         = crypto.randomBytes(16).toString("hex");
  const passwordHash = hashPassword(password, salt);
  const token        = generateToken();

  const registerTx = db.transaction(() => {
    const result = db
      .prepare(
        `INSERT INTO users (username, password_hash, password_salt, coins)
         VALUES (?, ?, ?, 1000)`,
      )
      .run(username.trim(), passwordHash, salt);

    const userId = result.lastInsertRowid as number;

    db.prepare("INSERT INTO sessions (token, user_id) VALUES (?, ?)").run(token, userId);

    // Atomically grant starter pack on first registration
    grantStarterPack(userId);

    return userId;
  });

  const userId = registerTx();

  // Fetch starter pack cards to return in registration response
  const starterCards = db
    .prepare(`
      SELECT ui.id AS inventory_id, pb.name, pb.initials, pb.overall,
             pb.tactical_position, pb.is_gk, pb.fk, pb.pk, pb.fks, pb.pks,
             pb.club, pb.country
      FROM user_inventory ui
      JOIN players_base pb ON ui.player_id = pb.id
      WHERE ui.user_id=?
      ORDER BY ui.acquired_at ASC
    `)
    .all(userId) as unknown[];

  res.status(201).json({
    token,
    userId,
    username: username.trim(),
    coins:    1000,
    message:  "Account created — welcome bonus: 1000 coins + Free 11-Player Starter Pack!",
    starter_pack: starterCards,
  });
});

// ─── POST /api/auth/login ─────────────────────────────────────────────────────

router.post("/login", (req, res) => {
  const { username, password } = req.body as {
    username?: string;
    password?: string;
  };

  if (!username || !password) {
    res.status(400).json({ error: "username and password are required" });
    return;
  }

  const user = db
    .prepare(
      "SELECT id, username, password_hash, password_salt, coins FROM users WHERE username = ?",
    )
    .get(username.trim()) as
    | { id: number; username: string; password_hash: string; password_salt: string; coins: number }
    | undefined;

  if (!user) {
    res.status(401).json({ error: "Invalid username or password" });
    return;
  }

  const attempt = hashPassword(password, user.password_salt);
  if (attempt !== user.password_hash) {
    res.status(401).json({ error: "Invalid username or password" });
    return;
  }

  const token = generateToken();
  db.prepare("INSERT INTO sessions (token, user_id) VALUES (?, ?)").run(token, user.id);

  res.json({ token, userId: user.id, username: user.username, coins: user.coins });
});

// ─── POST /api/auth/logout ────────────────────────────────────────────────────

router.post("/logout", requireAuth, (req: AuthRequest, res) => {
  const authHeader = req.headers["authorization"] ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (token) {
    db.prepare("DELETE FROM sessions WHERE token=?").run(token);
  }
  res.json({ success: true });
});

// ─── POST /api/auth/daily-claim ───────────────────────────────────────────────

router.post("/daily-claim", requireAuth, (req: AuthRequest, res) => {
  const user = db
    .prepare("SELECT id, coins, last_daily_claim FROM users WHERE id=?")
    .get(req.userId!) as { id: number; coins: number; last_daily_claim: string | null } | undefined;

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const today = todayISO();
  if (user.last_daily_claim === today) {
    res.status(400).json({ error: "Daily reward already claimed today" });
    return;
  }

  const DAILY_COINS = 200;
  db.prepare("UPDATE users SET coins=coins+?, last_daily_claim=? WHERE id=?").run(
    DAILY_COINS, today, user.id,
  );

  const newCoins = user.coins + DAILY_COINS;
  emitToUser(user.id, "coins:updated", { coins: newCoins, reason: "daily_claim" });

  res.json({ awarded: DAILY_COINS, coins: newCoins });
});

export default router;
