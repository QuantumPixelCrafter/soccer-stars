/**
 * Game Utility Functions
 *
 * Contains the Universal Nerf Rule and other shared game logic.
 */

export interface PlayerBaseRow {
  id: number;
  name: string;
  initials: string;
  position: string;
  country: string;
  club: string;
  is_gk: number; // 0 = shooter, 1 = goalkeeper (SQLite stores as int)
  fk: number | null;
  pk: number | null;
  fks: number | null;
  pks: number | null;
  overall: number | null;
  tactical_position: string;
  is_bench_pool: number; // 0 = Gold Card pool, 1 = bench pool
}

export interface EffectiveShooterStats {
  playerId: number;
  name: string;
  fk: number;
  pk: number;
  nerfApplied: boolean;
  nerfReason?: string;
}

/**
 * Universal Nerf Rule
 *
 * If an equipped shooter has is_gk = true (a goalkeeper fielded as a shooter),
 * automatically halve their shooting stats:
 *   FK  = Math.floor(FKS / 2)
 *   PK  = Math.floor(PKS / 2)
 *
 * Returns the effective shooting stats for any player, applying the nerf when needed.
 */
export function applyNerfRule(player: PlayerBaseRow): EffectiveShooterStats {
  const isGK = player.is_gk === 1;

  if (isGK) {
    // Goalkeeper fielded as shooter — nerf applies
    const fks = player.fks ?? 0;
    const pks = player.pks ?? 0;
    return {
      playerId:    player.id,
      name:        player.name,
      fk:          Math.floor(fks / 2),
      pk:          Math.floor(pks / 2),
      nerfApplied: true,
      nerfReason:  "Goalkeeper fielded as shooter: FK = FKS/2, PK = PKS/2",
    };
  }

  // Normal shooter — no nerf
  return {
    playerId:    player.id,
    name:        player.name,
    fk:          player.fk  ?? 0,
    pk:          player.pk  ?? 0,
    nerfApplied: false,
  };
}

/**
 * Apply the nerf rule to a list of players (e.g. an entire lineup).
 */
export function applyNerfRuleToLineup(players: PlayerBaseRow[]): EffectiveShooterStats[] {
  return players.map(applyNerfRule);
}

/**
 * Clamp a value between min and max (inclusive).
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Pick a random element from an array.
 */
export function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

/**
 * Pick N random (with replacement) items from an array.
 */
export function pickRandomN<T>(arr: T[], n: number): T[] {
  const results: T[] = [];
  for (let i = 0; i < n; i++) {
    results.push(pickRandom(arr));
  }
  return results;
}
