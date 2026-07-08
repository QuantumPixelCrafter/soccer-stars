/**
 * Bench Player Pool — Silver tier starter cards (rating range 60–78)
 * Clubs current as of 2025–26 season (Wikipedia).
 * Drawn exclusively for the Free 11-Player Starter Pack.
 */

export interface BenchPlayer {
  name: string;
  initials: string;
  tactical_position: string;
  country: string;
  club: string;
  is_gk: boolean;
  fk?: number;
  pk?: number;
  fks?: number;
  pks?: number;
  overall: number;
}

export const BENCH_PLAYERS: BenchPlayer[] = [
  // ── Goalkeepers (10) ──────────────────────────────────────────────────────
  { name: "Jordan Pickford",       initials: "JP",  tactical_position: "GK", country: "England",      club: "Everton",             is_gk: true,  fks: 74, pks: 73, overall: 74 },
  { name: "David Raya",            initials: "DR",  tactical_position: "GK", country: "Spain",        club: "Arsenal",             is_gk: true,  fks: 75, pks: 77, overall: 76 },
  { name: "Keylor Navas",          initials: "KN",  tactical_position: "GK", country: "Costa Rica",   club: "Pumas UNAM",          is_gk: true,  fks: 74, pks: 71, overall: 73 },
  { name: "Lukáš Hrádecký",        initials: "LH",  tactical_position: "GK", country: "Finland",      club: "Bayer Leverkusen",    is_gk: true,  fks: 71, pks: 72, overall: 72 },
  { name: "Unai Simón",            initials: "US",  tactical_position: "GK", country: "Spain",        club: "Athletic Bilbao",     is_gk: true,  fks: 76, pks: 74, overall: 75 },
  { name: "Gregor Kobel",          initials: "GK2", tactical_position: "GK", country: "Switzerland",  club: "Borussia Dortmund",   is_gk: true,  fks: 77, pks: 76, overall: 77 },
  { name: "Giorgi Mamardashvili",  initials: "GM",  tactical_position: "GK", country: "Georgia",      club: "Liverpool",           is_gk: true,  fks: 74, pks: 72, overall: 73 },
  { name: "Rui Patrício",          initials: "RP",  tactical_position: "GK", country: "Portugal",     club: "Roma",                is_gk: true,  fks: 71, pks: 70, overall: 71 },
  { name: "Yann Sommer",           initials: "YS",  tactical_position: "GK", country: "Switzerland",  club: "Inter Milan",         is_gk: true,  fks: 75, pks: 74, overall: 75 },
  { name: "Matz Sels",             initials: "MS2", tactical_position: "GK", country: "Belgium",      club: "Nottm Forest",        is_gk: true,  fks: 72, pks: 73, overall: 73 },

  // ── Centre Backs (10) ─────────────────────────────────────────────────────
  { name: "Rúben Dias",            initials: "RD",  tactical_position: "CB", country: "Portugal",     club: "Manchester City",     is_gk: false, fk: 65, pk: 61, overall: 78 },
  { name: "Kalidou Koulibaly",     initials: "KK",  tactical_position: "CB", country: "Senegal",      club: "Al-Hilal",            is_gk: false, fk: 62, pk: 58, overall: 75 },
  { name: "Dayot Upamecano",       initials: "DU",  tactical_position: "CB", country: "France",       club: "Bayern Munich",       is_gk: false, fk: 61, pk: 57, overall: 74 },
  { name: "Pau Torres",            initials: "PT",  tactical_position: "CB", country: "Spain",        club: "Aston Villa",         is_gk: false, fk: 66, pk: 61, overall: 75 },
  { name: "Fikayo Tomori",         initials: "FT",  tactical_position: "CB", country: "England",      club: "AC Milan",            is_gk: false, fk: 63, pk: 58, overall: 74 },
  { name: "Gleison Bremer",        initials: "GB",  tactical_position: "CB", country: "Brazil",       club: "Juventus",            is_gk: false, fk: 61, pk: 57, overall: 75 },
  { name: "Ibrahima Konaté",       initials: "IK",  tactical_position: "CB", country: "France",       club: "Liverpool",           is_gk: false, fk: 63, pk: 58, overall: 76 },
  { name: "Fabian Schär",          initials: "FS",  tactical_position: "CB", country: "Switzerland",  club: "Newcastle United",    is_gk: false, fk: 65, pk: 60, overall: 72 },
  { name: "Ezri Konsa",            initials: "EK",  tactical_position: "CB", country: "England",      club: "Aston Villa",         is_gk: false, fk: 60, pk: 56, overall: 71 },
  { name: "Mats Hummels",          initials: "MH",  tactical_position: "CB", country: "Germany",      club: "Roma",                is_gk: false, fk: 64, pk: 59, overall: 73 },

  // ── Right Backs (5) ───────────────────────────────────────────────────────
  { name: "Trent Alexander-Arnold",initials: "TAA", tactical_position: "RB", country: "England",      club: "Real Madrid",         is_gk: false, fk: 85, pk: 71, overall: 78 },
  { name: "Reece James",           initials: "RJ",  tactical_position: "RB", country: "England",      club: "Chelsea",             is_gk: false, fk: 73, pk: 67, overall: 76 },
  { name: "Achraf Hakimi",         initials: "AH",  tactical_position: "RB", country: "Morocco",      club: "PSG",                 is_gk: false, fk: 75, pk: 69, overall: 78 },
  { name: "Denzel Dumfries",       initials: "DD",  tactical_position: "RB", country: "Netherlands",  club: "Inter Milan",         is_gk: false, fk: 70, pk: 64, overall: 74 },
  { name: "Jonathan Clauss",       initials: "JC",  tactical_position: "RB", country: "France",       club: "Nice",                is_gk: false, fk: 69, pk: 63, overall: 70 },

  // ── Left Backs (5) ────────────────────────────────────────────────────────
  { name: "Theo Hernández",        initials: "TH",  tactical_position: "LB", country: "France",       club: "AC Milan",            is_gk: false, fk: 74, pk: 68, overall: 78 },
  { name: "Alejandro Grimaldo",    initials: "AGr", tactical_position: "LB", country: "Spain",        club: "Bayer Leverkusen",    is_gk: false, fk: 73, pk: 67, overall: 76 },
  { name: "Destiny Udogie",        initials: "DeU", tactical_position: "LB", country: "Italy",        club: "Tottenham",           is_gk: false, fk: 68, pk: 63, overall: 71 },
  { name: "Lucas Hernández",       initials: "LH2", tactical_position: "LB", country: "France",       club: "PSG",                 is_gk: false, fk: 70, pk: 64, overall: 73 },
  { name: "Ferdi Kadıoğlu",        initials: "FK",  tactical_position: "LB", country: "Turkey",       club: "Newcastle United",    is_gk: false, fk: 71, pk: 65, overall: 74 },

  // ── Central Midfielders (8) ───────────────────────────────────────────────
  { name: "Joshua Kimmich",        initials: "JK",  tactical_position: "CM", country: "Germany",      club: "Bayern Munich",       is_gk: false, fk: 84, pk: 76, overall: 78 },
  { name: "Florian Wirtz",         initials: "FlW", tactical_position: "CM", country: "Germany",      club: "Bayern Munich",       is_gk: false, fk: 82, pk: 74, overall: 77 },
  { name: "Pedri",                 initials: "Ped", tactical_position: "CM", country: "Spain",        club: "Barcelona",           is_gk: false, fk: 80, pk: 72, overall: 78 },
  { name: "Gavi",                  initials: "Gav", tactical_position: "CM", country: "Spain",        club: "Barcelona",           is_gk: false, fk: 76, pk: 70, overall: 76 },
  { name: "Bruno Fernandes",       initials: "BF",  tactical_position: "CM", country: "Portugal",     club: "Manchester United",   is_gk: false, fk: 88, pk: 78, overall: 77 },
  { name: "Vitinha",               initials: "Vit", tactical_position: "CM", country: "Portugal",     club: "PSG",                 is_gk: false, fk: 76, pk: 70, overall: 75 },
  { name: "Alexis Mac Allister",   initials: "AMA", tactical_position: "CM", country: "Argentina",    club: "Liverpool",           is_gk: false, fk: 78, pk: 72, overall: 77 },
  { name: "Nicolò Barella",        initials: "NB",  tactical_position: "CM", country: "Italy",        club: "Inter Milan",         is_gk: false, fk: 78, pk: 72, overall: 77 },

  // ── Defensive Midfielders (7) ─────────────────────────────────────────────
  { name: "Casemiro",              initials: "Cas", tactical_position: "CDM", country: "Brazil",      club: "Manchester United",   is_gk: false, fk: 72, pk: 68, overall: 74 },
  { name: "N'Golo Kanté",          initials: "NGK", tactical_position: "CDM", country: "France",      club: "Al-Ittihad",          is_gk: false, fk: 70, pk: 65, overall: 75 },
  { name: "Rodri",                 initials: "Ro2", tactical_position: "CDM", country: "Spain",       club: "Manchester City",     is_gk: false, fk: 76, pk: 70, overall: 78 },
  { name: "Declan Rice",           initials: "DeR", tactical_position: "CDM", country: "England",     club: "Arsenal",             is_gk: false, fk: 78, pk: 72, overall: 77 },
  { name: "Aurélien Tchouaméni",   initials: "AT",  tactical_position: "CDM", country: "France",      club: "Real Madrid",         is_gk: false, fk: 70, pk: 65, overall: 75 },
  { name: "Manuel Ugarte",         initials: "MU",  tactical_position: "CDM", country: "Uruguay",     club: "Manchester United",   is_gk: false, fk: 68, pk: 63, overall: 72 },
  { name: "Manu Koné",             initials: "MK",  tactical_position: "CDM", country: "France",      club: "Real Madrid",         is_gk: false, fk: 66, pk: 61, overall: 70 },

  // ── Attacking Midfielders (5) ─────────────────────────────────────────────
  { name: "Martin Ødegaard",       initials: "MØ",  tactical_position: "CAM", country: "Norway",     club: "Arsenal",             is_gk: false, fk: 86, pk: 76, overall: 77 },
  { name: "James Maddison",        initials: "JM",  tactical_position: "CAM", country: "England",    club: "Tottenham",           is_gk: false, fk: 85, pk: 74, overall: 76 },
  { name: "Dani Olmo",             initials: "DO",  tactical_position: "CAM", country: "Spain",      club: "Barcelona",           is_gk: false, fk: 82, pk: 73, overall: 76 },
  { name: "Dominik Szoboszlai",    initials: "DS",  tactical_position: "CAM", country: "Hungary",    club: "Liverpool",           is_gk: false, fk: 84, pk: 74, overall: 76 },
  { name: "Leandro Trossard",      initials: "LT",  tactical_position: "CAM", country: "Belgium",    club: "Arsenal",             is_gk: false, fk: 76, pk: 68, overall: 73 },

  // ── Strikers (10) ─────────────────────────────────────────────────────────
  { name: "Victor Osimhen",        initials: "VO",  tactical_position: "ST", country: "Nigeria",      club: "Galatasaray",         is_gk: false, fk: 74, pk: 86, overall: 77 },
  { name: "Olivier Giroud",        initials: "OG",  tactical_position: "ST", country: "France",       club: "LA Galaxy",           is_gk: false, fk: 69, pk: 80, overall: 70 },
  { name: "Alexander Isak",        initials: "AI",  tactical_position: "ST", country: "Sweden",       club: "Newcastle United",    is_gk: false, fk: 76, pk: 84, overall: 77 },
  { name: "Ademola Lookman",       initials: "AL",  tactical_position: "ST", country: "Nigeria",      club: "Atalanta",            is_gk: false, fk: 74, pk: 78, overall: 74 },
  { name: "Jonathan David",        initials: "JD",  tactical_position: "ST", country: "Canada",       club: "Lille",               is_gk: false, fk: 72, pk: 84, overall: 76 },
  { name: "Mikel Oyarzabal",       initials: "MiO", tactical_position: "ST", country: "Spain",        club: "Real Sociedad",       is_gk: false, fk: 75, pk: 80, overall: 74 },
  { name: "Chris Wood",            initials: "CW",  tactical_position: "ST", country: "New Zealand",  club: "Nottm Forest",        is_gk: false, fk: 66, pk: 76, overall: 70 },
  { name: "Duván Zapata",          initials: "DZ",  tactical_position: "ST", country: "Colombia",     club: "Torino",              is_gk: false, fk: 67, pk: 78, overall: 71 },
  { name: "Youssef En-Nesyri",     initials: "YEN", tactical_position: "ST", country: "Morocco",      club: "Fenerbahçe",          is_gk: false, fk: 70, pk: 78, overall: 72 },
  { name: "Wout Weghorst",         initials: "WW",  tactical_position: "ST", country: "Netherlands",  club: "Hoffenheim",          is_gk: false, fk: 65, pk: 74, overall: 69 },

  // ── Right Wingers (7) ─────────────────────────────────────────────────────
  { name: "Rafael Leão",           initials: "RaL", tactical_position: "RW", country: "Portugal",     club: "AC Milan",            is_gk: false, fk: 78, pk: 74, overall: 77 },
  { name: "Federico Chiesa",       initials: "FC",  tactical_position: "RW", country: "Italy",        club: "Liverpool",           is_gk: false, fk: 74, pk: 70, overall: 73 },
  { name: "Serge Gnabry",          initials: "SG",  tactical_position: "RW", country: "Germany",      club: "Bayern Munich",       is_gk: false, fk: 73, pk: 68, overall: 73 },
  { name: "Ferran Torres",         initials: "FeT", tactical_position: "RW", country: "Spain",        club: "Barcelona",           is_gk: false, fk: 74, pk: 71, overall: 73 },
  { name: "Harvey Elliott",        initials: "HE",  tactical_position: "RW", country: "England",      club: "Liverpool",           is_gk: false, fk: 74, pk: 68, overall: 71 },
  { name: "Ousmane Dembélé",       initials: "OD",  tactical_position: "RW", country: "France",       club: "PSG",                 is_gk: false, fk: 75, pk: 70, overall: 77 },
  { name: "Wilfried Gnonto",       initials: "WGn", tactical_position: "RW", country: "Italy",        club: "Leeds United",        is_gk: false, fk: 72, pk: 66, overall: 70 },

  // ── Left Wingers (8) ──────────────────────────────────────────────────────
  { name: "Antony",                initials: "Ant", tactical_position: "LW", country: "Brazil",       club: "Manchester United",   is_gk: false, fk: 72, pk: 68, overall: 71 },
  { name: "Mykhaylo Mudryk",       initials: "MM",  tactical_position: "LW", country: "Ukraine",      club: "Chelsea",             is_gk: false, fk: 73, pk: 68, overall: 73 },
  { name: "Noni Madueke",          initials: "NM",  tactical_position: "LW", country: "England",      club: "Chelsea",             is_gk: false, fk: 74, pk: 68, overall: 72 },
  { name: "Jeremy Doku",           initials: "JDo", tactical_position: "LW", country: "Belgium",      club: "Manchester City",     is_gk: false, fk: 75, pk: 70, overall: 74 },
  { name: "Ansu Fati",             initials: "AF",  tactical_position: "LW", country: "Spain",        club: "Barcelona",           is_gk: false, fk: 72, pk: 68, overall: 70 },
  { name: "Said Benrahma",         initials: "SB",  tactical_position: "LW", country: "Algeria",      club: "Bayer Leverkusen",    is_gk: false, fk: 72, pk: 65, overall: 70 },
  { name: "Bryan Mbeumo",          initials: "BM",  tactical_position: "LW", country: "Cameroon",     club: "Brentford",           is_gk: false, fk: 73, pk: 70, overall: 74 },
  { name: "Leroy Sané (Silver)",   initials: "LSs", tactical_position: "LW", country: "Germany",      club: "Bayern Munich",       is_gk: false, fk: 74, pk: 68, overall: 71 },
];
