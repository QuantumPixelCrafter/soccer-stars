import { Router } from "express";
import db from "../db/database.js";
import { requireAuth, type AuthRequest } from "../middleware/auth.js";

const router = Router();

// 16 non-4-3-3 formations (LM/RM replaced by LW/RW per spec)
const DAILY_FORMATIONS = [
  "4-4-2",
  "4-2-3-1",
  "3-5-2",
  "3-4-3",
  "5-3-2",
  "5-4-1",
  "4-1-4-1",
  "4-3-2-1",
  "4-2-2-2",
  "4-4-1-1",
  "4-5-1",
  "4-1-2-1-2",
  "3-6-1",
  "3-4-2-1",
  "4-2-4",
  "5-2-3",
] as const;

/**
 * Returns today's objective formation (UTC date-seeded, deterministic).
 * Rotates through all 16 formations. New formation at 00:00 UTC.
 */
function getTodayFormation(): string {
  const todayUtc = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  const cached = db
    .prepare("SELECT formation FROM daily_objective_cache WHERE date=?")
    .get(todayUtc) as { formation: string } | undefined;
  if (cached) return cached.formation;

  // Seed by day index from epoch so it's deterministic across reboots
  const epochDay = Math.floor(Date.now() / 86400000);
  const formation = DAILY_FORMATIONS[epochDay % DAILY_FORMATIONS.length]!;

  db.prepare("INSERT OR IGNORE INTO daily_objective_cache (date, formation) VALUES (?,?)")
    .run(todayUtc, formation);

  return formation;
}

// ─── GET /api/daily-objective ─────────────────────────────────────────────────
router.get("/", requireAuth, (req: AuthRequest, res) => {
  const formation = getTodayFormation();
  const todayUtc = new Date().toISOString().slice(0, 10);

  // Next reset: midnight UTC tomorrow
  const tomorrow = new Date();
  tomorrow.setUTCHours(24, 0, 0, 0);

  // Return user's daily_objective squad alongside the formation
  const squad = db
    .prepare("SELECT id FROM user_squads WHERE user_id=? AND squad_type='daily_objective'")
    .get(req.userId!) as { id: number } | undefined;

  let slots: unknown[] = [];
  let teamOvr: number | null = null;

  if (squad) {
    const slotRows = db
      .prepare(`
        SELECT ss.slot_key, ss.inventory_id, ui.player_id,
               pb.name, pb.initials, pb.overall, pb.tactical_position,
               pb.is_gk, pb.fk, pb.pk, pb.fks, pb.pks, pb.club, pb.country
        FROM squad_slots ss
        LEFT JOIN user_inventory ui ON ss.inventory_id = ui.id
        LEFT JOIN players_base pb ON ui.player_id = pb.id
        WHERE ss.squad_id=?
      `)
      .all(squad.id) as Array<Record<string, unknown>>;
    slots = slotRows;

    const ovrRows = db
      .prepare(`
        SELECT pb.overall FROM squad_slots ss
        JOIN user_inventory ui ON ss.inventory_id=ui.id
        JOIN players_base pb ON ui.player_id=pb.id
        WHERE ss.squad_id=?
      `)
      .all(squad.id) as Array<{ overall: number }>;
    if (ovrRows.length === 11) {
      teamOvr = Math.round(ovrRows.reduce((s, r) => s + r.overall, 0) / 11);
    }
  }

  res.json({
    date: todayUtc,
    formation,
    next_reset_at: tomorrow.toISOString(),
    formations_pool: DAILY_FORMATIONS,
    squad: { slots, team_ovr: teamOvr },
  });
});

export { getTodayFormation };
export default router;
