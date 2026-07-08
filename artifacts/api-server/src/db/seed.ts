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

// 100 real active Shooters (is_gk = false) — FK & PK stats 1-99
const SHOOTERS: Omit<PlayerSeed, "is_gk">[] = [
  { name: "Kylian Mbappé",       initials: "KM",  position: "FW", country: "France",      club: "Real Madrid",        fk: 96, pk: 94 },
  { name: "Erling Haaland",      initials: "EH",  position: "FW", country: "Norway",      club: "Manchester City",    fk: 62, pk: 97 },
  { name: "Vinicius Jr",         initials: "VJ",  position: "FW", country: "Brazil",      club: "Real Madrid",        fk: 81, pk: 78 },
  { name: "Bukayo Saka",         initials: "BS",  position: "FW", country: "England",     club: "Arsenal",            fk: 84, pk: 82 },
  { name: "Marcus Rashford",     initials: "MR",  position: "FW", country: "England",     club: "Manchester United",  fk: 80, pk: 79 },
  { name: "Phil Foden",          initials: "PF",  position: "MF", country: "England",     club: "Manchester City",    fk: 83, pk: 80 },
  { name: "Mohamed Salah",       initials: "MS",  position: "FW", country: "Egypt",       club: "Liverpool",          fk: 87, pk: 91 },
  { name: "Robert Lewandowski",  initials: "RL",  position: "FW", country: "Poland",      club: "Barcelona",          fk: 79, pk: 92 },
  { name: "Harry Kane",          initials: "HK",  position: "FW", country: "England",     club: "Bayern Munich",      fk: 82, pk: 95 },
  { name: "Lautaro Martínez",    initials: "LM",  position: "FW", country: "Argentina",   club: "Inter Milan",        fk: 76, pk: 88 },
  { name: "Antoine Griezmann",   initials: "AG",  position: "FW", country: "France",      club: "Atlético Madrid",    fk: 85, pk: 86 },
  { name: "Álvaro Morata",       initials: "AM",  position: "FW", country: "Spain",       club: "AC Milan",           fk: 72, pk: 81 },
  { name: "Gabriel Jesus",       initials: "GJ",  position: "FW", country: "Brazil",      club: "Arsenal",            fk: 73, pk: 76 },
  { name: "Bernardo Silva",      initials: "BSi", position: "MF", country: "Portugal",    club: "Manchester City",    fk: 80, pk: 77 },
  { name: "Kevin De Bruyne",     initials: "KDB", position: "MF", country: "Belgium",     club: "Manchester City",    fk: 92, pk: 80 },
  { name: "Son Heung-min",       initials: "SHM", position: "FW", country: "South Korea", club: "Tottenham",          fk: 84, pk: 83 },
  { name: "Richarlison",         initials: "Ric", position: "FW", country: "Brazil",      club: "Tottenham",          fk: 69, pk: 75 },
  { name: "Julian Alvarez",      initials: "JA",  position: "FW", country: "Argentina",   club: "Atlético Madrid",    fk: 78, pk: 84 },
  { name: "Alejandro Garnacho",  initials: "AlG", position: "FW", country: "Argentina",   club: "Manchester United",  fk: 75, pk: 72 },
  { name: "Jadon Sancho",        initials: "JS",  position: "FW", country: "England",     club: "Chelsea",            fk: 77, pk: 74 },
  { name: "Jack Grealish",       initials: "JG",  position: "FW", country: "England",     club: "Manchester City",    fk: 74, pk: 71 },
  { name: "Cody Gakpo",          initials: "CG",  position: "FW", country: "Netherlands", club: "Liverpool",          fk: 76, pk: 78 },
  { name: "Darwin Núñez",        initials: "DN",  position: "FW", country: "Uruguay",     club: "Liverpool",          fk: 68, pk: 80 },
  { name: "Diogo Jota",          initials: "DJ",  position: "FW", country: "Portugal",    club: "Liverpool",          fk: 71, pk: 82 },
  { name: "Luis Díaz",           initials: "LD",  position: "FW", country: "Colombia",    club: "Liverpool",          fk: 79, pk: 77 },
  { name: "Gabriel Martinelli",  initials: "GM2", position: "FW", country: "Brazil",      club: "Arsenal",            fk: 75, pk: 73 },
  { name: "Rodrygo",             initials: "Rod", position: "FW", country: "Brazil",      club: "Real Madrid",        fk: 78, pk: 76 },
  { name: "Kai Havertz",         initials: "KH",  position: "FW", country: "Germany",     club: "Arsenal",            fk: 78, pk: 79 },
  { name: "Leroy Sané",          initials: "LS",  position: "FW", country: "Germany",     club: "Bayern Munich",      fk: 82, pk: 76 },
  { name: "Sadio Mané",          initials: "SM",  position: "FW", country: "Senegal",     club: "Al-Nassr",           fk: 80, pk: 76 },
  { name: "Raheem Sterling",     initials: "RS",  position: "FW", country: "England",     club: "Arsenal",            fk: 78, pk: 74 },
  { name: "Lorenzo Pellegrini",  initials: "LP",  position: "MF", country: "Italy",       club: "Roma",               fk: 85, pk: 78 },
  { name: "Niclas Füllkrug",     initials: "NF",  position: "FW", country: "Germany",     club: "West Ham",           fk: 74, pk: 84 },
  { name: "Paulo Dybala",        initials: "PD",  position: "FW", country: "Argentina",   club: "Roma",               fk: 86, pk: 85 },
  { name: "Federico Valverde",   initials: "FV",  position: "MF", country: "Uruguay",     club: "Real Madrid",        fk: 80, pk: 76 },
  { name: "Lamine Yamal",        initials: "LY",  position: "FW", country: "Spain",       club: "Barcelona",          fk: 84, pk: 78 },
  { name: "Nico Williams",       initials: "NW",  position: "FW", country: "Spain",       club: "Athletic Bilbao",    fk: 80, pk: 74 },
  { name: "Xavi Simons",         initials: "XS",  position: "MF", country: "Netherlands", club: "PSG",                fk: 82, pk: 78 },
  { name: "Warren Zaïre-Emery",  initials: "WZE", position: "MF", country: "France",      club: "PSG",                fk: 76, pk: 72 },
  { name: "Endrick",             initials: "End", position: "FW", country: "Brazil",      club: "Real Madrid",        fk: 74, pk: 80 },
  { name: "Mathys Tel",          initials: "MT",  position: "FW", country: "France",      club: "Bayern Munich",      fk: 72, pk: 76 },
  { name: "Evan Ferguson",       initials: "EF",  position: "FW", country: "Ireland",     club: "Brighton",           fk: 71, pk: 82 },
  { name: "Karim Adeyemi",       initials: "KA",  position: "FW", country: "Germany",     club: "Borussia Dortmund",  fk: 76, pk: 72 },
  { name: "Désiré Doué",         initials: "DD",  position: "FW", country: "France",      club: "PSG",                fk: 78, pk: 74 },
  { name: "Michael Olise",       initials: "MO",  position: "FW", country: "France",      club: "Bayern Munich",      fk: 82, pk: 76 },
  { name: "Rasmus Højlund",      initials: "RH",  position: "FW", country: "Denmark",     club: "Manchester United",  fk: 70, pk: 82 },
  { name: "Ivan Toney",          initials: "IT",  position: "FW", country: "England",     club: "Al-Ahli",            fk: 76, pk: 86 },
  { name: "Marcus Thuram",       initials: "MTh", position: "FW", country: "France",      club: "Inter Milan",        fk: 72, pk: 80 },
  { name: "Sébastien Haller",    initials: "SH",  position: "FW", country: "Ivory Coast", club: "Borussia Dortmund",  fk: 68, pk: 78 },
  { name: "Tammy Abraham",       initials: "TA",  position: "FW", country: "England",     club: "AC Milan",           fk: 69, pk: 78 },
  { name: "Gonçalo Ramos",       initials: "GR",  position: "FW", country: "Portugal",    club: "PSG",                fk: 72, pk: 82 },
  { name: "Artem Dovbyk",        initials: "ArD", position: "FW", country: "Ukraine",     club: "Roma",               fk: 70, pk: 80 },
  { name: "Mateo Retegui",       initials: "MRe", position: "FW", country: "Italy",       club: "Atalanta",           fk: 71, pk: 82 },
  { name: "Santiago Giménez",    initials: "SG2", position: "FW", country: "Mexico",      club: "AC Milan",           fk: 70, pk: 82 },
  { name: "Ollie Watkins",       initials: "OW",  position: "FW", country: "England",     club: "Aston Villa",        fk: 72, pk: 82 },
  { name: "Erling Braut Haaland",initials: "EBH", position: "FW", country: "Norway",      club: "Manchester City",    fk: 63, pk: 96 },
  { name: "Benjamin Šeško",      initials: "BŠ",  position: "FW", country: "Slovenia",    club: "RB Leipzig",         fk: 70, pk: 82 },
  { name: "Cole Palmer",         initials: "CP",  position: "MF", country: "England",     club: "Chelsea",            fk: 84, pk: 84 },
  { name: "Jude Bellingham",     initials: "JB",  position: "MF", country: "England",     club: "Real Madrid",        fk: 82, pk: 76 },
  { name: "Pedri González",      initials: "PeG", position: "MF", country: "Spain",       club: "Barcelona",          fk: 80, pk: 72 },
  { name: "Jamal Musiala",       initials: "JMu", position: "MF", country: "Germany",     club: "Bayern Munich",      fk: 84, pk: 76 },
  { name: "Arda Güler",          initials: "ArG", position: "MF", country: "Turkey",      club: "Real Madrid",        fk: 86, pk: 78 },
  { name: "Goncalo Inacio",      initials: "GI",  position: "FW", country: "Portugal",    club: "Sporting CP",        fk: 62, pk: 59 },
  { name: "Takefusa Kubo",       initials: "TK",  position: "FW", country: "Japan",       club: "Real Sociedad",      fk: 80, pk: 74 },
  { name: "Claudio Echeverri",   initials: "CE",  position: "FW", country: "Argentina",   club: "Manchester City",    fk: 74, pk: 70 },
  { name: "Bryan Zaragoza",      initials: "BZ",  position: "FW", country: "Spain",       club: "Bayern Munich",      fk: 76, pk: 70 },
  { name: "Neymar Jr",           initials: "NJr", position: "FW", country: "Brazil",      club: "Al-Hilal",           fk: 88, pk: 86 },
  { name: "Lionel Messi",        initials: "LMe", position: "FW", country: "Argentina",   club: "Inter Miami",        fk: 94, pk: 90 },
  { name: "Cristiano Ronaldo",   initials: "CR7", position: "FW", country: "Portugal",    club: "Al-Nassr",           fk: 84, pk: 92 },
  { name: "Zlatan Ibrahimović",  initials: "ZI",  position: "FW", country: "Sweden",      club: "AC Milan",           fk: 88, pk: 84 },
  { name: "Karim Benzema",       initials: "KB",  position: "FW", country: "France",      club: "Al-Ittihad",         fk: 84, pk: 88 },
  { name: "Luis Suárez",         initials: "LuS", position: "FW", country: "Uruguay",     club: "River Plate",        fk: 76, pk: 82 },
  { name: "Pierre-Emerick Aubameyang", initials: "PEA", position: "FW", country: "Gabon", club: "Marseille",         fk: 76, pk: 78 },
  { name: "Lorenzo Insigne",     initials: "LIn", position: "FW", country: "Italy",       club: "Toronto FC",         fk: 84, pk: 82 },
  { name: "Dries Mertens",       initials: "DM",  position: "FW", country: "Belgium",     club: "Galatasaray",        fk: 82, pk: 80 },
  { name: "Franck Ribéry",       initials: "FR",  position: "FW", country: "France",      club: "Salernitana",        fk: 80, pk: 74 },
  { name: "Gareth Bale",         initials: "GBa", position: "FW", country: "Wales",       club: "Retired",            fk: 84, pk: 80 },
  { name: "Eden Hazard",         initials: "EHz", position: "FW", country: "Belgium",     club: "Retired",            fk: 82, pk: 76 },
  { name: "Diego Costa",         initials: "DCo", position: "FW", country: "Spain",       club: "Wolverhampton",      fk: 72, pk: 80 },
  { name: "Romelu Lukaku",       initials: "RLu", position: "FW", country: "Belgium",     club: "Napoli",             fk: 68, pk: 82 },
  { name: "Wissam Ben Yedder",   initials: "WBY", position: "FW", country: "France",      club: "Free Agent",         fk: 72, pk: 82 },
  { name: "Edin Džeko",          initials: "EDž", position: "FW", country: "Bosnia",      club: "Fenerbahçe",         fk: 72, pk: 78 },
  { name: "Roberto Firmino",     initials: "RF",  position: "FW", country: "Brazil",      club: "Al-Ahli",            fk: 74, pk: 76 },
  { name: "Thomas Müller",       initials: "TMü", position: "FW", country: "Germany",     club: "LA Galaxy",          fk: 76, pk: 72 },
  { name: "Sergio Agüero",       initials: "SAg", position: "FW", country: "Argentina",   club: "Retired",            fk: 80, pk: 86 },
  { name: "Iago Aspas",          initials: "IAsp",position: "FW", country: "Spain",       club: "Celta Vigo",         fk: 84, pk: 82 },
  { name: "Sebastián Villa",     initials: "SV",  position: "FW", country: "Argentina",   club: "Boca Juniors",       fk: 80, pk: 76 },
  { name: "Memphis Depay",       initials: "MDe", position: "FW", country: "Netherlands", club: "Corinthians",        fk: 82, pk: 78 },
  { name: "Mario Götze",         initials: "MGö", position: "FW", country: "Germany",     club: "Eintracht Frankfurt",fk: 80, pk: 76 },
  { name: "Ivan Rakitić",        initials: "IRak",position: "MF", country: "Croatia",     club: "Hajduk Split",       fk: 84, pk: 76 },
  { name: "Thiago Alcántara",    initials: "ThA", position: "MF", country: "Spain",       club: "Retired",            fk: 80, pk: 72 },
  { name: "James Rodríguez",     initials: "JRod",position: "MF", country: "Colombia",    club: "Rayo Vallecano",     fk: 88, pk: 80 },
  { name: "Christian Eriksen",   initials: "ChE", position: "MF", country: "Denmark",     club: "Manchester United",  fk: 88, pk: 80 },
  { name: "Isco",                initials: "Isc", position: "MF", country: "Spain",       club: "Betis",              fk: 84, pk: 78 },
  { name: "Marco Verratti",      initials: "MVer",position: "MF", country: "Italy",       club: "Al-Arabi",           fk: 78, pk: 70 },
  { name: "Toni Kroos",          initials: "TKr", position: "MF", country: "Germany",     club: "Retired",            fk: 90, pk: 78 },
  { name: "David Silva",         initials: "DSi", position: "MF", country: "Spain",       club: "Retired",            fk: 84, pk: 76 },
  { name: "Luka Modrić",         initials: "LMo", position: "MF", country: "Croatia",     club: "Real Madrid",        fk: 86, pk: 76 },
];

// 25 Goalkeepers — FKS & PKS stats 1-99
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
  { name: "Hugo Lloris",         initials: "HL",  position: "GK", country: "France",      club: "Retired",            fks: 84, pks: 82 },
  { name: "David de Gea",        initials: "DDG", position: "GK", country: "Spain",       club: "Free Agent",         fks: 80, pks: 88 },
  { name: "Claudio Bravo",       initials: "CB2", position: "GK", country: "Chile",       club: "Real Betis",         fks: 76, pks: 78 },
  { name: "Samir Handanović",    initials: "SH2", position: "GK", country: "Slovenia",    club: "Retired",            fks: 78, pks: 80 },
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
  const existingCount = (
    db.prepare("SELECT COUNT(*) as cnt FROM players_base WHERE is_bench_pool=0").get() as { cnt: number }
  ).cnt;

  if (existingCount >= 125) {
    logger.info({ existingCount }, "Database already seeded — skipping Gold Cards");
  } else {
    logger.info("Seeding 125 Gold Cards into players_base…");

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
          : "FW";
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

    const shooters: PlayerSeed[] = SHOOTERS.map((s) => ({ ...s, is_gk: false }));
    const goalkeepers: PlayerSeed[] = GOALKEEPERS.map((g) => ({ ...g, is_gk: true }));
    const uniqueShooters = Array.from(
      new Map(shooters.map((s) => [s.name, s])).values(),
    ).slice(0, 100);

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
