import { Router } from "express";
import db from "../db/database.js";
import { requireAuth, type AuthRequest } from "../middleware/auth.js";

const router = Router();

// ─── Slot-key → allowed positions (prefix-based, works for any formation) ─────
// Keys are derived from the slot key prefix so dynamic formation slots work.
function getAllowedPositions(slotKey: string): string[] | null {
  if (slotKey === "GK")                        return ["GK"];
  if (slotKey.startsWith("CB"))                return ["CB"];
  if (slotKey === "LB")                        return ["LB"];
  if (slotKey === "RB")                        return ["RB"];
  if (slotKey.startsWith("CDM"))               return ["CDM", "CM"];
  if (slotKey.startsWith("CAM"))               return ["CAM", "CM"];
  if (slotKey.startsWith("CM") || slotKey.startsWith("MID")) return ["CM", "CDM", "CAM"];
  if (slotKey.startsWith("ST"))                return ["ST"];
  if (slotKey.startsWith("RW"))                return ["RW"];
  if (slotKey.startsWith("LW"))                return ["LW"];
  return null; // unknown — will be rejected
}

interface PlayerBaseRow {
  id: number;
  name: string;
  initials: string;
  tactical_position: string;
  overall: number;
  is_gk: number;
  fk: number | null;
  pk: number | null;
  fks: number | null;
  pks: number | null;
  club: string;
  country: string;
  is_bench_pool: number;
}

interface InventoryRow {
  id: number;
  player_id: number;
  is_listed: number;
}

function getOrCreateSquad(userId: number, squadType: string): number {
  const existing = db
    .prepare("SELECT id FROM user_squads WHERE user_id=? AND squad_type=?")
    .get(userId, squadType) as { id: number } | undefined;
  if (existing) return existing.id;

  const result = db
    .prepare("INSERT INTO user_squads (user_id, squad_type) VALUES (?,?)")
    .run(userId, squadType);
  return result.lastInsertRowid as number;
}

function computeTeamOvr(squadId: number): number | null {
  const rows = db
    .prepare(`
      SELECT pb.overall
      FROM squad_slots ss
      JOIN user_inventory ui ON ss.inventory_id = ui.id
      JOIN players_base pb ON ui.player_id = pb.id
      WHERE ss.squad_id = ? AND ss.inventory_id IS NOT NULL
    `)
    .all(squadId) as Array<{ overall: number }>;

  if (rows.length < 11) return null;
  const sum = rows.reduce((acc, r) => acc + (r.overall ?? 0), 0);
  return Math.round(sum / rows.length);
}

function buildSquadResponse(userId: number, squadType: string) {
  const squadId = getOrCreateSquad(userId, squadType);

  const slotRows = db
    .prepare(`
      SELECT ss.slot_key, ss.inventory_id, ui.player_id,
             pb.name, pb.initials, pb.overall, pb.tactical_position, pb.is_gk,
             pb.fk, pb.pk, pb.fks, pb.pks, pb.club, pb.country, pb.is_bench_pool
      FROM squad_slots ss
      LEFT JOIN user_inventory ui ON ss.inventory_id = ui.id
      LEFT JOIN players_base pb ON ui.player_id = pb.id
      WHERE ss.squad_id = ?
    `)
    .all(squadId) as Array<{
      slot_key: string;
      inventory_id: number | null;
      player_id: number | null;
      name: string | null;
      initials: string | null;
      overall: number | null;
      tactical_position: string | null;
      is_gk: number | null;
      fk: number | null;
      pk: number | null;
      fks: number | null;
      pks: number | null;
      club: string | null;
      country: string | null;
      is_bench_pool: number | null;
    }>;

  const slots: Record<string, unknown> = {};
  for (const row of slotRows) {
    slots[row.slot_key] = row.inventory_id
      ? {
          inventory_id: row.inventory_id,
          player_id: row.player_id,
          name: row.name,
          initials: row.initials,
          overall: row.overall,
          tactical_position: row.tactical_position,
          is_gk: !!row.is_gk,
          fk: row.fk,
          pk: row.pk,
          fks: row.fks,
          pks: row.pks,
          club: row.club,
          country: row.country,
          is_bench_pool: !!row.is_bench_pool,
        }
      : null;
  }

  const teamOvr = computeTeamOvr(squadId);
  return { squad_type: squadType, squad_id: squadId, slots, team_ovr: teamOvr };
}

// ─── GET /api/squad/:type ─────────────────────────────────────────────────────
router.get("/:type", requireAuth, (req: AuthRequest, res) => {
  const squadType = req.params["type"];
  if (squadType !== "main" && squadType !== "daily_objective") {
    res.status(400).json({ error: "squad type must be 'main' or 'daily_objective'" });
    return;
  }

  res.json(buildSquadResponse(req.userId!, squadType));
});

// ─── PUT /api/squad/:type/slot ─────────────────────────────────────────────────
router.put("/:type/slot", requireAuth, (req: AuthRequest, res) => {
  const squadType = req.params["type"];
  if (squadType !== "main" && squadType !== "daily_objective") {
    res.status(400).json({ error: "squad type must be 'main' or 'daily_objective'" });
    return;
  }

  const { slot_key, inventory_id } = req.body as { slot_key?: string; inventory_id?: number };
  if (!slot_key || typeof slot_key !== "string" || slot_key.trim() === "") {
    res.status(400).json({ error: "slot_key is required" });
    return;
  }
  if (typeof inventory_id !== "number") {
    res.status(400).json({ error: "inventory_id (number) is required" });
    return;
  }

  const allowed = getAllowedPositions(slot_key);
  if (!allowed) {
    res.status(400).json({ error: `Unknown slot key: '${slot_key}'` });
    return;
  }

  // Verify ownership and not listed
  const inv = db
    .prepare("SELECT id, player_id, is_listed FROM user_inventory WHERE id=? AND user_id=?")
    .get(inventory_id, req.userId!) as InventoryRow | undefined;
  if (!inv) {
    res.status(404).json({ error: "Card not found in your inventory" });
    return;
  }
  if (inv.is_listed) {
    res.status(409).json({ error: "This card is listed on the market and cannot be slotted" });
    return;
  }

  // Verify position compatibility
  const player = db
    .prepare("SELECT tactical_position FROM players_base WHERE id=?")
    .get(inv.player_id) as { tactical_position: string } | undefined;
  if (!player) {
    res.status(404).json({ error: "Player not found" });
    return;
  }

  if (!allowed.includes(player.tactical_position)) {
    res.status(422).json({
      error: `Position '${player.tactical_position}' is not valid for slot '${slot_key}'. Allowed: ${allowed.join(", ")}`,
    });
    return;
  }

  const squadId = getOrCreateSquad(req.userId!, squadType);

  // Remove this inventory item from any OTHER slot in the same squad (a player can only be in one slot)
  db.prepare("UPDATE squad_slots SET inventory_id=NULL WHERE squad_id=? AND inventory_id=?")
    .run(squadId, inventory_id);

  // Upsert the slot
  db.prepare(`
    INSERT INTO squad_slots (squad_id, slot_key, inventory_id)
    VALUES (?,?,?)
    ON CONFLICT(squad_id, slot_key) DO UPDATE SET inventory_id=excluded.inventory_id
  `).run(squadId, slot_key, inventory_id);

  // Touch updated_at
  db.prepare("UPDATE user_squads SET updated_at=datetime('now') WHERE id=?").run(squadId);

  res.json(buildSquadResponse(req.userId!, squadType));
});

// ─── DELETE /api/squad/:type/slot/:slotKey ────────────────────────────────────
router.delete("/:type/slot/:slotKey", requireAuth, (req: AuthRequest, res) => {
  const squadType = req.params["type"];
  const slotKey = req.params["slotKey"];

  if (squadType !== "main" && squadType !== "daily_objective") {
    res.status(400).json({ error: "squad type must be 'main' or 'daily_objective'" });
    return;
  }
  if (!slotKey || typeof slotKey !== "string" || !getAllowedPositions(slotKey)) {
    res.status(400).json({ error: `Unknown slot key: '${slotKey}'` });
    return;
  }

  const squadId = getOrCreateSquad(req.userId!, squadType);
  db.prepare("UPDATE squad_slots SET inventory_id=NULL WHERE squad_id=? AND slot_key=?")
    .run(squadId, slotKey);

  res.json(buildSquadResponse(req.userId!, squadType));
});

export default router;
