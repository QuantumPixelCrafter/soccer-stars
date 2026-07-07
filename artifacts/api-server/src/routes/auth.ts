import { Router } from "express";
import crypto from "node:crypto";
import db from "../db/database.js";
import { emitToUser } from "../lib/socket.js";
import { requireAuth, type AuthRequest } from "../middleware/auth.js";

const router = Router();

// ─── Helpers ──────────────────────────────────────────────────────────────────

function hashPassword(password: string, salt: string): string {
  return crypto.scryptSync(password, salt, 64).toString("hex");
}

function generateToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

// ─── POST /api/auth/register ──────────────────────────────────────────────────

/**
 * Register a new account.
 * Body: { username: string, password: string }
 * Returns: { token, userId, username, coins }
 */
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

  // Check uniqueness
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

    db.prepare("INSERT INTO sessions (token, user_id) VALUES (?, ?)").run(
      token,
      userId,
    );

    return userId;
  });

  const userId = registerTx();

  res.status(201).json({
    token,
    userId,
    username: username.trim(),
    coins:    1000,
    message:  "Account created — welcome bonus: 1000 coins!",
  });
});

// ─── POST /api/auth/login ─────────────────────────────────────────────────────

/**
 * Log into an existing account.
 * Body: { username: string, password: string }
 * Returns: { token, userId, username, coins }
 */
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
    | {
        id:            number;
        username:      string;
        password_hash: string;
        password_salt: string;
        coins:         number;
      }
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

  // Issue a fresh session token
  const token = generateToken();
  db.prepare("INSERT INTO sessions (token, user_id) VALUES (?, ?)").run(
    token,
    user.id,
  );

  res.json({
    token,
    userId:   user.id,
    username: user.username,
    coins:    user.coins,
    message:  "Login successful",
  });
});

// ─── POST /api/auth/daily-claim ───────────────────────────────────────────────

/**
 * Claim the daily +200 coin login bonus.
 * Requires: Authorization: Bearer <token>
 * Returns: { coins, awarded, nextClaimAt }
 */
router.post("/daily-claim", requireAuth, (req: AuthRequest, res) => {
  const userId = req.userId!;
  const today  = todayISO();

  const user = db
    .prepare("SELECT coins, last_daily_claim FROM users WHERE id = ?")
    .get(userId) as { coins: number; last_daily_claim: string | null } | undefined;

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  if (user.last_daily_claim === today) {
    // Calculate when next claim is available (midnight UTC)
    const tomorrow = new Date();
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    tomorrow.setUTCHours(0, 0, 0, 0);

    res.status(429).json({
      error:       "Daily bonus already claimed today",
      nextClaimAt: tomorrow.toISOString(),
      coins:       user.coins,
    });
    return;
  }

  const newCoins = user.coins + 200;
  db.prepare(
    "UPDATE users SET coins = ?, last_daily_claim = ? WHERE id = ?",
  ).run(newCoins, today, userId);

  // Notify connected client in real-time
  emitToUser(userId, "coins:updated", { coins: newCoins, reason: "daily_claim" });

  const tomorrow = new Date();
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  tomorrow.setUTCHours(0, 0, 0, 0);

  res.json({
    awarded: 200,
    coins:   newCoins,
    nextClaimAt: tomorrow.toISOString(),
    message: "+200 daily login bonus claimed!",
  });
});

// ─── POST /api/auth/logout ────────────────────────────────────────────────────

/**
 * Invalidate the current session token.
 * Requires: Authorization: Bearer <token>
 */
router.post("/logout", requireAuth, (req: AuthRequest, res) => {
  const authHeader = req.headers["authorization"]!;
  const token      = authHeader.slice(7).trim();
  db.prepare("DELETE FROM sessions WHERE token = ?").run(token);
  res.json({ message: "Logged out successfully" });
});

export default router;
