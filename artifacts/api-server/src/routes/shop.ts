import { Router } from "express";
import db from "../db/database.js";
import { emitToUser } from "../lib/socket.js";
import { requireAuth, type AuthRequest } from "../middleware/auth.js";
import { pickRandomN, type PlayerBaseRow } from "../lib/gameUtils.js";

const router = Router();

// All shop routes require authentication
router.use(requireAuth);

// ─── Pack definitions ─────────────────────────────────────────────────────────

const PACK_CONFIG = {
  random_1:   { count: 1, cost: 500,  pool: "mixed",    label: "Random Pack (1 Card)" },
  random_3:   { count: 3, cost: 1200, pool: "mixed",    label: "Random Pack (3 Cards)" },
  shooter_1:  { count: 1, cost: 700,  pool: "shooter",  label: "Shooter Pack (1 Card)" },
  shooter_3:  { count: 3, cost: 1800, pool: "shooter",  label: "Shooter Pack (3 Cards)" },
  gk_1:       { count: 1, cost: 700,  pool: "gk",       label: "GK Pack (1 Card)" },
  gk_3:       { count: 3, cost: 1800, pool: "gk",       label: "GK Pack (3 Cards)" },
} as const;

type PackType = keyof typeof PACK_CONFIG;

// ─── GET /api/shop/packs ──────────────────────────────────────────────────────

/**
 * List all available pack types with prices.
 */
router.get("/packs", (_req, res) => {
  const packs = Object.entries(PACK_CONFIG).map(([id, cfg]) => ({
    packId:     id,
    label:      cfg.label,
    cardCount:  cfg.count,
    cost:       cfg.cost,
    pool:       cfg.pool,
    currency:   "coins",
  }));
  res.json({ packs });
});

// ─── POST /api/shop/buy ───────────────────────────────────────────────────────

/**
 * Purchase a gacha pack.
 * Body: { packType: "random_1" | "random_3" | "shooter_1" | "shooter_3" | "gk_1" | "gk_3" }
 * Requires: Authorization: Bearer <token>
 *
 * Atomically:
 *   1. Verify the user has enough coins.
 *   2. Deduct the cost.
 *   3. Draw random cards from the appropriate pool.
 *   4. Insert drawn cards into user_inventory.
 *   5. Emit a real-time event to the user's socket room.
 *
 * Returns: { coinsSpent, coinsRemaining, cards: [...] }
 */
router.post("/buy", (req: AuthRequest, res) => {
  const userId   = req.userId!;
  const { packType } = req.body as { packType?: string };

  if (!packType || !(packType in PACK_CONFIG)) {
    res.status(400).json({
      error:           "Invalid packType",
      validPackTypes:  Object.keys(PACK_CONFIG),
    });
    return;
  }

  const pack = PACK_CONFIG[packType as PackType];

  // ── Fetch eligible player pool ──────────────────────────────────────────────
  let poolQuery: string;
  if (pack.pool === "shooter") {
    poolQuery = "SELECT * FROM players_base WHERE is_gk = 0";
  } else if (pack.pool === "gk") {
    poolQuery = "SELECT * FROM players_base WHERE is_gk = 1";
  } else {
    poolQuery = "SELECT * FROM players_base";
  }

  const pool = db.prepare(poolQuery).all() as PlayerBaseRow[];

  if (pool.length === 0) {
    res.status(500).json({ error: "Card pool is empty — run the seed script" });
    return;
  }

  // ── Atomic transaction ──────────────────────────────────────────────────────
  const buyTx = db.transaction(() => {
    const user = db
      .prepare("SELECT coins FROM users WHERE id = ?")
      .get(userId) as { coins: number } | undefined;

    if (!user) throw new Error("USER_NOT_FOUND");

    if (user.coins < pack.cost) {
      throw new Error(`INSUFFICIENT_COINS:${user.coins}:${pack.cost}`);
    }

    const newCoins = user.coins - pack.cost;
    db.prepare("UPDATE users SET coins = ? WHERE id = ?").run(newCoins, userId);

    // Draw cards
    const drawn = pickRandomN(pool, pack.count);

    const insertInventory = db.prepare(
      "INSERT INTO user_inventory (user_id, player_id) VALUES (?, ?)",
    );
    for (const card of drawn) {
      insertInventory.run(userId, card.id);
    }

    return { newCoins, drawn };
  });

  try {
    const { newCoins, drawn } = buyTx();

    const cards = drawn.map((c) => ({
      playerId:  c.id,
      name:      c.name,
      initials:  c.initials,
      position:  c.position,
      country:   c.country,
      club:      c.club,
      isGK:      c.is_gk === 1,
      fk:        c.fk,
      pk:        c.pk,
      fks:       c.fks,
      pks:       c.pks,
    }));

    // Real-time notification to the user
    emitToUser(userId, "pack:opened", {
      packType,
      coinsSpent:      pack.cost,
      coinsRemaining:  newCoins,
      cards,
    });
    emitToUser(userId, "coins:updated", {
      coins:  newCoins,
      reason: "pack_purchase",
    });

    res.json({
      packType,
      packLabel:       pack.label,
      coinsSpent:      pack.cost,
      coinsRemaining:  newCoins,
      cardsReceived:   cards.length,
      cards,
    });
  } catch (err: unknown) {
    if (err instanceof Error) {
      if (err.message === "USER_NOT_FOUND") {
        res.status(404).json({ error: "User not found" });
        return;
      }
      if (err.message.startsWith("INSUFFICIENT_COINS")) {
        const [, have, need] = err.message.split(":");
        res.status(402).json({
          error:      "Not enough coins",
          coinsHave:  Number(have),
          coinsNeed:  Number(need),
          shortfall:  Number(need) - Number(have),
        });
        return;
      }
    }
    throw err;
  }
});

// ─── GET /api/shop/nerf-preview ───────────────────────────────────────────────

/**
 * Preview the Universal Nerf Rule for a given player.
 * Query param: ?playerId=<id>
 *
 * Returns effective shooting stats for any player after nerf is applied.
 * Useful for clients to show "equipped GK as shooter" warnings.
 */
router.get("/nerf-preview", (req: AuthRequest, res) => {
  const playerId = parseInt(String(req.query["playerId"]), 10);

  if (!playerId || isNaN(playerId)) {
    res.status(400).json({ error: "playerId query param is required" });
    return;
  }

  const player = db
    .prepare("SELECT * FROM players_base WHERE id = ?")
    .get(playerId) as PlayerBaseRow | undefined;

  if (!player) {
    res.status(404).json({ error: "Player not found" });
    return;
  }

  // Import lazily to avoid circular issues
  import("../lib/gameUtils.js").then(({ applyNerfRule }) => {
    const effective = applyNerfRule(player);
    res.json({
      player: {
        id:       player.id,
        name:     player.name,
        isGK:     player.is_gk === 1,
        rawStats: {
          fk: player.fk, pk: player.pk, fks: player.fks, pks: player.pks,
        },
      },
      effectiveShooterStats: effective,
    });
  }).catch(() => {
    res.status(500).json({ error: "Internal error applying nerf rule" });
  });
});

export default router;
