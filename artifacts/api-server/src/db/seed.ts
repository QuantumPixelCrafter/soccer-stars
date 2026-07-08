import db from "./database.js";
import { logger } from "../lib/logger.js";
import { BENCH_PLAYERS, type BenchPlayer } from "./bench-seed.js";

interface PlayerSeed {
  name: string;
  initials: string;
  position: string;
  country: string;
  club: string;
  is_gk: boolean;
  fk?: number;
  pk?: number;
  fks?: number;
  pks?: number;
}

// ─── Gold Card Pool ────────────────────────────────────────────────────────────
// Clubs current as of 2025–26 season (Wikipedia).
// Outfield positions: ST, LW, RW, CB, RB, LB, CAM, CDM, CM.
// is_gk = false for all entries here; added via spread in seedDatabase().

const SHOOTERS: Omit<PlayerSeed, "is_gk">[] = [
  // ── Strikers ────────────────────────────────────────────────────────────────
  { name: "Kylian Mbappé",            initials: "KM",  position: "ST",  country: "France",       club: "Real Madrid",          fk: 96, pk: 94 },
  { name: "Erling Haaland",           initials: "EH",  position: "ST",  country: "Norway",       club: "Manchester City",      fk: 62, pk: 97 },
  { name: "Robert Lewandowski",       initials: "RL",  position: "ST",  country: "Poland",       club: "Barcelona",            fk: 79, pk: 92 },
  { name: "Harry Kane",               initials: "HK",  position: "ST",  country: "England",      club: "Bayern Munich",        fk: 82, pk: 95 },
  { name: "Lautaro Martínez",         initials: "LM",  position: "ST",  country: "Argentina",    club: "Inter Milan",          fk: 76, pk: 88 },
  { name: "Antoine Griezmann",        initials: "AG",  position: "ST",  country: "France",       club: "Atlético Madrid",      fk: 85, pk: 86 },
  { name: "Álvaro Morata",            initials: "AM",  position: "ST",  country: "Spain",        club: "AC Milan",             fk: 72, pk: 81 },
  { name: "Gabriel Jesus",            initials: "GJ",  position: "ST",  country: "Brazil",       club: "Arsenal",              fk: 73, pk: 76 },
  { name: "Richarlison",              initials: "Ric", position: "ST",  country: "Brazil",       club: "Tottenham",            fk: 69, pk: 75 },
  { name: "Julian Alvarez",           initials: "JA",  position: "ST",  country: "Argentina",    club: "Atlético Madrid",      fk: 78, pk: 84 },
  { name: "Darwin Núñez",             initials: "DN",  position: "ST",  country: "Uruguay",      club: "Liverpool",            fk: 68, pk: 80 },
  { name: "Diogo Jota",               initials: "DJ",  position: "ST",  country: "Portugal",     club: "Liverpool",            fk: 71, pk: 82 },
  { name: "Kai Havertz",              initials: "KH",  position: "ST",  country: "Germany",      club: "Arsenal",              fk: 78, pk: 79 },
  { name: "Niclas Füllkrug",          initials: "NF",  position: "ST",  country: "Germany",      club: "West Ham",             fk: 74, pk: 84 },
  { name: "Paulo Dybala",             initials: "PD",  position: "ST",  country: "Argentina",    club: "Roma",                 fk: 86, pk: 85 },
  { name: "Endrick",                  initials: "End", position: "ST",  country: "Brazil",       club: "Real Madrid",          fk: 74, pk: 80 },
  { name: "Rasmus Højlund",           initials: "RH",  position: "ST",  country: "Denmark",      club: "Manchester United",    fk: 70, pk: 82 },
  { name: "Ivan Toney",               initials: "IT",  position: "ST",  country: "England",      club: "Al-Ahli",              fk: 76, pk: 86 },
  { name: "Marcus Thuram",            initials: "MTh", position: "ST",  country: "France",       club: "Inter Milan",          fk: 72, pk: 80 },
  { name: "Tammy Abraham",            initials: "TA",  position: "ST",  country: "England",      club: "AC Milan",             fk: 69, pk: 78 },
  { name: "Gonçalo Ramos",            initials: "GR",  position: "ST",  country: "Portugal",     club: "PSG",                  fk: 72, pk: 82 },
  { name: "Artem Dovbyk",             initials: "ArD", position: "ST",  country: "Ukraine",      club: "Roma",                 fk: 70, pk: 80 },
  { name: "Mateo Retegui",            initials: "MRe", position: "ST",  country: "Italy",        club: "Atalanta",             fk: 71, pk: 82 },
  { name: "Santiago Giménez",         initials: "SG2", position: "ST",  country: "Mexico",       club: "AC Milan",             fk: 70, pk: 82 },
  { name: "Ollie Watkins",            initials: "OW",  position: "ST",  country: "England",      club: "Aston Villa",          fk: 72, pk: 82 },
  { name: "Benjamin Šeško",           initials: "BŠ",  position: "ST",  country: "Slovenia",     club: "RB Leipzig",           fk: 70, pk: 82 },
  { name: "Evan Ferguson",            initials: "EF",  position: "ST",  country: "Ireland",      club: "Brighton",             fk: 71, pk: 82 },
  { name: "Sébastien Haller",         initials: "SH",  position: "ST",  country: "Ivory Coast",  club: "Borussia Dortmund",    fk: 68, pk: 78 },
  { name: "Dušan Vlahović",           initials: "DV2", position: "ST",  country: "Serbia",       club: "Juventus",             fk: 74, pk: 86 },
  { name: "Lionel Messi",             initials: "LMe", position: "ST",  country: "Argentina",    club: "Inter Miami",          fk: 94, pk: 90 },
  { name: "Cristiano Ronaldo",        initials: "CR7", position: "ST",  country: "Portugal",     club: "Al-Nassr",             fk: 84, pk: 92 },
  { name: "Karim Benzema",            initials: "KB",  position: "ST",  country: "France",       club: "Al-Ittihad",           fk: 84, pk: 88 },
  { name: "Romelu Lukaku",            initials: "RLu", position: "ST",  country: "Belgium",      club: "Napoli",               fk: 68, pk: 82 },
  { name: "Edin Džeko",               initials: "EDž", position: "ST",  country: "Bosnia",       club: "Fenerbahçe",           fk: 72, pk: 78 },
  { name: "Roberto Firmino",          initials: "RF",  position: "ST",  country: "Brazil",       club: "Al-Ahli",              fk: 74, pk: 76 },
  { name: "Iago Aspas",               initials: "IAsp",position: "ST",  country: "Spain",        club: "Celta Vigo",           fk: 84, pk: 82 },

  // ── Left Wingers ─────────────────────────────────────────────────────────────
  { name: "Vinicius Jr",              initials: "VJ",  position: "LW",  country: "Brazil",       club: "Real Madrid",          fk: 81, pk: 78 },
  { name: "Marcus Rashford",          initials: "MR",  position: "LW",  country: "England",      club: "Aston Villa",          fk: 80, pk: 79 },
  { name: "Mohamed Salah",            initials: "MS",  position: "RW",  country: "Egypt",        club: "Liverpool",            fk: 87, pk: 91 },
  { name: "Son Heung-min",            initials: "SHM", position: "LW",  country: "South Korea",  club: "Tottenham",            fk: 84, pk: 83 },
  { name: "Cody Gakpo",               initials: "CG",  position: "LW",  country: "Netherlands",  club: "Liverpool",            fk: 76, pk: 78 },
  { name: "Luis Díaz",                initials: "LD",  position: "LW",  country: "Colombia",     club: "Liverpool",            fk: 79, pk: 77 },
  { name: "Gabriel Martinelli",       initials: "GM2", position: "LW",  country: "Brazil",       club: "Arsenal",              fk: 75, pk: 73 },
  { name: "Sadio Mané",               initials: "SM",  position: "LW",  country: "Senegal",      club: "Al-Nassr",             fk: 80, pk: 76 },
  { name: "Raheem Sterling",          initials: "RS",  position: "LW",  country: "England",      club: "Arsenal",              fk: 78, pk: 74 },
  { name: "Jack Grealish",            initials: "JG",  position: "LW",  country: "England",      club: "Manchester City",      fk: 74, pk: 71 },
  { name: "Alejandro Garnacho",       initials: "AlG", position: "LW",  country: "Argentina",    club: "Manchester United",    fk: 75, pk: 72 },
  { name: "Nico Williams",            initials: "NW",  position: "LW",  country: "Spain",        club: "Athletic Bilbao",      fk: 80, pk: 74 },
  { name: "Désiré Doué",              initials: "DD",  position: "LW",  country: "France",       club: "PSG",                  fk: 78, pk: 74 },
  { name: "Khvicha Kvaratskhelia",    initials: "KKv", position: "LW",  country: "Georgia",      club: "PSG",                  fk: 80, pk: 76 },
  { name: "Sebastián Villa",          initials: "SV",  position: "LW",  country: "Argentina",    club: "Boca Juniors",         fk: 80, pk: 76 },
  { name: "Memphis Depay",            initials: "MDe", position: "LW",  country: "Netherlands",  club: "Corinthians",          fk: 82, pk: 78 },
  { name: "Lorenzo Insigne",          initials: "LIn", position: "LW",  country: "Italy",        club: "Toronto FC",           fk: 84, pk: 82 },
  { name: "Bryan Zaragoza",           initials: "BZ",  position: "LW",  country: "Spain",        club: "Bayern Munich",        fk: 76, pk: 70 },

  // ── Right Wingers ────────────────────────────────────────────────────────────
  { name: "Bukayo Saka",              initials: "BS",  position: "RW",  country: "England",      club: "Arsenal",              fk: 84, pk: 82 },
  { name: "Jadon Sancho",             initials: "JS",  position: "RW",  country: "England",      club: "Chelsea",              fk: 77, pk: 74 },
  { name: "Rodrygo",                  initials: "Rod", position: "RW",  country: "Brazil",       club: "Real Madrid",          fk: 78, pk: 76 },
  { name: "Leroy Sané",               initials: "LS",  position: "RW",  country: "Germany",      club: "Bayern Munich",        fk: 82, pk: 76 },
  { name: "Lamine Yamal",             initials: "LY",  position: "RW",  country: "Spain",        club: "Barcelona",            fk: 84, pk: 78 },
  { name: "Karim Adeyemi",            initials: "KA",  position: "RW",  country: "Germany",      club: "Borussia Dortmund",    fk: 76, pk: 72 },
  { name: "Michael Olise",            initials: "MO",  position: "RW",  country: "France",       club: "Bayern Munich",        fk: 82, pk: 76 },
  { name: "Mathys Tel",               initials: "MT",  position: "RW",  country: "France",       club: "Tottenham",            fk: 72, pk: 76 },
  { name: "Takefusa Kubo",            initials: "TK",  position: "RW",  country: "Japan",        club: "Real Sociedad",        fk: 80, pk: 74 },
  { name: "Dries Mertens",            initials: "DM",  position: "RW",  country: "Belgium",      club: "Galatasaray",          fk: 82, pk: 80 },
  { name: "Pierre-Emerick Aubameyang",initials: "PEA", position: "ST",  country: "Gabon",        club: "Marseille",            fk: 76, pk: 78 },
  { name: "Thomas Müller",            initials: "TMü", position: "RW",  country: "Germany",      club: "LA Galaxy",            fk: 76, pk: 72 },

  // ── Central & Attacking Midfielders ─────────────────────────────────────────
  { name: "Phil Foden",               initials: "PF",  position: "CM",  country: "England",      club: "Manchester City",      fk: 83, pk: 80 },
  { name: "Bernardo Silva",           initials: "BSi", position: "CM",  country: "Portugal",     club: "Manchester City",      fk: 80, pk: 77 },
  { name: "Kevin De Bruyne",          initials: "KDB", position: "CM",  country: "Belgium",      club: "Napoli",               fk: 92, pk: 80 },
  { name: "Lorenzo Pellegrini",       initials: "LP",  position: "CAM", country: "Italy",        club: "Roma",                 fk: 85, pk: 78 },
  { name: "Federico Valverde",        initials: "FV",  position: "CM",  country: "Uruguay",      club: "Real Madrid",          fk: 80, pk: 76 },
  { name: "Xavi Simons",              initials: "XS",  position: "CAM", country: "Netherlands",  club: "PSG",                  fk: 82, pk: 78 },
  { name: "Warren Zaïre-Emery",       initials: "WZE", position: "CM",  country: "France",       club: "PSG",                  fk: 76, pk: 72 },
  { name: "Cole Palmer",              initials: "CP",  position: "CAM", country: "England",      club: "Chelsea",              fk: 84, pk: 84 },
  { name: "Jude Bellingham",          initials: "JB",  position: "CAM", country: "England",      club: "Real Madrid",          fk: 82, pk: 76 },
  { name: "Pedri González",           initials: "PeG", position: "CM",  country: "Spain",        club: "Barcelona",            fk: 80, pk: 72 },
  { name: "Jamal Musiala",            initials: "JMu", position: "CAM", country: "Germany",      club: "Bayern Munich",        fk: 84, pk: 76 },
  { name: "Arda Güler",               initials: "ArG", position: "CAM", country: "Turkey",       club: "Real Madrid",          fk: 86, pk: 78 },
  { name: "Claudio Echeverri",        initials: "CE",  position: "CAM", country: "Argentina",    club: "Manchester City",      fk: 74, pk: 70 },
  { name: "Ivan Rakitić",             initials: "IRak",position: "CM",  country: "Croatia",      club: "Hajduk Split",         fk: 84, pk: 76 },
  { name: "James Rodríguez",          initials: "JRod",position: "CAM", country: "Colombia",     club: "Rayo Vallecano",       fk: 88, pk: 80 },
  { name: "Christian Eriksen",        initials: "ChE", position: "CM",  country: "Denmark",      club: "Brentford",            fk: 88, pk: 80 },
  { name: "Isco",                     initials: "Isc", position: "CAM", country: "Spain",        club: "Betis",                fk: 84, pk: 78 },
  { name: "Marco Verratti",           initials: "MVer",position: "CDM", country: "Italy",        club: "Al-Arabi",             fk: 78, pk: 70 },
  { name: "Luka Modrić",              initials: "LMo", position: "CM",  country: "Croatia",      club: "Real Madrid",          fk: 86, pk: 76 },
  { name: "Mario Götze",              initials: "MGö", position: "CM",  country: "Germany",      club: "Eintracht Frankfurt",  fk: 80, pk: 76 },

  // ── Centre Backs ─────────────────────────────────────────────────────────────
  { name: "Virgil van Dijk",          initials: "VVD", position: "CB",  country: "Netherlands",  club: "Liverpool",            fk: 65, pk: 62 },
  { name: "William Saliba",           initials: "WS2", position: "CB",  country: "France",       club: "Arsenal",              fk: 64, pk: 61 },
  { name: "Antonio Rüdiger",          initials: "AR",  position: "CB",  country: "Germany",      club: "Real Madrid",          fk: 70, pk: 65 },
  { name: "Marquinhos",               initials: "Mqh", position: "CB",  country: "Brazil",       club: "PSG",                  fk: 66, pk: 62 },
  { name: "Josko Gvardiol",           initials: "JGv", position: "CB",  country: "Croatia",      club: "Manchester City",      fk: 64, pk: 61 },
  { name: "Alessandro Bastoni",       initials: "ABa", position: "CB",  country: "Italy",        club: "Inter Milan",          fk: 66, pk: 62 },

  // ── Right Backs ───────────────────────────────────────────────────────────────
  { name: "João Cancelo",             initials: "JCa", position: "RB",  country: "Portugal",     club: "Barcelona",            fk: 79, pk: 72 },
  { name: "Kieran Trippier",          initials: "KTr", position: "RB",  country: "England",      club: "Newcastle United",     fk: 84, pk: 72 },
  { name: "Dani Carvajal",            initials: "DCa", position: "RB",  country: "Spain",        club: "Real Madrid",          fk: 74, pk: 69 },

  // ── Left Backs ────────────────────────────────────────────────────────────────
  { name: "Andrew Robertson",         initials: "ARo", position: "LB",  country: "Scotland",     club: "Liverpool",            fk: 75, pk: 69 },
  { name: "Alphonso Davies",          initials: "AD2", position: "LB",  country: "Canada",       club: "Real Madrid",          fk: 74, pk: 67 },
];

// 23 active Goalkeepers — FKS & PKS stats 1-99
const GOALKEEPERS: Omit<PlayerSeed, "is_gk">[] = [
  { name: "Alisson Becker",           initials: "AB",  position: "GK",  country: "Brazil",       club: "Liverpool",            fks: 86, pks: 88 },
  { name: "Manuel Neuer",             initials: "MN",  position: "GK",  country: "Germany",      club: "Bayern Munich",        fks: 88, pks: 86 },
  { name: "Ederson",                  initials: "Ed",  position: "GK",  country: "Brazil",       club: "Manchester City",      fks: 84, pks: 86 },
  { name: "Marc-André ter Stegen",    initials: "MTS", position: "GK",  country: "Germany",      club: "Barcelona",            fks: 86, pks: 84 },
  { name: "Thibaut Courtois",         initials: "TC",  position: "GK",  country: "Belgium",      club: "Real Madrid",          fks: 88, pks: 90 },
  { name: "Jan Oblak",                initials: "JO",  position: "GK",  country: "Slovenia",     club: "Atlético Madrid",      fks: 86, pks: 88 },
  { name: "Gianluigi Donnarumma",     initials: "GD",  position: "GK",  country: "Italy",        club: "PSG",                  fks: 84, pks: 86 },
  { name: "Andriy Lunin",             initials: "ALu", position: "GK",  country: "Ukraine",      club: "Real Madrid",          fks: 80, pks: 82 },
  { name: "Emiliano Martínez",        initials: "EM",  position: "GK",  country: "Argentina",    club: "Aston Villa",          fks: 84, pks: 92 },
  { name: "Mike Maignan",             initials: "MM2", position: "GK",  country: "France",       club: "AC Milan",             fks: 84, pks: 86 },
  { name: "Fernando Muslera",         initials: "FM",  position: "GK",  country: "Uruguay",      club: "Galatasaray",          fks: 78, pks: 80 },
  { name: "Kasper Schmeichel",        initials: "KS",  position: "GK",  country: "Denmark",      club: "Anderlecht",           fks: 80, pks: 82 },
  { name: "David de Gea",             initials: "DDG", position: "GK",  country: "Spain",        club: "Fiorentina",           fks: 80, pks: 88 },
  { name: "Claudio Bravo",            initials: "CB2", position: "GK",  country: "Chile",        club: "Real Betis",           fks: 76, pks: 78 },
  { name: "Neto",                     initials: "Net", position: "GK",  country: "Brazil",       club: "Bournemouth",          fks: 74, pks: 78 },
  { name: "Paulo Gazzaniga",          initials: "PG",  position: "GK",  country: "Argentina",    club: "Girona",               fks: 74, pks: 76 },
  { name: "Alphonse Areola",          initials: "AA",  position: "GK",  country: "France",       club: "West Ham",             fks: 76, pks: 80 },
  { name: "Stefan Ortega",            initials: "SO",  position: "GK",  country: "Germany",      club: "Manchester City",      fks: 78, pks: 80 },
  { name: "Diogo Costa",              initials: "DC2", position: "GK",  country: "Portugal",     club: "Porto",                fks: 82, pks: 84 },
  { name: "André Onana",              initials: "AO",  position: "GK",  country: "Cameroon",     club: "Manchester United",    fks: 80, pks: 82 },
  { name: "Bono",                     initials: "Bon", position: "GK",  country: "Morocco",      club: "Sevilla",              fks: 78, pks: 80 },
  { name: "Guglielmo Vicario",        initials: "GV",  position: "GK",  country: "Italy",        club: "Tottenham",            fks: 80, pks: 82 },
  { name: "Wojciech Szczęsny",        initials: "WS3", position: "GK",  country: "Poland",       club: "Barcelona",            fks: 74, pks: 74 },
];

export function seedDatabase(): void {
  const shooters: PlayerSeed[] = SHOOTERS.map((s) => ({ ...s, is_gk: false }));
  const goalkeepers: PlayerSeed[] = GOALKEEPERS.map((g) => ({ ...g, is_gk: true }));
  const uniqueShooters = Array.from(
    new Map(shooters.map((s) => [s.name, s])).values(),
  );
  const expectedMainCount = uniqueShooters.length + goalkeepers.length;

  const existingCount = (
    db.prepare("SELECT COUNT(*) as cnt FROM players_base WHERE is_bench_pool=0").get() as { cnt: number }
  ).cnt;

  if (existingCount >= expectedMainCount) {
    logger.info({ existingCount }, "Database already seeded — skipping Gold Cards");
  } else {
    logger.info({ expectedMainCount }, "Seeding Gold Cards into players_base…");

    const insert = db.prepare(`
      INSERT OR IGNORE INTO players_base
        (name, initials, position, country, club, is_gk, fk, pk, fks, pks, overall, tactical_position, is_bench_pool)
      VALUES
        (@name, @initials, @position, @country, @club, @is_gk, @fk, @pk, @fks, @pks, @overall, @tactical_position, 0)
    `);

    const insertMany = db.transaction((players: PlayerSeed[]) => {
      for (const p of players) {
        const overall = p.is_gk
          ? Math.round(((p.fks ?? 0) + (p.pks ?? 0)) / 2)
          : Math.round(((p.fk ?? 0) + (p.pk ?? 0)) / 2);
        // tactical_position maps directly from position except MF legacy entries → CM
        const tacticalPosition = p.is_gk
          ? "GK"
          : p.position === "MF"
          ? "CM"
          : p.position;
        insert.run({
          name: p.name, initials: p.initials, position: p.position,
          country: p.country, club: p.club,
          is_gk: p.is_gk ? 1 : 0,
          fk: p.fk ?? null, pk: p.pk ?? null,
          fks: p.fks ?? null, pks: p.pks ?? null,
          overall, tactical_position: tacticalPosition,
        });
      }
    });

    insertMany([...uniqueShooters, ...goalkeepers]);
  }

  // Seed bench player pool
  seedBenchPool();

  logger.info("Database seeding complete");
}

function seedBenchPool(): void {
  const benchCount = (
    db.prepare("SELECT COUNT(*) as cnt FROM players_base WHERE is_bench_pool=1").get() as { cnt: number }
  ).cnt;

  if (benchCount >= BENCH_PLAYERS.length) {
    logger.info({ benchCount }, "Bench pool already seeded — skipping");
    return;
  }

  logger.info({ count: BENCH_PLAYERS.length }, "Seeding bench player pool…");

  const insert = db.prepare(`
    INSERT OR IGNORE INTO players_base
      (name, initials, position, country, club, is_gk, fk, pk, fks, pks, overall, tactical_position, is_bench_pool)
    VALUES
      (@name, @initials, @position, @country, @club, @is_gk, @fk, @pk, @fks, @pks, @overall, @tactical_position, 1)
  `);

  const insertMany = db.transaction((players: BenchPlayer[]) => {
    for (const p of players) {
      insert.run({
        name: p.name,
        initials: p.initials,
        position: p.tactical_position,
        country: p.country,
        club: p.club,
        is_gk: p.is_gk ? 1 : 0,
        fk: p.fk ?? null,
        pk: p.pk ?? null,
        fks: p.fks ?? null,
        pks: p.pks ?? null,
        overall: p.overall,
        tactical_position: p.tactical_position,
      });
    }
  });

  insertMany(BENCH_PLAYERS);
  logger.info("Bench pool seeding complete");
}
