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

/**
 * Grants a position-perfect 11-card starter pack atomically.
 * Composition: 1 GK (silver) + 9 silver outfield + 1 Gold ST = 11 cards total.
 * Silver = bench pool. Gold = main Gold pool.
 * Must be called inside a db.transaction.
 */
function grantStarterPack(userId: number): void {
  const insertInv = db.prepare(
    "INSERT INTO user_inventory (user_id, player_id) VALUES (?,?)",
  );

  /** Draw from the bench (silver) pool for a given tactical position. */
  function drawSilver(tacticalPos: string, limit: number): number[] {
    const rows = db
      .prepare(
        `SELECT id FROM players_base
         WHERE is_bench_pool=1 AND tactical_position=?
         ORDER BY RANDOM() LIMIT ?`,
      )
      .all(tacticalPos, limit) as Array<{ id: number }>;
    return rows.map((r) => r.id);
  }

  /** Draw from the main Gold pool for a given tactical position. */
  function drawGold(tacticalPos: string, limit: number): number[] {
    const rows = db
      .prepare(
        `SELECT id FROM players_base
         WHERE is_bench_pool=0 AND is_gk=0 AND tactical_position=?
         ORDER BY RANDOM() LIMIT ?`,
      )
      .all(tacticalPos, limit) as Array<{ id: number }>;
    return rows.map((r) => r.id);
  }

  /** Draw 2 midfielders from any mix of CM / CDM / CAM bench pool players. */
  function drawSilverMids(): number[] {
    const rows = db
      .prepare(
        `SELECT id FROM players_base
         WHERE is_bench_pool=1 AND tactical_position IN ('CM','CDM','CAM')
         ORDER BY RANDOM() LIMIT 2`,
      )
      .all() as Array<{ id: number }>;
    return rows.map((r) => r.id);
  }

  const playerIds: number[] = [];

  // Silver slots (bench pool)
  playerIds.push(...drawSilver("GK", 1));   // 1 GK
  playerIds.push(...drawSilver("CB", 2));   // 2 CB
  playerIds.push(...drawSilver("RB", 1));   // 1 RB
  playerIds.push(...drawSilver("LB", 1));   // 1 LB
  playerIds.push(...drawSilver("CM", 1));   // 1 CM
  playerIds.push(...drawSilver("RW", 1));   // 1 RW
  playerIds.push(...drawSilver("LW", 1));   // 1 LW
  playerIds.push(...drawSilverMids());       // 2 from CM/CDM/CAM mix

  // Gold slot (main Gold pool)
  const goldST = drawGold("ST", 1);
  playerIds.push(...goldST);                // 1 Gold ST

  // Guard: ensure exactly 11 cards were drawn before committing
  const expectedCards = 11;
  if (playerIds.length !== expectedCards) {
    throw new Error(
      `STARTER_PACK_INCOMPLETE: expected ${expectedCards} cards, got ${playerIds.length}. ` +
      `Check that the bench pool and Gold pool are seeded.`,
    );
  }

  // Insert all into inventory (11 total: 10 silver + 1 gold)
  for (const playerId of playerIds) {
    insertInv.run(userId, playerId);
  }

  logger.info({ userId, cards: playerIds.length, goldCards: goldST.length }, "Starter pack granted (1 Gold ST + 10 Silver)");

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
             pb.club, pb.country, pb.is_bench_pool
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

// ─── DELETE /api/auth/account ─────────────────────────────────────────────────

router.delete("/account", requireAuth, (req: AuthRequest, res) => {
  const userId = req.userId!;

  const deleteTx = db.transaction(() => {
    // ── 1. Active listings where this user is the SELLER ───────────────────────
    //    seller_id is NOT NULL, so we must DELETE these rows (SET NULL is invalid).
    //    First refund any current bidders on active auctions.
    const activeSellerListings = db
      .prepare(
        "SELECT current_bidder_id, current_bid FROM market_listings WHERE seller_id=? AND resolved=0",
      )
      .all(userId) as Array<{ current_bidder_id: number | null; current_bid: number }>;

    for (const row of activeSellerListings) {
      if (row.current_bidder_id) {
        db.prepare("UPDATE users SET coins=coins+? WHERE id=?")
          .run(row.current_bid, row.current_bidder_id);
      }
    }

    // Unmark seller's listed inventory items (inventory cascade-deletes with user, but good hygiene)
    db.prepare("UPDATE user_inventory SET is_listed=0 WHERE user_id=? AND is_listed=1").run(userId);

    // Delete ALL market_listings rows where user is seller (active + historical)
    db.prepare("DELETE FROM market_listings WHERE seller_id=?").run(userId);

    // ── 2. Listings where this user is the BIDDER (active or historical) ───────
    //    User's coins are already gone when they bid; since the account is being deleted
    //    we drop their bidder reference and reset to the listing's starting price.
    db.prepare(
      "UPDATE market_listings SET current_bidder_id=NULL, current_bid=starting_bid WHERE current_bidder_id=?",
    ).run(userId);

    // ── 3. Delete user — CASCADE handles sessions, user_inventory, user_squads, squad_slots ─
    db.prepare("DELETE FROM users WHERE id=?").run(userId);
  });

  try {
    deleteTx();
    res.json({ success: true, message: "Account deleted successfully." });
  } catch (err) {
    logger.error({ err }, "Failed to delete account");
    res.status(500).json({ error: "Failed to delete account" });
  }
});

export default router;
