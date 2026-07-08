/**
 * One-time DB migration: apply all seed corrections in place.
 * Run with: node scripts/fix-db.mjs
 */
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const Database = require("../node_modules/.pnpm/better-sqlite3@12.11.1/node_modules/better-sqlite3");

const DB_PATH = path.resolve(process.cwd(), "artifacts/api-server/data/game.db");
const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// ── 1. Remove players without active clubs ─────────────────────────────────────
const toRemove = [
  // Retired
  "Gareth Bale", "Eden Hazard", "Thiago Alcántara", "Toni Kroos", "David Silva",
  "Sergio Agüero", "Franck Ribéry", "Zlatan Ibrahimović", "Hugo Lloris",
  "Samir Handanović", "Luis Suárez",
  // Free Agent
  "Wissam Ben Yedder",
  // No confirmed club as of July 2026
  "Neymar Jr",
  // Wrong pool: CB listed as shooter, shows bench-tier rating
  "Goncalo Inacio",
  // Duplicate (Erling Haaland already exists)
  "Erling Braut Haaland",
  // Diego Costa — left Wolverhampton, no confirmed club
  "Diego Costa",
];

const deletePlayer = db.prepare("DELETE FROM players_base WHERE name=?");
const deleteTx = db.transaction((names) => {
  for (const name of names) {
    const info = deletePlayer.run(name);
    if (info.changes > 0) console.log(`Removed: ${name}`);
    else console.log(`Not found (already gone?): ${name}`);
  }
});
deleteTx(toRemove);

// ── 2. Position & tactical_position: FW → ST ──────────────────────────────────
const updatePos = db.prepare(
  "UPDATE players_base SET position='ST', tactical_position='ST' WHERE position='FW' AND is_bench_pool=0"
);
const r1 = updatePos.run();
console.log(`Updated FW→ST (main pool): ${r1.changes} rows`);

// ── 3. Update club corrections ─────────────────────────────────────────────────
db.prepare("UPDATE players_base SET club='Fiorentina' WHERE name='David de Gea'").run();
console.log("Updated David de Gea → Fiorentina");

db.prepare("UPDATE players_base SET club='Pumas UNAM' WHERE name='Keylor Navas'").run();
console.log("Updated Keylor Navas → Pumas UNAM");

// ── 4. Fix initials ────────────────────────────────────────────────────────────
db.prepare("UPDATE players_base SET initials='DeU' WHERE name='Destiny Udogie'").run();
console.log("Fixed Destiny Udogie initials → DeU");

db.prepare("UPDATE players_base SET initials='FlW' WHERE name='Florian Wirtz'").run();
console.log("Fixed Florian Wirtz initials → FlW");

// ── 5. Summary ─────────────────────────────────────────────────────────────────
const counts = db.prepare(
  "SELECT is_bench_pool, COUNT(*) as n FROM players_base GROUP BY is_bench_pool"
).all();
console.log("\nFinal counts:", counts);

const fwRemaining = db.prepare(
  "SELECT name, tactical_position FROM players_base WHERE tactical_position='FW' LIMIT 5"
).all();
console.log("FW tactical_position remaining (should be 0):", fwRemaining);

db.close();
console.log("\nDone.");
