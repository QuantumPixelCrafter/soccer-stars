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

// Active Shooters (is_gk = false) — FK & PK stats 1-99
// Position "ST" is used for all outfield non-midfield players (FW removed as position)
// Players without clubs (Retired, Free Agent) are excluded
const SHOOTERS: Omit<PlayerSeed, "is_gk">[] = [
  { name: "Kylian Mbappé",       initials: "KM",  position: "ST", country: "France",      club: "Real Madrid",        fk: 96, pk: 94 },
  { name: "Erling Haaland",      initials: "EH",  position: "ST", country: "Norway",      club: "Manchester City",    fk: 62, pk: 97 },
  { name: "Vinicius Jr",         initials: "VJ",  position: "ST", country: "Brazil",      club: "Real Madrid",        fk: 81, pk: 78 },
  { name: "Bukayo Saka",         initials: "BS",  position: "ST", country: "England",     club: "Arsenal",            fk: 84, pk: 82 },
  { name: "Marcus Rashford",     initials: "MR",  position: "ST", country: "England",     club: "Manchester United",  fk: 80, pk: 79 },
  { name: "Phil Foden",          initials: "PF",  position: "MF", country: "England",     club: "Manchester City",    fk: 83, pk: 80 },
  { name: "Mohamed Salah",       initials: "MS",  position: "ST", country: "Egypt",       club: "Liverpool",          fk: 87, pk: 91 },
  { name: "Robert Lewandowski",  initials: "RL",  position: "ST", country: "Poland",      club: "Barcelona",          fk: 79, pk: 92 },
  { name: "Harry Kane",          initials: "HK",  position: "ST", country: "England",     club: "Bayern Munich",      fk: 82, pk: 95 },
  { name: "Lautaro Martínez",    initials: "LM",  position: "ST", country: "Argentina",   club: "Inter Milan",        fk: 76, pk: 88 },
  { name: "Antoine Griezmann",   initials: "AG",  position: "ST", country: "France",      club: "Atlético Madrid",    fk: 85, pk: 86 },
  { name: "Álvaro Morata",       initials: "AM",  position: "ST", country: "Spain",       club: "AC Milan",           fk: 72, pk: 81 },
  { name: "Gabriel Jesus",       initials: "GJ",  position: "ST", country: "Brazil",      club: "Arsenal",            fk: 73, pk: 76 },
  { name: "Bernardo Silva",      initials: "BSi", position: "MF", country: "Portugal",    club: "Manchester City",    fk: 80, pk: 77 },
  { name: "Kevin De Bruyne",     initials: "KDB", position: "MF", country: "Belgium",     club: "Manchester City",    fk: 92, pk: 80 },
  { name: "Son Heung-min",       initials: "SHM", position: "ST", country: "South Korea", club: "Tottenham",          fk: 84, pk: 83 },
  { name: "Richarlison",         initials: "Ric", position: "ST", country: "Brazil",      club: "Tottenham",          fk: 69, pk: 75 },
  { name: "Julian Alvarez",      initials: "JA",  position: "ST", country: "Argentina",   club: "Atlético Madrid",    fk: 78, pk: 84 },
  { name: "Alejandro Garnacho",  initials: "AlG", position: "ST", country: "Argentina",   club: "Manchester United",  fk: 75, pk: 72 },
  { name: "Jadon Sancho",        initials: "JS",  position: "ST", country: "England",     club: "Chelsea",            fk: 77, pk: 74 },
  { name: "Jack Grealish",       initials: "JG",  position: "ST", country: "England",     club: "Manchester City",    fk: 74, pk: 71 },
  { name: "Cody Gakpo",          initials: "CG",  position: "ST", country: "Netherlands", club: "Liverpool",          fk: 76, pk: 78 },
  { name: "Darwin Núñez",        initials: "DN",  position: "ST", country: "Uruguay",     club: "Liverpool",          fk: 68, pk: 80 },
  { name: "Diogo Jota",          initials: "DJ",  position: "ST", country: "Portugal",    club: "Liverpool",          fk: 71, pk: 82 },
  { name: "Luis Díaz",           initials: "LD",  position: "ST", country: "Colombia",    club: "Liverpool",          fk: 79, pk: 77 },
  { name: "Gabriel Martinelli",  initials: "GM2", position: "ST", country: "Brazil",      club: "Arsenal",            fk: 75, pk: 73 },
  { name: "Rodrygo",             initials: "Rod", position: "ST", country: "Brazil",      club: "Real Madrid",        fk: 78, pk: 76 },
  { name: "Kai Havertz",         initials: "KH",  position: "ST", country: "Germany",     club: "Arsenal",            fk: 78, pk: 79 },
  { name: "Leroy Sané",          initials: "LS",  position: "ST", country: "Germany",     club: "Bayern Munich",      fk: 82, pk: 76 },
  { name: "Sadio Mané",          initials: "SM",  position: "ST", country: "Senegal",     club: "Al-Nassr",           fk: 80, pk: 76 },
  { name: "Raheem Sterling",     initials: "RS",  position: "ST", country: "England",     club: "Arsenal",            fk: 78, pk: 74 },
  { name: "Lorenzo Pellegrini",  initials: "LP",  position: "MF", country: "Italy",       club: "Roma",               fk: 85, pk: 78 },
  { name: "Niclas Füllkrug",     initials: "NF",  position: "ST", country: "Germany",     club: "West Ham",           fk: 74, pk: 84 },
  { name: "Paulo Dybala",        initials: "PD",  position: "ST", country: "Argentina",   club: "Roma",               fk: 86, pk: 85 },
  { name: "Federico Valverde",   initials: "FV",  position: "MF", country: "Uruguay",     club: "Real Madrid",        fk: 80, pk: 76 },
  { name: "Lamine Yamal",        initials: "LY",  position: "ST", country: "Spain",       club: "Barcelona",          fk: 84, pk: 78 },
  { name: "Nico Williams",       initials: "NW",  position: "ST", country: "Spain",       club: "Athletic Bilbao",    fk: 80, pk: 74 },
  { name: "Xavi Simons",         initials: "XS",  position: "MF", country: "Netherlands", club: "PSG",                fk: 82, pk: 78 },
  { name: "Warren Zaïre-Emery",  initials: "WZE", position: "MF", country: "France",      club: "PSG",                fk: 76, pk: 72 },
  { name: "Endrick",             initials: "End", position: "ST", country: "Brazil",      club: "Real Madrid",        fk: 74, pk: 80 },
  { name: "Mathys Tel",          initials: "MT",  position: "ST", country: "France",      club: "Bayern Munich",      fk: 72, pk: 76 },
  { name: "Evan Ferguson",       initials: "EF",  position: "ST", country: "Ireland",     club: "Brighton",           fk: 71, pk: 82 },
  { name: "Karim Adeyemi",       initials: "KA",  position: "ST", country: "Germany",     club: "Borussia Dortmund",  fk: 76, pk: 72 },
  { name: "Désiré Doué",         initials: "DD",  position: "ST", country: "France",      club: "PSG",                fk: 78, pk: 74 },
  { name: "Michael Olise",       initials: "MO",  position: "ST", country: "France",      club: "Bayern Munich",      fk: 82, pk: 76 },
  { name: "Rasmus Højlund",      initials: "RH",  position: "ST", country: "Denmark",     club: "Manchester United",  fk: 70, pk: 82 },
  { name: "Ivan Toney",          initials: "IT",  position: "ST", country: "England",     club: "Al-Ahli",            fk: 76, pk: 86 },
  { name: "Marcus Thuram",       initials: "MTh", position: "ST", country: "France",      club: "Inter Milan",        fk: 72, pk: 80 },
  { name: "Sébastien Haller",    initials: "SH",  position: "ST", country: "Ivory Coast", club: "Borussia Dortmund",  fk: 68, pk: 78 },
  { name: "Tammy Abraham",       initials: "TA",  position: "ST", country: "England",     club: "AC Milan",           fk: 69, pk: 78 },
  { name: "Gonçalo Ramos",       initials: "GR",  position: "ST", country: "Portugal",    club: "PSG",                fk: 72, pk: 82 },
  { name: "Artem Dovbyk",        initials: "ArD", position: "ST", country: "Ukraine",     club: "Roma",               fk: 70, pk: 80 },
  { name: "Mateo Retegui",       initials: "MRe", position: "ST", country: "Italy",       club: "Atalanta",           fk: 71, pk: 82 },
  { name: "Santiago Giménez",    initials: "SG2", position: "ST", country: "Mexico",      club: "AC Milan",           fk: 70, pk: 82 },
  { name: "Ollie Watkins",       initials: "OW",  position: "ST", country: "England",     club: "Aston Villa",        fk: 72, pk: 82 },
  { name: "Benjamin Šeško",      initials: "BŠ",  position: "ST", country: "Slovenia",    club: "RB Leipzig",         fk: 70, pk: 82 },
  { name: "Cole Palmer",         initials: "CP",  position: "MF", country: "England",     club: "Chelsea",            fk: 84, pk: 84 },
  { name: "Jude Bellingham",     initials: "JB",  position: "MF", country: "England",     club: "Real Madrid",        fk: 82, pk: 76 },
  { name: "Pedri González",      initials: "PeG", position: "MF", country: "Spain",       club: "Barcelona",          fk: 80, pk: 72 },
  { name: "Jamal Musiala",       initials: "JMu", position: "MF", country: "Germany",     club: "Bayern Munich",      fk: 84, pk: 76 },
  { name: "Arda Güler",          initials: "ArG", position: "MF", country: "Turkey",      club: "Real Madrid",        fk: 86, pk: 78 },
  { name: "Takefusa Kubo",       initials: "TK",  position: "ST", country: "Japan",       club: "Real Sociedad",      fk: 80, pk: 74 },
  { name: "Claudio Echeverri",   initials: "CE",  position: "ST", country: "Argentina",   club: "Manchester City",    fk: 74, pk: 70 },
  { name: "Bryan Zaragoza",      initials: "BZ",  position: "ST", country: "Spain",       club: "Bayern Munich",      fk: 76, pk: 70 },
  { name: "Lionel Messi",        initials: "LMe", position: "ST", country: "Argentina",   club: "Inter Miami",        fk: 94, pk: 90 },
  { name: "Cristiano Ronaldo",   initials: "CR7", position: "ST", country: "Portugal",    club: "Al-Nassr",           fk: 84, pk: 92 },
  { name: "Karim Benzema",       initials: "KB",  position: "ST", country: "France",      club: "Al-Ittihad",         fk: 84, pk: 88 },
  { name: "Pierre-Emerick Aubameyang", initials: "PEA", position: "ST", country: "Gabon", club: "Marseille",         fk: 76, pk: 78 },
  { name: "Lorenzo Insigne",     initials: "LIn", position: "ST", country: "Italy",       club: "Toronto FC",         fk: 84, pk: 82 },
  { name: "Dries Mertens",       initials: "DM",  position: "ST", country: "Belgium",     club: "Galatasaray",        fk: 82, pk: 80 },
  { name: "Romelu Lukaku",       initials: "RLu", position: "ST", country: "Belgium",     club: "Napoli",             fk: 68, pk: 82 },
  { name: "Edin Džeko",          initials: "EDž", position: "ST", country: "Bosnia",      club: "Fenerbahçe",         fk: 72, pk: 78 },
  { name: "Roberto Firmino",     initials: "RF",  position: "ST", country: "Brazil",      club: "Al-Ahli",            fk: 74, pk: 76 },
  { name: "Thomas Müller",       initials: "TMü", position: "ST", country: "Germany",     club: "LA Galaxy",          fk: 76, pk: 72 },
  { name: "Iago Aspas",          initials: "IAsp",position: "ST", country: "Spain",       club: "Celta Vigo",         fk: 84, pk: 82 },
  { name: "Sebastián Villa",     initials: "SV",  position: "ST", country: "Argentina",   club: "Boca Juniors",       fk: 80, pk: 76 },
  { name: "Memphis Depay",       initials: "MDe", position: "ST", country: "Netherlands", club: "Corinthians",        fk: 82, pk: 78 },
  { name: "Mario Götze",         initials: "MGö", position: "ST", country: "Germany",     club: "Eintracht Frankfurt",fk: 80, pk: 76 },
  { name: "Ivan Rakitić",        initials: "IRak",position: "MF", country: "Croatia",     club: "Hajduk Split",       fk: 84, pk: 76 },
  { name: "James Rodríguez",     initials: "JRod",position: "MF", country: "Colombia",    club: "Rayo Vallecano",     fk: 88, pk: 80 },
  { name: "Christian Eriksen",   initials: "ChE", position: "MF", country: "Denmark",     club: "Manchester United",  fk: 88, pk: 80 },
  { name: "Isco",                initials: "Isc", position: "MF", country: "Spain",       club: "Betis",              fk: 84, pk: 78 },
  { name: "Marco Verratti",      initials: "MVer",position: "MF", country: "Italy",       club: "Al-Arabi",           fk: 78, pk: 70 },
  { name: "Luka Modrić",         initials: "LMo", position: "MF", country: "Croatia",     club: "Real Madrid",        fk: 86, pk: 76 },
];

// 23 active Goalkeepers — FKS & PKS stats 1-99
// Players without clubs (Retired, Free Agent) are excluded
const GOALKEEPERS: Omit<PlayerSeed, "is_gk">[] = [
  { name: "Alisson Becker",      initials: "AB",  position: "GK", country: "Brazil",      club: "Liverpool",          fks: 86, pks: 88 },
  { name: "Manuel Neuer",        initials: "MN",  position: "GK", country: "Germany",     club: "Bayern Munich",      fks: 88, pks: 86 },
  { name: "Ederson",             initials: "Ed",  position: "GK", country: "Brazil",      club: "Manchester City",    fks: 84, pks: 86 },
  { name: "Marc-André ter Stegen",initials:"MTS", position: "GK", country: "Germany",     club: "Barcelona",          fks: 86, pks: 84 },
  { name: "Thibaut Courtois",    initials: "TC",  position: "GK", country: "Belgium",     club: "Real Madrid",        fks: 88, pks: 90 },
  { name: "Jan Oblak",           initials: "JO",  position: "GK", country: "Slovenia",    club: "Atlético Madrid",    fks: 86, pks: 88 },
  { name: "Gianluigi Donnarumma",initials: "GD",  position: "GK", country: "Italy",       club: "PSG",                fks: 84, pks: 86 },
  { name: "Andriy Lunin",        initials: "ALu", position: "GK", country: "Ukraine",     club: "Real Madrid",        fks: 80, pks: 82 },
  { name: "Emiliano Martínez",   initials: "EM",  position: "GK", country: "Argentina",   club: "Aston Villa",        fks: 84, pks: 92 },
  { name: "Mike Maignan",        initials: "MM2", position: "GK", country: "France",      club: "AC Milan",           fks: 84, pks: 86 },
  { name: "Fernando Muslera",    initials: "FM",  position: "GK", country: "Uruguay",     club: "Galatasaray",        fks: 78, pks: 80 },
  { name: "Kasper Schmeichel",   initials: "KS",  position: "GK", country: "Denmark",     club: "Anderlecht",         fks: 80, pks: 82 },
  { name: "David de Gea",        initials: "DDG", position: "GK", country: "Spain",       club: "Fiorentina",         fks: 80, pks: 88 },
  { name: "Claudio Bravo",       initials: "CB2", position: "GK", country: "Chile",       club: "Real Betis",         fks: 76, pks: 78 },
  { name: "Neto",                initials: "Net", position: "GK", country: "Brazil",      club: "Bournemouth",        fks: 74, pks: 78 },
  { name: "Paulo Gazzaniga",     initials: "PG",  position: "GK", country: "Argentina",   club: "Girona",             fks: 74, pks: 76 },
  { name: "Alphonse Areola",     initials: "AA",  position: "GK", country: "France",      club: "West Ham",           fks: 76, pks: 80 },
  { name: "Stefan Ortega",       initials: "SO",  position: "GK", country: "Germany",     club: "Manchester City",    fks: 78, pks: 80 },
  { name: "Diogo Costa",         initials: "DC2", position: "GK", country: "Portugal",    club: "Porto",              fks: 82, pks: 84 },
  { name: "André Onana",         initials: "AO",  position: "GK", country: "Cameroon",    club: "Manchester United",  fks: 80, pks: 82 },
  { name: "Bono",                initials: "Bon", position: "GK", country: "Morocco",     club: "Sevilla",            fks: 78, pks: 80 },
  { name: "Guglielmo Vicario",   initials: "GV",  position: "GK", country: "Italy",       club: "Tottenham",          fks: 80, pks: 82 },
  { name: "Pedro Ortiz",         initials: "PO",  position: "GK", country: "Spain",       club: "Atletico Madrid B",  fks: 72, pks: 74 },
];

export function seedDatabase(): void {
  const shooters: PlayerSeed[] = SHOOTERS.map((s) => ({ ...s, is_gk: false }));
  const goalkeepers: PlayerSeed[] = GOALKEEPERS.map((g) => ({ ...g, is_gk: true }));
  const uniqueShooters = Array.from(
    new Map(shooters.map((s) => [s.name, s])).values(),
  ).slice(0, 100);
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
        const tacticalPosition = p.is_gk
          ? "GK"
          : p.position === "MF"
          ? "CM"
          : "ST";
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
