import { Router } from "express";
import db from "../db/database.js";
import { requireAuth, type AuthRequest } from "../middleware/auth.js";

const router = Router();

// All inventory routes require authentication
router.use(requireAuth);

// ─── GET /api/inventory/balance ───────────────────────────────────────────────

/**
 * Fetch the current coin balance for the authenticated user.
 * Returns: { userId, username, coins }
 */
router.get("/balance", (req: AuthRequest, res) => {
  const userId = req.userId!;

  const user = db
    .prepare("SELECT id, username, coins FROM users WHERE id = ?")
    .get(userId) as { id: number; username: string; coins: number } | undefined;

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json({ userId: user.id, username: user.username, coins: user.coins });
});

// ─── GET /api/inventory/players ───────────────────────────────────────────────

/**
 * Fetch all players in the authenticated user's inventory.
 * Returns: { total, players: [...] }
 *
 * Each player entry includes full card data plus acquisition timestamp.
 * Duplicates (same player_id owned multiple times) are all returned.
 */
router.get("/players", (req: AuthRequest, res) => {
  const userId = req.userId!;

  const rows = db
    .prepare(
      `SELECT
         ui.id          AS inventory_id,
         ui.acquired_at,
         pb.id          AS player_id,
         pb.name,
         pb.initials,
         pb.position,
         pb.country,
         pb.club,
         pb.is_gk,
         pb.fk,
         pb.pk,
         pb.fks,
         pb.pks
       FROM user_inventory ui
       JOIN players_base pb ON pb.id = ui.player_id
       WHERE ui.user_id = ?
       ORDER BY ui.acquired_at DESC`,
    )
    .all(userId) as Array<{
      inventory_id: number;
      acquired_at:  string;
      player_id:    number;
      name:         string;
      initials:     string;
      position:     string;
      country:      string;
      club:         string;
      is_gk:        number;
      fk:           number | null;
      pk:           number | null;
      fks:          number | null;
      pks:          number | null;
    }>;

  const players = rows.map((r) => ({
    inventoryId:  r.inventory_id,
    acquiredAt:   r.acquired_at,
    playerId:     r.player_id,
    name:         r.name,
    initials:     r.initials,
    position:     r.position,
    country:      r.country,
    club:         r.club,
    isGK:         r.is_gk === 1,
    // Shooter stats (null for GKs)
    fk:           r.fk,
    pk:           r.pk,
    // Goalkeeper stats (null for shooters)
    fks:          r.fks,
    pks:          r.pks,
  }));

  res.json({ total: players.length, players });
});

// ─── GET /api/inventory/summary ───────────────────────────────────────────────

/**
 * Return a brief summary: coin balance + player count breakdown.
 * Useful for a dashboard HUD.
 */
router.get("/summary", (req: AuthRequest, res) => {
  const userId = req.userId!;

  const user = db
    .prepare("SELECT coins FROM users WHERE id = ?")
    .get(userId) as { coins: number } | undefined;

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const counts = db
    .prepare(
      `SELECT pb.is_gk, COUNT(*) as cnt
       FROM user_inventory ui
       JOIN players_base pb ON pb.id = ui.player_id
       WHERE ui.user_id = ?
       GROUP BY pb.is_gk`,
    )
    .all(userId) as Array<{ is_gk: number; cnt: number }>;

  const shooterCount = counts.find((c) => c.is_gk === 0)?.cnt ?? 0;
  const gkCount      = counts.find((c) => c.is_gk === 1)?.cnt ?? 0;

  res.json({
    coins:        user.coins,
    totalCards:   shooterCount + gkCount,
    shooterCount,
    gkCount,
  });
});

export default router;
