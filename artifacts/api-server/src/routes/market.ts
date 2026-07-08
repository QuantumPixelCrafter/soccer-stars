import { Router } from "express";
import db from "../db/database.js";
import { emitToUser } from "../lib/socket.js";
import { requireAuth, type AuthRequest } from "../middleware/auth.js";
import { logger } from "../lib/logger.js";

const router = Router();

// Value formula: floor(overall^2 / 70)
function exchangeValue(overall: number): number {
  return Math.floor((overall * overall) / 70);
}

function nowUnix(): number {
  return Math.floor(Date.now() / 1000);
}

const VALID_DURATIONS_SECONDS: Record<string, number> = {
  "1h":  3600,
  "2h":  7200,
  "6h":  21600,
  "12h": 43200,
  "24h": 86400,
};

interface PlayerBaseRow {
  id: number;
  name: string;
  initials: string;
  overall: number;
  tactical_position: string;
  is_gk: number;
  club: string;
  country: string;
}

interface ListingRow {
  id: number;
  seller_id: number;
  seller_username: string;
  inventory_id: number;
  player_id: number;
  player_name: string;
  player_initials: string;
  player_overall: number;
  player_position: string;
  player_club: string;
  player_country: string;
  player_is_gk: number;
  starting_bid: number;
  current_bid: number;
  current_bidder_id: number | null;
  current_bidder_username: string | null;
  expires_at: number;
  created_at: string;
  quick_sell_value: number;
}

const LISTING_SELECT = `
  SELECT
    ml.id,
    ml.seller_id,
    u_seller.username AS seller_username,
    ml.inventory_id,
    ml.player_id,
    pb.name           AS player_name,
    pb.initials       AS player_initials,
    pb.overall        AS player_overall,
    pb.tactical_position AS player_position,
    pb.club           AS player_club,
    pb.country        AS player_country,
    pb.is_gk          AS player_is_gk,
    ml.starting_bid,
    ml.current_bid,
    ml.current_bidder_id,
    u_bidder.username AS current_bidder_username,
    ml.expires_at,
    ml.created_at,
    (pb.overall * pb.overall / 70) AS quick_sell_value
  FROM market_listings ml
  JOIN users u_seller ON ml.seller_id = u_seller.id
  JOIN players_base pb ON ml.player_id = pb.id
  LEFT JOIN users u_bidder ON ml.current_bidder_id = u_bidder.id
`;

// ─── Expiration resolver ──────────────────────────────────────────────────────
// Called at startup and can be called periodically.
export function resolveExpiredListings(): void {
  const now = nowUnix();
  const expired = db
    .prepare("SELECT id, seller_id, inventory_id, player_id, current_bid, current_bidder_id FROM market_listings WHERE resolved=0 AND expires_at <= ?")
    .all(now) as Array<{
      id: number;
      seller_id: number;
      inventory_id: number;
      player_id: number;
      current_bid: number;
      current_bidder_id: number | null;
    }>;

  if (expired.length === 0) return;
  logger.info({ count: expired.length }, "Resolving expired market listings");

  const resolveTx = db.transaction((listing: typeof expired[0]) => {
    if (listing.current_bidder_id) {
      // Transfer card to winner, coins to seller
      db.prepare("UPDATE user_inventory SET user_id=?, is_listed=0 WHERE id=?")
        .run(listing.current_bidder_id, listing.inventory_id);
      db.prepare("UPDATE users SET coins=coins+? WHERE id=?")
        .run(listing.current_bid, listing.seller_id);

      // Notify both parties via socket (best-effort)
      try {
        emitToUser(listing.current_bidder_id, "market:won", { listing_id: listing.id, player_id: listing.player_id });
        emitToUser(listing.seller_id, "market:sold", { listing_id: listing.id, coins_received: listing.current_bid });
      } catch (_) { /* socket not critical */ }
    } else {
      // No bids — return card to seller
      db.prepare("UPDATE user_inventory SET is_listed=0 WHERE id=?").run(listing.inventory_id);
      try {
        emitToUser(listing.seller_id, "market:expired_no_bids", { listing_id: listing.id });
      } catch (_) { /* ok */ }
    }

    db.prepare("UPDATE market_listings SET resolved=1 WHERE id=?").run(listing.id);
  });

  for (const listing of expired) {
    try {
      resolveTx(listing);
      logger.info({ listing_id: listing.id, winner_id: listing.current_bidder_id }, "Listing resolved");
    } catch (err) {
      logger.error({ err, listing_id: listing.id }, "Failed to resolve listing");
    }
  }
}

// ─── GET /api/market ──────────────────────────────────────────────────────────
router.get("/", requireAuth, (req: AuthRequest, res) => {
  // Lazily resolve expired listings on each market view
  resolveExpiredListings();

  const now = nowUnix();
  const page = Math.max(1, parseInt(String(req.query["page"] ?? "1"), 10));
  const limit = 20;
  const offset = (page - 1) * limit;
  const posFilter = req.query["position"] ? String(req.query["position"]) : null;

  let query = `${LISTING_SELECT} WHERE ml.resolved=0 AND ml.expires_at > ${now}`;
  const params: unknown[] = [];
  if (posFilter) {
    query += ` AND pb.tactical_position = ?`;
    params.push(posFilter);
  }
  query += ` ORDER BY ml.created_at DESC LIMIT ${limit} OFFSET ${offset}`;

  const listings = db.prepare(query).all(...params) as ListingRow[];

  // Count must use the same JOIN + filter so pagination is accurate
  let countQuery = `
    SELECT COUNT(*) as cnt
    FROM market_listings ml
    JOIN players_base pb ON ml.player_id = pb.id
    WHERE ml.resolved=0 AND ml.expires_at > ${now}`;
  const countParams: unknown[] = [];
  if (posFilter) {
    countQuery += ` AND pb.tactical_position = ?`;
    countParams.push(posFilter);
  }
  const total = (db.prepare(countQuery).get(...countParams) as { cnt: number }).cnt;

  res.json({ listings, page, total, pages: Math.ceil(total / limit) });
});

// ─── GET /api/market/my-listings ─────────────────────────────────────────────
router.get("/my-listings", requireAuth, (req: AuthRequest, res) => {
  const listings = db
    .prepare(`${LISTING_SELECT} WHERE ml.seller_id=? AND ml.resolved=0 ORDER BY ml.expires_at ASC`)
    .all(req.userId!) as ListingRow[];
  res.json(listings);
});

// ─── GET /api/market/my-bids ──────────────────────────────────────────────────
router.get("/my-bids", requireAuth, (req: AuthRequest, res) => {
  const now = nowUnix();
  const listings = db
    .prepare(`${LISTING_SELECT} WHERE ml.current_bidder_id=? AND ml.resolved=0 AND ml.expires_at > ${now} ORDER BY ml.expires_at ASC`)
    .all(req.userId!) as ListingRow[];
  res.json(listings);
});

// ─── POST /api/market/list ────────────────────────────────────────────────────
router.post("/list", requireAuth, (req: AuthRequest, res) => {
  const { inventory_id, starting_bid, duration } = req.body as {
    inventory_id?: number;
    starting_bid?: number;
    duration?: string;
  };

  if (typeof inventory_id !== "number") {
    res.status(400).json({ error: "inventory_id is required" });
    return;
  }
  if (typeof starting_bid !== "number" || !Number.isInteger(starting_bid) || starting_bid < 1) {
    res.status(400).json({ error: "starting_bid must be a positive integer" });
    return;
  }
  if (!duration || !VALID_DURATIONS_SECONDS[duration]) {
    res.status(400).json({ error: `duration must be one of: ${Object.keys(VALID_DURATIONS_SECONDS).join(", ")}` });
    return;
  }

  // Ownership check
  const inv = db
    .prepare("SELECT id, player_id, is_listed FROM user_inventory WHERE id=? AND user_id=?")
    .get(inventory_id, req.userId!) as { id: number; player_id: number; is_listed: number } | undefined;
  if (!inv) {
    res.status(404).json({ error: "Card not found in your inventory" });
    return;
  }
  if (inv.is_listed) {
    res.status(409).json({ error: "This card is already listed on the market" });
    return;
  }

  const player = db
    .prepare("SELECT overall FROM players_base WHERE id=?")
    .get(inv.player_id) as { overall: number } | undefined;
  if (!player) {
    res.status(404).json({ error: "Player not found" });
    return;
  }

  const minBid = exchangeValue(player.overall) + 1;
  if (starting_bid < minBid) {
    res.status(422).json({
      error: `Starting bid must be at least ${minBid} coins (quick-sell value + 1 for overall=${player.overall})`,
      min_bid: minBid,
    });
    return;
  }

  const expiresAt = nowUnix() + VALID_DURATIONS_SECONDS[duration]!;

  const listTx = db.transaction(() => {
    db.prepare("UPDATE user_inventory SET is_listed=1 WHERE id=?").run(inventory_id);
    const result = db
      .prepare(`
        INSERT INTO market_listings (seller_id, inventory_id, player_id, starting_bid, current_bid, expires_at)
        VALUES (?,?,?,?,?,?)
      `)
      .run(req.userId!, inventory_id, inv.player_id, starting_bid, starting_bid, expiresAt);
    return result.lastInsertRowid as number;
  });

  const listingId = listTx();

  const listing = db
    .prepare(`${LISTING_SELECT} WHERE ml.id=?`)
    .get(listingId) as ListingRow;

  res.status(201).json(listing);
});

// ─── POST /api/market/bid/:id ─────────────────────────────────────────────────
router.post("/bid/:id", requireAuth, (req: AuthRequest, res) => {
  const listingId = parseInt(String(req.params["id"]), 10);
  if (isNaN(listingId)) {
    res.status(400).json({ error: "Invalid listing id" });
    return;
  }

  const { amount } = req.body as { amount?: number };
  if (typeof amount !== "number" || !Number.isInteger(amount) || amount < 1) {
    res.status(400).json({ error: "amount must be a positive integer" });
    return;
  }

  const bidTx = db.transaction(() => {
    const listing = db
      .prepare("SELECT id, seller_id, current_bid, current_bidder_id, expires_at, resolved FROM market_listings WHERE id=?")
      .get(listingId) as {
        id: number;
        seller_id: number;
        current_bid: number;
        current_bidder_id: number | null;
        expires_at: number;
        resolved: number;
      } | undefined;

    if (!listing) throw Object.assign(new Error("Listing not found"), { status: 404 });
    if (listing.resolved) throw Object.assign(new Error("Listing already resolved"), { status: 409 });
    if (listing.expires_at <= nowUnix()) throw Object.assign(new Error("Listing has expired"), { status: 409 });
    if (listing.seller_id === req.userId!) throw Object.assign(new Error("Cannot bid on your own listing"), { status: 422 });
    if (listing.current_bidder_id === req.userId!) throw Object.assign(new Error("You are already the highest bidder"), { status: 422 });

    const minBid = listing.current_bid + 1;
    if (amount < minBid) throw Object.assign(new Error(`Bid must be at least ${minBid} coins`), { status: 422, min_bid: minBid });

    // Check bidder's balance
    const bidder = db.prepare("SELECT coins FROM users WHERE id=?").get(req.userId!) as { coins: number };
    if (bidder.coins < amount) throw Object.assign(new Error("Insufficient coins"), { status: 422 });

    // Refund previous highest bidder
    if (listing.current_bidder_id) {
      db.prepare("UPDATE users SET coins=coins+? WHERE id=?").run(listing.current_bid, listing.current_bidder_id);
      emitToUser(listing.current_bidder_id, "market:outbid", {
        listing_id: listingId,
        coins_refunded: listing.current_bid,
      });
    }

    // Escrow: deduct coins from new bidder
    db.prepare("UPDATE users SET coins=coins-? WHERE id=?").run(amount, req.userId!);

    // Update listing
    db.prepare("UPDATE market_listings SET current_bid=?, current_bidder_id=? WHERE id=?")
      .run(amount, req.userId!, listingId);

    // Emit balance update
    const newBidder = db.prepare("SELECT coins FROM users WHERE id=?").get(req.userId!) as { coins: number };
    emitToUser(req.userId!, "coins:updated", { coins: newBidder.coins, reason: "market_bid_escrowed" });
  });

  try {
    bidTx();
  } catch (err: unknown) {
    const e = err as Error & { status?: number; min_bid?: number };
    res.status(e.status ?? 500).json({ error: e.message, ...(e.min_bid ? { min_bid: e.min_bid } : {}) });
    return;
  }

  const updatedListing = db.prepare(`${LISTING_SELECT} WHERE ml.id=?`).get(listingId) as ListingRow;
  res.json(updatedListing);
});

// ─── DELETE /api/market/cancel/:id ───────────────────────────────────────────
router.delete("/cancel/:id", requireAuth, (req: AuthRequest, res) => {
  const listingId = parseInt(String(req.params["id"]), 10);
  if (isNaN(listingId)) {
    res.status(400).json({ error: "Invalid listing id" });
    return;
  }

  const cancelTx = db.transaction(() => {
    const listing = db
      .prepare("SELECT id, seller_id, inventory_id, current_bidder_id, current_bid, resolved FROM market_listings WHERE id=?")
      .get(listingId) as {
        id: number;
        seller_id: number;
        inventory_id: number;
        current_bidder_id: number | null;
        current_bid: number;
        resolved: number;
      } | undefined;

    if (!listing) throw Object.assign(new Error("Listing not found"), { status: 404 });
    if (listing.resolved) throw Object.assign(new Error("Listing already resolved"), { status: 409 });
    if (listing.seller_id !== req.userId!) throw Object.assign(new Error("You can only cancel your own listings"), { status: 403 });
    if (listing.current_bidder_id) throw Object.assign(new Error("Cannot cancel a listing that already has bids"), { status: 422 });

    db.prepare("UPDATE user_inventory SET is_listed=0 WHERE id=?").run(listing.inventory_id);
    db.prepare("UPDATE market_listings SET resolved=1 WHERE id=?").run(listingId);
  });

  try {
    cancelTx();
  } catch (err: unknown) {
    const e = err as Error & { status?: number };
    res.status(e.status ?? 500).json({ error: e.message });
    return;
  }

  res.json({ success: true, message: "Listing cancelled" });
});

export default router;
