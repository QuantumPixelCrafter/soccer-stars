import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  useGetMarket,
  useGetMyListings,
  useGetMyBids,
  useGetPlayers,
  useCreateListing,
  usePlaceBid,
  useCancelListing,
  useGetBalance,
  getGetMarketQueryKey,
  getGetMyListingsQueryKey,
  getGetMyBidsQueryKey,
  getGetBalanceQueryKey,
  getGetPlayersQueryKey,
} from "@workspace/api-client-react";
import type { MarketListing, PlayerCard } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Coins, Clock, Gavel, TrendingUp, Plus, X, ShoppingBag, Loader2 } from "lucide-react";

function timeLeft(expiresAt: number): string {
  const secs = Math.max(0, expiresAt - Math.floor(Date.now() / 1000));
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function useCountdown(expiresAt: number) {
  const [, forceUpdate] = useState(0);
  useEffect(() => {
    const id = setInterval(() => forceUpdate((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);
  return timeLeft(expiresAt);
}

export default function Market() {
  const [tab, setTab] = useState<"browse" | "my-listings" | "my-bids">("browse");
  const [showListForm, setShowListForm] = useState(false);
  const [bidDialog, setBidDialog] = useState<MarketListing | null>(null);

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: getGetMarketQueryKey() });
    qc.invalidateQueries({ queryKey: getGetMyListingsQueryKey() });
    qc.invalidateQueries({ queryKey: getGetMyBidsQueryKey() });
    qc.invalidateQueries({ queryKey: getGetBalanceQueryKey() });
    qc.invalidateQueries({ queryKey: getGetPlayersQueryKey() });
  };

  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: balance } = useGetBalance();
  const { data: market, isLoading: marketLoading, refetch: refetchMarket } = useGetMarket(
    {},
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    { query: { refetchInterval: 15_000 } as any },
  );
  const { data: myListings } = useGetMyListings();
  const { data: myBids } = useGetMyBids();
  const cancelMutation = useCancelListing();

  function handleCancel(listingId: number) {
    cancelMutation.mutate(
      { listingId },
      {
        onSuccess: () => { invalidateAll(); toast({ title: "Listing cancelled" }); },
        onError: (e) => toast({ variant: "destructive", title: "Error", description: (e.data as any)?.error }),
      },
    );
  }

  const TABS = [
    { id: "browse", label: "Browse Market", count: market?.total },
    { id: "my-listings", label: "My Listings", count: myListings?.length },
    { id: "my-bids", label: "My Bids", count: myBids?.length },
  ] as const;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight mb-1">Transfer Market</h1>
          <p className="text-muted-foreground">Global auction · Real-time bidding · Coin escrow</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
            <Coins size={16} className="text-yellow-400" />
            <span className="font-bold text-yellow-400">{balance?.coins ?? 0}</span>
          </div>
          <Button className="gap-2 font-bold" onClick={() => setShowListForm(true)}>
            <Plus size={16} /> List a Card
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-colors ${
              tab === t.id
                ? "bg-primary text-primary-foreground"
                : "bg-card text-muted-foreground hover:text-foreground border border-border"
            }`}
          >
            {t.label}
            {t.count !== undefined && t.count > 0 && (
              <span className={`text-xs px-1.5 py-0.5 rounded-md ${tab === t.id ? "bg-white/20" : "bg-muted"}`}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Browse tab */}
      {tab === "browse" && (
        <div>
          {marketLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => <div key={i} className="h-40 bg-card rounded-2xl animate-pulse" />)}
            </div>
          ) : !market?.listings?.length ? (
            <EmptyState icon={<ShoppingBag size={32} />} title="No active listings" desc="Be the first to list a card!" />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {market.listings.map((listing, i) => (
                <ListingCard
                  key={listing.id}
                  listing={listing}
                  index={i}
                  userCoins={balance?.coins ?? 0}
                  onBid={() => setBidDialog(listing)}
                  isSeller={false}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* My Listings tab */}
      {tab === "my-listings" && (
        <div>
          {!myListings?.length ? (
            <EmptyState icon={<TrendingUp size={32} />} title="No active listings" desc="List a card to start selling!" />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {myListings.map((listing, i) => (
                <ListingCard
                  key={listing.id}
                  listing={listing}
                  index={i}
                  userCoins={balance?.coins ?? 0}
                  isSeller={true}
                  onCancel={() => handleCancel(listing.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* My Bids tab */}
      {tab === "my-bids" && (
        <div>
          {!myBids?.length ? (
            <EmptyState icon={<Gavel size={32} />} title="No active bids" desc="Browse the market and place bids!" />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {myBids.map((listing, i) => (
                <ListingCard
                  key={listing.id}
                  listing={listing}
                  index={i}
                  userCoins={balance?.coins ?? 0}
                  isSeller={false}
                  isHighestBidder={true}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* List form dialog */}
      {showListForm && (
        <ListFormDialog
          onClose={() => setShowListForm(false)}
          onSuccess={() => { setShowListForm(false); invalidateAll(); refetchMarket(); }}
        />
      )}

      {/* Bid dialog */}
      {bidDialog && (
        <BidDialog
          listing={bidDialog}
          userCoins={balance?.coins ?? 0}
          onClose={() => setBidDialog(null)}
          onSuccess={() => { setBidDialog(null); invalidateAll(); refetchMarket(); }}
        />
      )}
    </div>
  );
}

// ─── Listing Card ─────────────────────────────────────────────────────────────
function ListingCard({
  listing, index, userCoins, isSeller, isHighestBidder, onBid, onCancel,
}: {
  listing: MarketListing;
  index: number;
  userCoins: number;
  isSeller?: boolean;
  isHighestBidder?: boolean;
  onBid?: () => void;
  onCancel?: () => void;
}) {
  const countdown = useCountdown(listing.expires_at);
  const ovr = listing.player_overall;
  const color = ovr >= 85 ? "#ff6b35" : ovr >= 78 ? "#ffd700" : ovr >= 70 ? "#c0c0c0" : "#cd7f32";
  const canAfford = userCoins >= listing.current_bid + 1;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className="bg-card border border-border rounded-2xl p-4 flex flex-col gap-3"
    >
      {/* Player info row */}
      <div className="flex items-center gap-3">
        {/* Mini card */}
        <div style={{
          width: "52px", height: "64px", borderRadius: "8px", flexShrink: 0,
          background: "linear-gradient(135deg, #7c5c0a, #ffd700, #c9922a, #ffd700, #7c5c0a)",
          backgroundSize: "200% 200%",
          animation: "goldShimmer 4s ease-in-out infinite",
          border: `1.5px solid ${color}60`,
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "2px",
        }}>
          <span style={{ fontSize: "15px", fontWeight: "900", color: "#1a0a00", lineHeight: 1 }}>{ovr}</span>
          <span style={{ fontSize: "9px", fontWeight: "700", color: "rgba(0,0,0,0.5)" }}>{listing.player_position}</span>
          <span style={{ fontSize: "10px", fontWeight: "900", color: "#1a0a00" }}>{listing.player_initials}</span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="font-bold truncate">{listing.player_name}</div>
          <div className="text-xs text-muted-foreground">{listing.player_club}</div>
          <div className="text-xs text-muted-foreground/60">by {listing.seller_username}</div>
        </div>
      </div>

      {/* Bid info */}
      <div className="bg-muted/40 rounded-xl p-3 space-y-1.5">
        <div className="flex justify-between items-center">
          <span className="text-xs text-muted-foreground">Current Bid</span>
          <span className="font-bold text-yellow-400 flex items-center gap-1">
            <Coins size={12} /> {listing.current_bid.toLocaleString()}
          </span>
        </div>
        {listing.current_bidder_username && (
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">Highest Bidder</span>
            <span className="text-xs font-bold">{listing.current_bidder_username}</span>
          </div>
        )}
        <div className="flex justify-between items-center">
          <span className="text-xs text-muted-foreground flex items-center gap-1"><Clock size={10} /> Expires</span>
          <span className={`text-xs font-bold tabular-nums ${
            Math.max(0, listing.expires_at - Math.floor(Date.now() / 1000)) < 3600 ? "text-red-400" : "text-green-400"
          }`}>{countdown}</span>
        </div>
      </div>

      {/* Action */}
      {isSeller ? (
        <Button
          variant="outline"
          size="sm"
          className="w-full text-destructive hover:text-destructive border-destructive/30"
          onClick={onCancel}
          disabled={!!listing.current_bidder_id}
        >
          {listing.current_bidder_id ? "Has Bids — Cannot Cancel" : "Cancel Listing"}
        </Button>
      ) : isHighestBidder ? (
        <div className="text-center text-xs font-bold text-green-400 bg-green-500/10 rounded-lg py-2">
          ✓ You're winning this auction
        </div>
      ) : (
        <Button
          size="sm"
          className="w-full gap-2 font-bold"
          onClick={onBid}
          disabled={!canAfford}
        >
          <Gavel size={14} /> {canAfford ? `Bid (min ${(listing.current_bid + 1).toLocaleString()})` : "Not enough coins"}
        </Button>
      )}
    </motion.div>
  );
}

// ─── Bid Dialog ───────────────────────────────────────────────────────────────
function BidDialog({
  listing, userCoins, onClose, onSuccess,
}: {
  listing: MarketListing;
  userCoins: number;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [amount, setAmount] = useState(String(listing.current_bid + 1));
  const bidMutation = usePlaceBid();
  const { toast } = useToast();
  const minBid = listing.current_bid + 1;
  const amountNum = parseInt(amount, 10);
  const isValid = !isNaN(amountNum) && amountNum >= minBid && amountNum <= userCoins;

  function handleBid() {
    bidMutation.mutate(
      { listingId: listing.id, data: { amount: amountNum } },
      {
        onSuccess: () => { toast({ title: "Bid placed!", description: `${amountNum} coins escrowed.` }); onSuccess(); },
        onError: (e) => {
          const err = e.data as any;
          toast({ variant: "destructive", title: "Bid failed", description: err?.error ?? "Unknown error" });
        },
      },
    );
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <div className="space-y-5">
          <div>
            <h2 className="text-xl font-bold">Place a Bid</h2>
            <p className="text-muted-foreground text-sm">{listing.player_name} · OVR {listing.player_overall}</p>
          </div>

          <div className="bg-muted/40 rounded-xl p-4 space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Current bid</span><span className="font-bold">{listing.current_bid.toLocaleString()} 🪙</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Your balance</span><span className="font-bold text-yellow-400">{userCoins.toLocaleString()} 🪙</span></div>
            <div className="flex justify-between border-t border-border pt-2"><span className="text-muted-foreground">Minimum bid</span><span className="font-bold text-green-400">{minBid.toLocaleString()} 🪙</span></div>
          </div>

          <div>
            <label className="text-sm font-bold mb-1.5 block">Your Bid Amount</label>
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min={minBid}
              max={userCoins}
              className="font-mono"
            />
            {!isNaN(amountNum) && amountNum > 0 && !isValid && (
              <p className="text-xs text-destructive mt-1">
                {amountNum < minBid ? `Minimum is ${minBid}` : "Not enough coins"}
              </p>
            )}
          </div>

          <div className="text-xs text-muted-foreground bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
            💡 Your bid is escrowed immediately. If outbid, coins are refunded instantly.
          </div>

          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button className="flex-1 gap-2 font-bold" disabled={!isValid || bidMutation.isPending} onClick={handleBid}>
              {bidMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Gavel size={14} />}
              Confirm Bid
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── List Form Dialog ─────────────────────────────────────────────────────────
function ListFormDialog({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [selectedInventoryId, setSelectedInventoryId] = useState<number | null>(null);
  const [startingBid, setStartingBid] = useState("");
  const [duration, setDuration] = useState("1h");
  const { data: players } = useGetPlayers();
  const createMutation = useCreateListing();
  const { toast } = useToast();

  const availablePlayers = players?.filter((p) => !p.is_listed) ?? [];
  const selectedPlayer = availablePlayers.find((p) => p.inventory_id === selectedInventoryId);
  const quickSellValue = selectedPlayer ? Math.floor(((selectedPlayer.overall ?? 70) ** 2) / 70) : 0;
  const minBid = quickSellValue + 1;
  const bidNum = parseInt(startingBid, 10);
  const isValid = selectedInventoryId !== null && !isNaN(bidNum) && bidNum >= minBid;

  function handleSubmit() {
    if (!isValid) return;
    createMutation.mutate(
      { data: { inventory_id: selectedInventoryId!, starting_bid: bidNum, duration: duration as import("@workspace/api-client-react").CreateListingInputDuration } },
      {
        onSuccess: () => { toast({ title: "Card listed!", description: "Your card is now live on the market." }); onSuccess(); },
        onError: (e) => {
          const err = e.data as any;
          toast({ variant: "destructive", title: "Failed to list", description: err?.error });
        },
      },
    );
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <div className="space-y-5">
          <div>
            <h2 className="text-xl font-bold">List a Card</h2>
            <p className="text-muted-foreground text-sm">Set a starting bid higher than the quick-sell value</p>
          </div>

          {/* Card selector */}
          <div>
            <label className="text-sm font-bold mb-1.5 block">Select Card</label>
            <Select
              value={selectedInventoryId ? String(selectedInventoryId) : ""}
              onValueChange={(v) => { setSelectedInventoryId(Number(v)); setStartingBid(""); }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose a card from your collection…" />
              </SelectTrigger>
              <SelectContent>
                {availablePlayers.map((p) => (
                  <SelectItem key={p.inventory_id} value={String(p.inventory_id)}>
                    {p.name} · OVR {p.overall} · {p.is_gk ? "GK" : (p.tactical_position ?? p.position)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Selected card info */}
          {selectedPlayer && (
            <div className="bg-muted/40 rounded-xl p-3 text-sm space-y-1">
              <div className="flex justify-between"><span className="text-muted-foreground">Quick-sell value</span><span className="font-bold">{quickSellValue} 🪙</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Minimum starting bid</span><span className="font-bold text-green-400">{minBid} 🪙</span></div>
            </div>
          )}

          {/* Starting bid */}
          <div>
            <label className="text-sm font-bold mb-1.5 block">Starting Bid</label>
            <Input
              type="number"
              value={startingBid}
              onChange={(e) => setStartingBid(e.target.value)}
              min={minBid}
              placeholder={`Min: ${minBid}`}
              className="font-mono"
              disabled={!selectedInventoryId}
            />
          </div>

          {/* Duration */}
          <div>
            <label className="text-sm font-bold mb-1.5 block">Auction Duration</label>
            <Select value={duration} onValueChange={setDuration}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1h">1 Hour</SelectItem>
                <SelectItem value="2h">2 Hours</SelectItem>
                <SelectItem value="6h">6 Hours</SelectItem>
                <SelectItem value="12h">12 Hours</SelectItem>
                <SelectItem value="24h">24 Hours</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button
              className="flex-1 gap-2 font-bold"
              disabled={!isValid || createMutation.isPending}
              onClick={handleSubmit}
            >
              {createMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <TrendingUp size={14} />}
              List Card
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function EmptyState({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="py-20 text-center border border-dashed border-border rounded-2xl bg-card/30">
      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4 text-muted-foreground">
        {icon}
      </div>
      <h3 className="text-xl font-bold mb-2">{title}</h3>
      <p className="text-muted-foreground">{desc}</p>
    </div>
  );
}
