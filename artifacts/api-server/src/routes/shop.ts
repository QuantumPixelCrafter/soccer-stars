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
  starter:   { count: 11, cost: 0,   pool: "bench",   label: "Free Starter Pack (11 Cards)", desc: "Claim your starting squad of 11 bench players — free for every new manager!" },
  random_1:  { count: 1, cost: 500,  pool: "mixed",   label: "Random Pack (1 Card)",  desc: "One surprise Gold Card from the full pool." },
  random_3:  { count: 3, cost: 1200, pool: "mixed",   label: "Random Pack (3 Cards)", desc: "Three surprise Gold Cards from the full pool." },
  shooter_1: { count: 1, cost: 700,  pool: "shooter", label: "Striker Pack (1 Card)", desc: "One shooter guaranteed — no GKs." },
  shooter_3: { count: 3, cost: 1800, pool: "shooter", label: "Striker Pack (3 Cards)",desc: "Three shooters guaranteed." },
  gk_1:      { count: 1, cost: 700,  pool: "gk",      label: "GK Pack (1 Card)",      desc: "One elite goalkeeper." },
  gk_3:      { count: 3, cost: 1800, pool: "gk",      label: "GK Pack (3 Cards)",     desc: "Three elite goalkeepers." },
} as const;

type PackType = keyof typeof PACK_CONFIG;

// ─── GET /api/shop/packs ──────────────────────────────────────────────────────
router.get("/packs", (_req, res) => {
  const packs = Object.entries(PACK_CONFIG).map(([id, cfg]) => ({
    id,
    name:        cfg.label,
    description: cfg.desc,
    cost:        cfg.cost,
    card_count:  cfg.count,
  }));
  res.json(packs);
});

// ─── POST /api/shop/buy ───────────────────────────────────────────────────────
router.post("/buy", (req: AuthRequest, res) => {
  const userId = req.userId!;
  const { packType } = req.body as { packType?: string };

  if (!packType || !(packType in PACK_CONFIG)) {
    res.status(400).json({ error: "Invalid packType", validPackTypes: Object.keys(PACK_CONFIG) });
    return;
  }

  const pack = PACK_CONFIG[packType as PackType];

  // Fetch eligible pool (Gold Cards only — is_bench_pool=0)
  let poolQuery: string;
  if (pack.pool === "shooter") {
    poolQuery = "SELECT * FROM players_base WHERE is_gk=0 AND is_bench_pool=0";
  } else if (pack.pool === "gk") {
    poolQuery = "SELECT * FROM players_base WHERE is_gk=1 AND is_bench_pool=0";
  } else if (pack.pool === "bench") {
    poolQuery = "SELECT * FROM players_base WHERE is_bench_pool=1";
  } else {
    poolQuery = "SELECT * FROM players_base WHERE is_bench_pool=0";
  }

  const pool = db.prepare(poolQuery).all() as PlayerBaseRow[];
  if (pool.length === 0) {
    res.status(500).json({ error: "Card pool is empty — run the seed script" });
    return;
  }

  const buyTx = db.transaction(() => {
    const user = db.prepare("SELECT coins, has_starter_pack FROM users WHERE id=?").get(userId) as { coins: number; has_starter_pack: number } | undefined;
    if (!user) throw new Error("USER_NOT_FOUND");
    if (packType === "starter" && user.has_starter_pack) throw new Error("STARTER_ALREADY_CLAIMED");
    if (user.coins < pack.cost) throw new Error(`INSUFFICIENT_COINS:${user.coins}:${pack.cost}`);

    // Snapshot which player_ids user already owns (to detect duplicates)
    const preOwnedIds = new Set(
      (db.prepare("SELECT player_id FROM user_inventory WHERE user_id=?").all(userId) as Array<{ player_id: number }>)
        .map((r) => r.player_id),
    );

    const newCoins = user.coins - pack.cost;
    db.prepare("UPDATE users SET coins=? WHERE id=?").run(newCoins, userId);
    if (packType === "starter") {
      db.prepare("UPDATE users SET has_starter_pack=1 WHERE id=?").run(userId);
    }

    const drawn = pickRandomN(pool, pack.count);
    const insertInv = db.prepare("INSERT INTO user_inventory (user_id, player_id) VALUES (?,?)");
    const duplicateInventoryIds: number[] = [];

    for (const card of drawn) {
      const result = insertInv.run(userId, card.id);
      const inventoryId = result.lastInsertRowid as number;
      if (preOwnedIds.has(card.id)) {
        duplicateInventoryIds.push(inventoryId);
      }
    }

    return { newCoins, drawn, duplicateInventoryIds };
  });

  try {
    const { newCoins, drawn, duplicateInventoryIds } = buyTx();

    // Fetch the full inventory records for the drawn cards (with inventory_id)
    const inventoryRows = db
      .prepare(`
        SELECT ui.id AS inventory_id, pb.*, ui.is_listed, ui.acquired_at
        FROM user_inventory ui
        JOIN players_base pb ON ui.player_id=pb.id
        WHERE ui.user_id=? AND ui.acquired_at >= datetime('now', '-5 seconds')
        ORDER BY ui.id DESC LIMIT ?
      `)
      .all(userId, pack.count) as Array<PlayerBaseRow & { inventory_id: number; is_listed: number; acquired_at: string }>;

    const players = inventoryRows.reverse().map((r) => ({
      id:                r.id,
      inventory_id:      r.inventory_id,
      name:              r.name,
      initials:          r.initials,
      position:          r.position,
      country:           r.country,
      club:              r.club,
      is_gk:             !!r.is_gk,
      fk:                r.fk,
      pk:                r.pk,
      fks:               r.fks,
      pks:               r.pks,
      overall:           r.overall,
      tactical_position: r.tactical_position,
      is_bench_pool:     !!(r as unknown as { is_bench_pool: number }).is_bench_pool,
      is_listed:         !!r.is_listed,
      acquired_at:       r.acquired_at,
    }));

    emitToUser(userId, "coins:updated", { coins: newCoins, reason: "pack_purchase" });
    emitToUser(userId, "pack:opened", {
      packType,
      coinsSpent: pack.cost,
      coinsRemaining: newCoins,
      cards: players,
    });

    res.json({ players, remaining_coins: newCoins, duplicate_inventory_ids: duplicateInventoryIds });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    if (msg.startsWith("INSUFFICIENT_COINS")) {
      const [, have, need] = msg.split(":");
      res.status(422).json({ error: `Not enough coins. You have ${have}, pack costs ${need}.` });
    } else if (msg === "USER_NOT_FOUND") {
      res.status(404).json({ error: "User not found" });
    } else if (msg === "STARTER_ALREADY_CLAIMED") {
      res.status(409).json({ error: "Starter pack has already been claimed on this account." });
    } else {
      throw err;
    }
  }
});

// ─── GET /api/shop/nerf-preview ───────────────────────────────────────────────
router.get("/nerf-preview", (req: AuthRequest, res) => {
  const playerId = parseInt(String(req.query["playerId"]), 10);
  if (!playerId || isNaN(playerId)) {
    res.status(400).json({ error: "playerId query param is required" });
    return;
  }

  const player = db.prepare("SELECT * FROM players_base WHERE id=?").get(playerId) as PlayerBaseRow | undefined;
  if (!player) {
    res.status(404).json({ error: "Player not found" });
    return;
  }

  import("../lib/gameUtils.js").then(({ applyNerfRule }) => {
    const effective = applyNerfRule(player);
    res.json({
      player: { id: player.id, name: player.name, isGK: player.is_gk === 1, rawStats: { fk: player.fk, pk: player.pk, fks: player.fks, pks: player.pks } },
      effectiveShooterStats: effective,
    });
  }).catch(() => res.status(500).json({ error: "Internal error" }));
});

export default router;
