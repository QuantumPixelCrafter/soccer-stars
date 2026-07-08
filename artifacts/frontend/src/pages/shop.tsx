import { useState } from "react";
import { useGetPacks, useBuyPack, Pack, PlayerCard } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { getGetBalanceQueryKey, getGetInventorySummaryQueryKey, getGetPlayersQueryKey } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { Coins, Package, Sparkles, X, Target, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ExchangeOverlay } from "@/components/exchange-overlay";
import confetti from "canvas-confetti";

export default function Shop() {
  const { data: packs, isLoading } = useGetPacks();
  const buyPackMutation = useBuyPack();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [openingPack, setOpeningPack] = useState<boolean>(false);
  const [revealData, setRevealData] = useState<PlayerCard[] | null>(null);
  const [duplicateCards, setDuplicateCards] = useState<PlayerCard[]>([]);

  const handleBuy = (pack: Pack) => {
    if (openingPack) return;
    setOpeningPack(true);

    buyPackMutation.mutate({ data: { packType: pack.id } }, {
      onSuccess: (data) => {
        setTimeout(() => {
          setOpeningPack(false);
          setRevealData(data.players);

          confetti({
            particleCount: 120,
            spread: 80,
            origin: { y: 0.6 },
            colors: ['#FFD700', '#FFAA00', '#FFFFFF', '#FFA500'],
          });

          queryClient.invalidateQueries({ queryKey: getGetBalanceQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetInventorySummaryQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetPlayersQueryKey() });

          // Queue duplicate cards for exchange overlay (shown after reveal is closed)
          if (data.duplicate_inventory_ids?.length) {
            const dupeCards = data.players.filter((p) =>
              data.duplicate_inventory_ids!.includes(p.inventory_id),
            );
            setDuplicateCards(dupeCards);
          }
        }, 800);
      },
      onError: (error) => {
        setOpeningPack(false);
        toast({
          variant: "destructive",
          title: "Purchase Failed",
          description: (error.data as { error?: string })?.error || "Not enough coins or pack unavailable.",
        });
      },
    });
  };

  function handleRevealClose() {
    setRevealData(null);
    // Show exchange overlay for duplicates after reveal is closed
    // (if duplicateCards was already set, the overlay will appear)
  }

  function handleExchangeComplete() {
    setDuplicateCards([]);
    queryClient.invalidateQueries({ queryKey: getGetPlayersQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetBalanceQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetInventorySummaryQueryKey() });
  }

  return (
    <div className="space-y-8">
      {/* Exchange overlay for duplicate cards (appears after reveal is closed) */}
      {!revealData && duplicateCards.length > 0 && (
        <ExchangeOverlay
          duplicateCards={duplicateCards}
          onComplete={handleExchangeComplete}
        />
      )}

      <div>
        <h1 className="text-4xl font-bold tracking-tight mb-2">Pack Store</h1>
        <p className="text-muted-foreground text-lg">Spend coins. Crack packs. Pull legends.</p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-[400px] bg-card rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {packs?.map((pack) => (
            <PackItem
              key={pack.id}
              pack={pack}
              onBuy={() => handleBuy(pack)}
              isBuying={openingPack && buyPackMutation.variables?.data?.packType === pack.id}
            />
          ))}
        </div>
      )}

      {/* Full Screen Reveal Overlay */}
      <AnimatePresence>
        {revealData && (
          <PackReveal
            players={revealData}
            onClose={handleRevealClose}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function PackItem({ pack, onBuy, isBuying }: { pack: Pack, onBuy: () => void, isBuying: boolean }) {
  const isPremium = pack.cost >= 700;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      className={`relative flex flex-col rounded-2xl overflow-hidden border ${
        isPremium
          ? "border-yellow-500/40 bg-gradient-to-br from-yellow-950/30 to-card"
          : "border-border bg-card"
      }`}
    >
      {isPremium && (
        <div className="absolute top-3 right-3">
          <span className="bg-yellow-500 text-black text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
            Premium
          </span>
        </div>
      )}

      <div className={`p-8 flex items-center justify-center ${isPremium ? "bg-yellow-500/5" : ""}`}>
        <div className={`relative w-20 h-20 rounded-2xl flex items-center justify-center ${
          isPremium
            ? "bg-gradient-to-br from-yellow-400 to-yellow-600 shadow-lg shadow-yellow-500/30"
            : "bg-gradient-to-br from-blue-500/20 to-blue-700/20"
        }`}>
          <Package size={36} className={isPremium ? "text-yellow-900" : "text-blue-400"} />
          {isPremium && (
            <Sparkles size={16} className="absolute -top-2 -right-2 text-yellow-300" />
          )}
        </div>
      </div>

      <div className="p-6 flex flex-col flex-1">
        <h3 className="text-xl font-bold mb-2">{pack.name}</h3>
        <p className="text-muted-foreground text-sm mb-4 flex-1">{pack.description}</p>

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-1.5">
            <Package size={14} className="text-muted-foreground" />
            <span className="text-sm text-muted-foreground">{pack.card_count} card{pack.card_count > 1 ? "s" : ""}</span>
          </div>
          <div className="flex items-center gap-1.5 font-bold">
            <Coins size={16} className="text-yellow-400" />
            <span className="text-xl">{pack.cost.toLocaleString()}</span>
          </div>
        </div>

        <Button
          className={`w-full font-bold ${isPremium ? "bg-yellow-500 hover:bg-yellow-400 text-black" : ""}`}
          onClick={onBuy}
          disabled={isBuying}
        >
          {isBuying ? (
            <span className="flex items-center gap-2">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 0.6, ease: "linear" }}
              >
                <Sparkles size={16} />
              </motion.div>
              Opening…
            </span>
          ) : (
            `Buy for ${pack.cost.toLocaleString()} coins`
          )}
        </Button>
      </div>
    </motion.div>
  );
}

function PackReveal({ players, onClose }: { players: PlayerCard[], onClose: () => void }) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [revealed, setRevealed] = useState<boolean[]>(new Array(players.length).fill(false));

  const revealNext = () => {
    setRevealed((prev) => {
      const next = [...prev];
      next[currentIdx] = true;
      return next;
    });
    if (currentIdx < players.length - 1) {
      setTimeout(() => setCurrentIdx((i) => i + 1), 300);
    }
  };

  const revealAll = () => {
    setRevealed(new Array(players.length).fill(true));
    setCurrentIdx(players.length - 1);
  };

  const allRevealed = revealed.every(Boolean);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center"
      style={{ background: "rgba(0,0,0,0.96)", backdropFilter: "blur(20px)" }}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
      >
        <X size={20} />
      </button>

      <div className="text-center mb-8">
        <h2 className="text-3xl font-black mb-2">Pack Opened!</h2>
        <p className="text-muted-foreground">
          {allRevealed ? `${players.length} card${players.length > 1 ? "s" : ""} added to your collection` : "Tap to reveal your cards"}
        </p>
      </div>

      {/* Cards grid */}
      <div className={`grid gap-4 mb-8 px-4 ${
        players.length === 1 ? "grid-cols-1" :
        players.length <= 3 ? "grid-cols-3" :
        "grid-cols-3"
      }`} style={{ maxWidth: "800px", width: "100%" }}>
        {players.map((player, i) => (
          <motion.div
            key={player.inventory_id ?? i}
            initial={{ scale: 0, rotateY: 180 }}
            animate={revealed[i] ? { scale: 1, rotateY: 0 } : { scale: 0.8, rotateY: 180, opacity: 0.5 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className={`cursor-pointer ${i === currentIdx && !revealed[i] ? "ring-2 ring-yellow-400 ring-offset-2 ring-offset-black rounded-2xl" : ""}`}
            onClick={() => !revealed[i] && i === currentIdx && revealNext()}
            style={{ height: players.length <= 3 ? "240px" : "180px" }}
          >
            <RevealCard player={player} revealed={revealed[i]!} />
          </motion.div>
        ))}
      </div>

      {/* Action buttons */}
      <div className="flex gap-4">
        {!allRevealed && (
          <>
            <Button variant="outline" onClick={revealAll} className="font-bold">
              Reveal All
            </Button>
            <Button onClick={revealNext} className="gap-2 font-bold px-8">
              <Sparkles size={16} />
              Reveal Next
            </Button>
          </>
        )}
        {allRevealed && (
          <Button onClick={onClose} className="gap-2 font-bold px-8">
            Collect Cards <X size={16} />
          </Button>
        )}
      </div>
    </motion.div>
  );
}

function RevealCard({ player, revealed }: { player: PlayerCard; revealed: boolean }) {
  const isBenchPool = player.is_bench_pool;

  if (!revealed) {
    return (
      <div
        style={{
          width: "100%", height: "100%", borderRadius: "14px",
          background: "linear-gradient(135deg, #1a1a2e, #16213e, #0f3460)",
          border: "1px solid rgba(255,255,255,0.1)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}
      >
        <div style={{ fontSize: "36px" }}>🃏</div>
      </div>
    );
  }

  const ovr = player.overall ?? 70;
  const color = ovr >= 85 ? "#ff6b35" : ovr >= 80 ? "#ffd700" : ovr >= 70 ? "#c0c0c0" : "#cd7f32";
  const revealGradient = isBenchPool
    ? "linear-gradient(135deg, #3a3a4a, #5a5a6a, #4a4a5a)"
    : ovr >= 85
    ? "linear-gradient(135deg, #5a1805, #aa3a10, #ff6b35, #ff8855, #c04015, #ff6b35, #aa3a10, #5a1805)"
    : ovr >= 80
    ? "linear-gradient(135deg, #7c5c0a, #d4a20a, #ffd700, #ffe566, #c9922a, #ffd700, #d4a20a, #7c5c0a)"
    : ovr >= 70
    ? "linear-gradient(135deg, #3a3a45, #7a7a88, #b8b8c8, #d8d8e8, #8a8a98, #b8b8c8, #7a7a88, #3a3a45)"
    : "linear-gradient(135deg, #5a3010, #8a5520, #cd7f32, #e09050, #9a6028, #cd7f32, #8a5520, #5a3010)";

  return (
    <div
      style={{
        width: "100%", height: "100%", borderRadius: "14px", overflow: "hidden",
        background: revealGradient,
        backgroundSize: "200% 200%",
        animation: "goldShimmer 3s ease-in-out infinite",
        border: `2px solid ${color}60`,
        boxShadow: isBenchPool ? "0 8px 24px rgba(0,0,0,0.5)" : `0 8px 32px ${color}30`,
        position: "relative",
      }}
    >
      {/* Shimmer overlay */}
      <div style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.2) 50%, transparent 60%)",
        backgroundSize: "200% 100%",
        animation: "shimmerSlide 2s ease-in-out infinite",
      }} />

      <div style={{ position: "relative", padding: "12px", height: "100%", display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: "20px", fontWeight: "900", color: isBenchPool ? "#ddd" : "#1a0a00", lineHeight: 1 }}>{ovr}</div>
            <div style={{ fontSize: "8px", fontWeight: "700", color: isBenchPool ? "#aaa" : "#3a1a00", letterSpacing: "1px" }}>
              {player.is_gk ? "GK" : (player.tactical_position ?? player.position)}
            </div>
          </div>
          {player.is_gk ? (
            <Shield size={14} style={{ color: isBenchPool ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.3)" }} />
          ) : (
            <Target size={14} style={{ color: isBenchPool ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.3)" }} />
          )}
        </div>

        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{
            width: "48px", height: "48px", borderRadius: "50%",
            background: isBenchPool ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.2)",
            border: `2px solid ${isBenchPool ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.15)"}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "14px", fontWeight: "900",
            color: isBenchPool ? "#fff" : "#1a0a00",
          }}>
            {player.initials}
          </div>
        </div>

        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "10px", fontWeight: "800", color: isBenchPool ? "#fff" : "#1a0a00", lineHeight: 1.1, marginBottom: "2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {player.name}
          </div>
          <div style={{ fontSize: "8px", color: isBenchPool ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.4)" }}>{player.club}</div>
        </div>
      </div>
    </div>
  );
}
