# FreeKick Game Server

A Node.js + Express + Socket.io game backend for a football card-collecting game. Players register, collect Gold Cards through a gacha pack shop, and spend coins to pull shooters and goalkeepers.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port from $PORT env)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: **better-sqlite3** (file-based SQLite at `data/game.db` — persists in workspace)
- Real-time: **Socket.io** (attached to same HTTP port, path: `/api/socket.io`)
- Build: esbuild (CJS bundle)

## Where things live

```
artifacts/api-server/src/
├── index.ts              — HTTP server + Socket.io bootstrap + DB seed on startup
├── app.ts                — Express app setup (cors, json, routes)
├── db/
│   ├── database.ts       — SQLite connection, schema (players_base, users, sessions, user_inventory)
│   └── seed.ts           — 125 Gold Cards: 100 Shooters + 25 Goalkeepers
├── lib/
│   ├── gameUtils.ts      — Universal Nerf Rule + random helpers
│   ├── socket.ts         — Socket.io singleton (initSocket, emitToUser)
│   └── logger.ts         — pino logger
├── middleware/
│   └── auth.ts           — requireAuth (Bearer token → userId on req)
└── routes/
    ├── index.ts          — router root
    ├── health.ts         — GET /api/healthz
    ├── auth.ts           — POST /api/auth/register|login|daily-claim|logout
    ├── inventory.ts      — GET /api/inventory/balance|players|summary
    └── shop.ts           — GET /api/shop/packs, POST /api/shop/buy, GET /api/shop/nerf-preview
```

Database file: `data/game.db` (auto-created at startup, persists across restarts)

## API Endpoints

### Auth
| Method | Path | Auth? | Description |
|--------|------|-------|-------------|
| POST | /api/auth/register | No | Register (starts with 1000 coins) |
| POST | /api/auth/login | No | Login → returns Bearer token |
| POST | /api/auth/daily-claim | Yes | Claim +200 coin daily bonus |
| POST | /api/auth/logout | Yes | Invalidate session token |

### Inventory
| Method | Path | Auth? | Description |
|--------|------|-------|-------------|
| GET | /api/inventory/balance | Yes | Current coin balance |
| GET | /api/inventory/players | Yes | All owned cards |
| GET | /api/inventory/summary | Yes | Balance + card count breakdown |

### Shop
| Method | Path | Auth? | Description |
|--------|------|-------|-------------|
| GET | /api/shop/packs | Yes | List all pack types & prices |
| POST | /api/shop/buy | Yes | Purchase a gacha pack |
| GET | /api/shop/nerf-preview | Yes | Preview Universal Nerf Rule for a player |

### Pack Types
| packType | Cards | Cost | Pool |
|----------|-------|------|------|
| random_1 | 1 | 500 coins | Mixed |
| random_3 | 3 | 1200 coins | Mixed |
| shooter_1 | 1 | 700 coins | Shooters only |
| shooter_3 | 3 | 1800 coins | Shooters only |
| gk_1 | 1 | 700 coins | GKs only |
| gk_3 | 3 | 1800 coins | GKs only |

## Socket.io Events

Connect to: `ws://<host>/api/socket.io`

| Client → Server | Payload | Effect |
|-----------------|---------|--------|
| `identify` | userId | Join personal room for targeted events |

| Server → Client | Payload | Trigger |
|-----------------|---------|---------|
| `coins:updated` | `{ coins, reason }` | After pack purchase or daily claim |
| `pack:opened` | `{ packType, coinsSpent, coinsRemaining, cards }` | After pack purchase |

## Architecture decisions

- **better-sqlite3** chosen over Drizzle+Postgres because the game requires a local, file-based, zero-config DB that persists in the workspace.
- **Universal Nerf Rule**: `applyNerfRule()` in `gameUtils.ts` halves FK/PK stats if a GK is fielded as a shooter. Applied before any matchmaking calculation.
- **Atomic pack purchase**: entire coin deduction + card draw + inventory insert runs in a single SQLite transaction to prevent race conditions.
- **Session tokens** are 32-byte random hex strings stored in a `sessions` table. Passwords use Node's built-in `crypto.scryptSync` — no extra packages needed.
- **Seeding is idempotent**: `seedDatabase()` is called on every server start but only inserts if the table has fewer than 125 rows.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- `better-sqlite3` is a native module — it is externalized from the esbuild bundle and must be available as a runtime dependency. It's listed in `onlyBuiltDependencies` in `pnpm-workspace.yaml` to allow its build scripts to run.
- The DB file lives at `data/game.db` relative to the **process working directory** (workspace root). Make sure `PORT` env var is set before starting.
- Socket.io path is `/api/socket.io` (not the default `/socket.io`) to stay under the `/api` prefix.
