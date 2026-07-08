import { Router } from "express";
import db from "../db/database.js";
import { emitToUser } from "../lib/socket.js";
import { requireAuth, type AuthRequest } from "../middleware/auth.js";

const router = Router();

interface PlayerCard {
  id: number;
  inventory_id: number;
  name: string;
  initials: string;
  position: string;
  country: string;
  club: string;
  is_gk: boolean;
  fk: number | null;
  pk: number | null;
  fks: number | null;
  pks: number | null;
  overall: number;
  tactical_position: string;
  is_bench_pool: boolean;
  is_listed: boolean;
  acquired_at: string;
}

// ─── GET /api/inventory/balance ───────────────────────────────────────────────
router.get("/balance", requireAuth, (req: AuthRequest, res) => {
  const user = db
    .prepare("SELECT coins FROM users WHERE id=?")
    .get(req.userId!) as { coins: number } | undefined;
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  res.json({ coins: user.coins });
});

// ─── GET /api/inventory/players ───────────────────────────────────────────────
router.get("/players", requireAuth, (req: AuthRequest, res) => {
  const rows = db
    .prepare(`
      SELECT
        pb.id,
        ui.id       AS inventory_id,
        pb.name,
        pb.initials,
        pb.position,
        pb.country,
        pb.club,
        pb.is_gk,
        pb.fk,
        pb.pk,
        pb.fks,
        pb.pks,
        pb.overall,
        pb.tactical_position,
        pb.is_bench_pool,
        ui.is_listed,
        ui.acquired_at
      FROM user_inventory ui
      JOIN players_base pb ON ui.player_id = pb.id
      WHERE ui.user_id = ?
      ORDER BY ui.acquired_at DESC
    `)
    .all(req.userId!) as PlayerCard[];

  res.json(
    rows.map((r) => ({
      ...r,
      is_gk:        !!r.is_gk,
      is_bench_pool: !!r.is_bench_pool,
      is_listed:    !!r.is_listed,
    })),
  );
});

// ─── GET /api/inventory/summary ───────────────────────────────────────────────
router.get("/summary", requireAuth, (req: AuthRequest, res) => {
  const user = db
    .prepare("SELECT coins FROM users WHERE id=?")
    .get(req.userId!) as { coins: number } | undefined;
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  const counts = db
    .prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN pb.is_gk = 1 THEN 1 ELSE 0 END) as goalkeepers,
        SUM(CASE WHEN pb.is_gk = 0 THEN 1 ELSE 0 END) as shooters
      FROM user_inventory ui
      JOIN players_base pb ON ui.player_id = pb.id
      WHERE ui.user_id = ?
    `)
    .get(req.userId!) as { total: number; goalkeepers: number; shooters: number };

  res.json({
    coins:       user.coins,
    total_cards: counts.total,
    goalkeepers: counts.goalkeepers,
    shooters:    counts.shooters,
  });
});

// ─── POST /api/inventory/exchange/:inventoryId ────────────────────────────────
/**
 * Quick-sell / exchange a card.
 * Value = floor(overall^2 / 70)
 * Cannot exchange a card that is currently listed on the market.
 */
router.post("/exchange/:inventoryId", requireAuth, (req: AuthRequest, res) => {
  const inventoryId = parseInt(req.params["inventoryId"]!, 10);
  if (isNaN(inventoryId)) {
    res.status(400).json({ error: "Invalid inventory id" });
    return;
  }

  const exchangeTx = db.transaction(() => {
    const inv = db
      .prepare(`
        SELECT ui.id, ui.player_id, ui.is_listed, pb.overall, pb.name
        FROM user_inventory ui
        JOIN players_base pb ON ui.player_id = pb.id
        WHERE ui.id=? AND ui.user_id=?
      `)
      .get(inventoryId, req.userId!) as
      | { id: number; player_id: number; is_listed: number; overall: number; name: string }
      | undefined;

    if (!inv) throw Object.assign(new Error("Card not found in your inventory"), { status: 404 });
    if (inv.is_listed) throw Object.assign(new Error("Cannot exchange a card listed on the market"), { status: 409 });

    const coinsEarned = Math.floor((inv.overall * inv.overall) / 70);

    // Remove from squad slots first (ON DELETE SET NULL handles it via FK)
    db.prepare("UPDATE users SET coins=coins+? WHERE id=?").run(coinsEarned, req.userId!);
    db.prepare("DELETE FROM user_inventory WHERE id=?").run(inventoryId);

    emitToUser(req.userId!, "coins:updated", { coins: coinsEarned, reason: "exchange" });

    return { coinsEarned, playerName: inv.name, overall: inv.overall };
  });

  try {
    const result = exchangeTx();
    const newBalance = (db.prepare("SELECT coins FROM users WHERE id=?").get(req.userId!) as { coins: number }).coins;
    res.json({ success: true, coins_earned: result.coinsEarned, player_name: result.playerName, new_balance: newBalance });
  } catch (err: unknown) {
    const e = err as Error & { status?: number };
    res.status(e.status ?? 500).json({ error: e.message });
  }
});

export default router;
