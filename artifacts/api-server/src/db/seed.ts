import db from "./database.js";
import { logger } from "../lib/logger.js";

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
  { name: "Gabriel Martinelli",  initials: "GM",  position: "FW", country: "Brazil",      club: "Arsenal",            fk: 75, pk: 73 },
  { name: "Leandro Trossard",    initials: "LT",  position: "FW", country: "Belgium",     club: "Arsenal",            fk: 81, pk: 76 },
  { name: "Ferran Torres",       initials: "FT",  position: "FW", country: "Spain",       club: "Barcelona",          fk: 78, pk: 75 },
  { name: "Ansu Fati",           initials: "AF",  position: "FW", country: "Spain",       club: "Brighton",           fk: 72, pk: 70 },
  { name: "Randal Kolo Muani",   initials: "RKM", position: "FW", country: "France",      club: "Juventus",           fk: 74, pk: 78 },
  { name: "Christopher Nkunku",  initials: "CN",  position: "FW", country: "France",      club: "Chelsea",            fk: 82, pk: 79 },
  { name: "Marcus Thuram",       initials: "MT",  position: "FW", country: "France",      club: "Inter Milan",        fk: 70, pk: 75 },
  { name: "Dusan Vlahovic",      initials: "DV",  position: "FW", country: "Serbia",      club: "Juventus",           fk: 83, pk: 85 },
  { name: "Kenan Yıldız",        initials: "KY",  position: "FW", country: "Turkey",      club: "Juventus",           fk: 76, pk: 73 },
  { name: "Federico Chiesa",     initials: "FC",  position: "FW", country: "Italy",       club: "Liverpool",          fk: 80, pk: 77 },
  { name: "Victor Osimhen",      initials: "VO",  position: "FW", country: "Nigeria",     club: "Galatasaray",        fk: 67, pk: 82 },
  { name: "Kaoru Mitoma",        initials: "KMi", position: "FW", country: "Japan",       club: "Brighton",           fk: 77, pk: 73 },
  { name: "João Pedro",          initials: "JP",  position: "FW", country: "Brazil",      club: "Brighton",           fk: 74, pk: 78 },
  { name: "Rasmus Højlund",      initials: "RH",  position: "FW", country: "Denmark",     club: "Manchester United",  fk: 71, pk: 77 },
  { name: "Joshua Zirkzee",      initials: "JZ",  position: "FW", country: "Netherlands", club: "Manchester United",  fk: 73, pk: 75 },
  { name: "Bruno Fernandes",     initials: "BF",  position: "MF", country: "Portugal",    club: "Manchester United",  fk: 88, pk: 86 },
  { name: "Nicolás Jackson",     initials: "NJ",  position: "FW", country: "Senegal",     club: "Chelsea",            fk: 69, pk: 78 },
  { name: "Mykhailo Mudryk",     initials: "MM",  position: "FW", country: "Ukraine",     club: "Chelsea",            fk: 73, pk: 70 },
  { name: "Cole Palmer",         initials: "CP",  position: "MF", country: "England",     club: "Chelsea",            fk: 87, pk: 89 },
  { name: "Noni Madueke",        initials: "NM",  position: "FW", country: "England",     club: "Chelsea",            fk: 76, pk: 74 },
  { name: "Jeremy Doku",         initials: "JDo", position: "FW", country: "Belgium",     club: "Manchester City",    fk: 75, pk: 72 },
  { name: "Savinho",             initials: "Sav", position: "FW", country: "Brazil",      club: "Manchester City",    fk: 78, pk: 74 },
  { name: "Anthony Gordon",      initials: "AnG", position: "FW", country: "England",     club: "Newcastle",          fk: 79, pk: 76 },
  { name: "Alexander Isak",      initials: "AI",  position: "FW", country: "Sweden",      club: "Newcastle",          fk: 77, pk: 83 },
  { name: "Harvey Barnes",       initials: "HB",  position: "FW", country: "England",     club: "Newcastle",          fk: 75, pk: 73 },
  { name: "Eberechi Eze",        initials: "EEz", position: "FW", country: "England",     club: "Crystal Palace",     fk: 83, pk: 80 },
  { name: "Michael Olise",       initials: "MO",  position: "FW", country: "France",      club: "Bayern Munich",      fk: 85, pk: 81 },
  { name: "Jean-Philippe Mateta",initials: "JPM", position: "FW", country: "France",      club: "Crystal Palace",     fk: 72, pk: 79 },
  { name: "Ollie Watkins",       initials: "OW",  position: "FW", country: "England",     club: "Aston Villa",        fk: 76, pk: 81 },
  { name: "Leon Bailey",         initials: "LB",  position: "FW", country: "Jamaica",     club: "Aston Villa",        fk: 80, pk: 74 },
  { name: "Jhon Durán",          initials: "JDu", position: "FW", country: "Colombia",    club: "Aston Villa",        fk: 71, pk: 80 },
  { name: "Brennan Johnson",     initials: "BJ",  position: "FW", country: "Wales",       club: "Tottenham",          fk: 74, pk: 72 },
  { name: "Dejan Kulusevski",    initials: "DK",  position: "MF", country: "Sweden",      club: "Tottenham",          fk: 79, pk: 77 },
  { name: "James Maddison",      initials: "JM",  position: "MF", country: "England",     club: "Tottenham",          fk: 87, pk: 82 },
  { name: "Takefusa Kubo",       initials: "TK",  position: "FW", country: "Japan",       club: "Real Sociedad",      fk: 82, pk: 78 },
  { name: "Jamal Musiala",       initials: "JMu", position: "MF", country: "Germany",     club: "Bayern Munich",      fk: 84, pk: 80 },
  { name: "Florian Wirtz",       initials: "FW",  position: "MF", country: "Germany",     club: "Bayer Leverkusen",   fk: 88, pk: 83 },
  { name: "Leroy Sané",          initials: "LSa", position: "FW", country: "Germany",     club: "Bayern Munich",      fk: 82, pk: 78 },
  { name: "Kingsley Coman",      initials: "KC",  position: "FW", country: "France",      club: "Bayern Munich",      fk: 78, pk: 75 },
  { name: "Thomas Müller",       initials: "TM",  position: "FW", country: "Germany",     club: "Bayern Munich",      fk: 75, pk: 72 },
  { name: "Granit Xhaka",        initials: "GX",  position: "MF", country: "Switzerland", club: "Bayer Leverkusen",   fk: 86, pk: 79 },
  { name: "Adam Hlozek",         initials: "AH",  position: "FW", country: "Czech Rep",   club: "Bayer Leverkusen",   fk: 72, pk: 70 },
  { name: "Jonathan David",      initials: "JDa", position: "FW", country: "Canada",      club: "Lille",              fk: 79, pk: 85 },
  { name: "Evan Ferguson",       initials: "EF",  position: "FW", country: "Ireland",     club: "Brighton",           fk: 70, pk: 78 },
  { name: "Dani Olmo",           initials: "DO",  position: "MF", country: "Spain",       club: "Barcelona",          fk: 84, pk: 79 },
  { name: "Pedri",               initials: "Ped", position: "MF", country: "Spain",       club: "Barcelona",          fk: 83, pk: 78 },
  { name: "Gavi",                initials: "Gav", position: "MF", country: "Spain",       club: "Barcelona",          fk: 82, pk: 77 },
  { name: "Lamine Yamal",        initials: "LY",  position: "FW", country: "Spain",       club: "Barcelona",          fk: 88, pk: 81 },
  { name: "Raphinha",            initials: "Rap", position: "FW", country: "Brazil",      club: "Barcelona",          fk: 87, pk: 82 },
  { name: "Domenico Berardi",    initials: "DB",  position: "FW", country: "Italy",       club: "Sassuolo",           fk: 85, pk: 84 },
  { name: "Khvicha Kvaratskhelia",initials: "KK", position: "FW", country: "Georgia",     club: "PSG",                fk: 86, pk: 79 },
  { name: "Ousmane Dembélé",     initials: "OD",  position: "FW", country: "France",      club: "PSG",                fk: 80, pk: 74 },
  { name: "Bradley Barcola",     initials: "BBa", position: "FW", country: "France",      club: "PSG",                fk: 77, pk: 73 },
  { name: "Artem Dovbyk",        initials: "AD",  position: "FW", country: "Ukraine",     club: "Roma",               fk: 72, pk: 82 },
  { name: "Paulo Dybala",        initials: "PD",  position: "FW", country: "Argentina",   club: "Roma",               fk: 88, pk: 87 },
  { name: "Lorenzo Pellegrini",  initials: "LP",  position: "MF", country: "Italy",       club: "Roma",               fk: 84, pk: 80 },
  { name: "Luka Modric",         initials: "LMo", position: "MF", country: "Croatia",     club: "Real Madrid",        fk: 85, pk: 78 },
  { name: "Jude Bellingham",     initials: "JB",  position: "MF", country: "England",     club: "Real Madrid",        fk: 84, pk: 83 },
  { name: "Rodrygo",             initials: "Rod", position: "FW", country: "Brazil",      club: "Real Madrid",        fk: 80, pk: 78 },
  { name: "Nicola Zalewski",     initials: "NZ",  position: "MF", country: "Poland",      club: "Inter Milan",        fk: 79, pk: 73 },
  { name: "Hakan Çalhanoğlu",    initials: "HC",  position: "MF", country: "Turkey",      club: "Inter Milan",        fk: 87, pk: 85 },
  { name: "Ivan Toney",           initials: "IT",  position: "FW", country: "England",     club: "Al-Ahli",            fk: 71, pk: 89 },
  { name: "Federico Dimarco",    initials: "FD",  position: "DF", country: "Italy",       club: "Inter Milan",        fk: 85, pk: 73 },
  { name: "Kenan Karaman",       initials: "KeK", position: "FW", country: "Turkey",      club: "Galatasaray",        fk: 76, pk: 80 },
  { name: "Mauro Icardi",        initials: "MI",  position: "FW", country: "Argentina",   club: "Galatasaray",        fk: 70, pk: 86 },
  { name: "Patrick Schick",      initials: "PS",  position: "FW", country: "Czech Rep",   club: "Bayer Leverkusen",   fk: 78, pk: 83 },
  { name: "Serge Gnabry",        initials: "SG",  position: "FW", country: "Germany",     club: "Bayern Munich",      fk: 78, pk: 74 },
  { name: "Amine Gouiri",        initials: "AmG", position: "FW", country: "Algeria",     club: "Rennes",             fk: 82, pk: 79 },
  { name: "Wissam Ben Yedder",   initials: "WBY", position: "FW", country: "France",      club: "Monaco",             fk: 81, pk: 88 },
  { name: "Elye Wahi",           initials: "EW",  position: "FW", country: "France",      club: "Marseille",          fk: 74, pk: 78 },
  { name: "Mason Mount",         initials: "MMo", position: "MF", country: "England",     club: "Manchester United",  fk: 83, pk: 80 },
  { name: "Pedro Neto",          initials: "PN",  position: "FW", country: "Portugal",    club: "Chelsea",            fk: 80, pk: 75 },
  { name: "Mikel Oyarzabal",     initials: "MOy", position: "FW", country: "Spain",       club: "Real Sociedad",      fk: 83, pk: 85 },
  { name: "Vinícius Tobias",     initials: "VT",  position: "DF", country: "Brazil",      club: "Real Madrid",        fk: 72, pk: 68 },
  { name: "Neymar Jr",           initials: "Ney", position: "FW", country: "Brazil",      club: "Al-Hilal",           fk: 92, pk: 90 },
];

// 25 real active Goalkeepers (is_gk = true) — FKS & PKS stats 1-99
const GOALKEEPERS: Omit<PlayerSeed, "is_gk">[] = [
  { name: "Alisson Becker",      initials: "AB",  position: "GK", country: "Brazil",      club: "Liverpool",          fks: 89, pks: 91 },
  { name: "Ederson",             initials: "Ede", position: "GK", country: "Brazil",      club: "Manchester City",    fks: 85, pks: 88 },
  { name: "Thibaut Courtois",    initials: "TC",  position: "GK", country: "Belgium",     club: "Real Madrid",        fks: 90, pks: 92 },
  { name: "Manuel Neuer",        initials: "MN",  position: "GK", country: "Germany",     club: "Bayern Munich",      fks: 86, pks: 87 },
  { name: "Marc-André ter Stegen",initials: "MTS",position: "GK", country: "Germany",     club: "Barcelona",          fks: 88, pks: 89 },
  { name: "Jordan Pickford",     initials: "JPi", position: "GK", country: "England",     club: "Everton",            fks: 81, pks: 85 },
  { name: "Gianluigi Donnarumma",initials: "GD",  position: "GK", country: "Italy",       club: "PSG",                fks: 88, pks: 90 },
  { name: "Mike Maignan",        initials: "MiM", position: "GK", country: "France",      club: "AC Milan",           fks: 87, pks: 88 },
  { name: "Jan Oblak",           initials: "JO",  position: "GK", country: "Slovenia",    club: "Atlético Madrid",    fks: 91, pks: 93 },
  { name: "André Onana",         initials: "AO",  position: "GK", country: "Cameroon",    club: "Manchester United",  fks: 84, pks: 86 },
  { name: "Yann Sommer",         initials: "YS",  position: "GK", country: "Switzerland", club: "Inter Milan",        fks: 85, pks: 87 },
  { name: "Kevin Trapp",         initials: "KT",  position: "GK", country: "Germany",     club: "Eintracht Frankfurt",fks: 82, pks: 84 },
  { name: "Bernd Leno",          initials: "BL",  position: "GK", country: "Germany",     club: "Fulham",             fks: 80, pks: 83 },
  { name: "Nick Pope",           initials: "NP",  position: "GK", country: "England",     club: "Newcastle",          fks: 83, pks: 86 },
  { name: "Aaron Ramsdale",      initials: "AR",  position: "GK", country: "England",     club: "Southampton",        fks: 79, pks: 82 },
  { name: "Sam Johnstone",       initials: "SJ",  position: "GK", country: "England",     club: "Crystal Palace",     fks: 78, pks: 80 },
  { name: "Mat Ryan",            initials: "MaR", position: "GK", country: "Australia",   club: "Real Sociedad",      fks: 79, pks: 81 },
  { name: "Wojciech Szczęsny",   initials: "WSz", position: "GK", country: "Poland",      club: "Barcelona",          fks: 84, pks: 86 },
  { name: "Gregor Kobel",        initials: "GK",  position: "GK", country: "Switzerland", club: "Borussia Dortmund",  fks: 83, pks: 85 },
  { name: "Lukáš Hrádecký",      initials: "LH",  position: "GK", country: "Finland",     club: "Bayer Leverkusen",   fks: 82, pks: 84 },
  { name: "Peter Gulácsi",       initials: "PG",  position: "GK", country: "Hungary",     club: "RB Leipzig",         fks: 80, pks: 83 },
  { name: "David Raya",          initials: "DR",  position: "GK", country: "Spain",       club: "Arsenal",            fks: 86, pks: 88 },
  { name: "Diogo Costa",         initials: "DC",  position: "GK", country: "Portugal",    club: "Porto",              fks: 85, pks: 89 },
  { name: "Unai Simón",          initials: "US",  position: "GK", country: "Spain",       club: "Athletic Bilbao",    fks: 83, pks: 85 },
  { name: "Rui Patrício",        initials: "RP",  position: "GK", country: "Portugal",    club: "Roma",               fks: 81, pks: 83 },
];

export function seedDatabase(): void {
  const existingCount = (
    db.prepare("SELECT COUNT(*) as cnt FROM players_base").get() as { cnt: number }
  ).cnt;

  if (existingCount >= 125) {
    logger.info({ existingCount }, "Database already seeded — skipping");
    return;
  }

  logger.info("Seeding 125 Gold Cards into players_base…");

  // INSERT OR IGNORE: UNIQUE constraint on name makes this idempotent
  const insert = db.prepare(`
    INSERT OR IGNORE INTO players_base (name, initials, position, country, club, is_gk, fk, pk, fks, pks)
    VALUES (@name, @initials, @position, @country, @club, @is_gk, @fk, @pk, @fks, @pks)
  `);

  const insertMany = db.transaction((players: PlayerSeed[]) => {
    for (const p of players) {
      insert.run({
        name:     p.name,
        initials: p.initials,
        position: p.position,
        country:  p.country,
        club:     p.club,
        is_gk:    p.is_gk ? 1 : 0,
        fk:       p.fk  ?? null,
        pk:       p.pk  ?? null,
        fks:      p.fks ?? null,
        pks:      p.pks ?? null,
      });
    }
  });

  const shooters: PlayerSeed[] = SHOOTERS.map(s => ({ ...s, is_gk: false }));
  const goalkeepers: PlayerSeed[] = GOALKEEPERS.map(g => ({ ...g, is_gk: true }));

  // Deduplicate shooters by name in case of duplicates in seed list
  const uniqueShooters = Array.from(
    new Map(shooters.map(s => [s.name, s])).values()
  ).slice(0, 100);

  if (uniqueShooters.length < 100) {
    logger.warn({ count: uniqueShooters.length }, "Shooter seed has fewer than 100 unique entries");
  }

  insertMany([...uniqueShooters, ...goalkeepers]);

  const finalCount = (
    db.prepare("SELECT COUNT(*) as cnt FROM players_base").get() as { cnt: number }
  ).cnt;
  logger.info({ finalCount }, "Seeding complete");
}
