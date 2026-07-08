import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Coins, ArrowRight, Package } from "lucide-react";
import { useExchangeCard } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { getGetBalanceQueryKey, getGetInventorySummaryQueryKey, getGetPlayersQueryKey } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import type { PlayerCard } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";

interface ExchangeOverlayProps {
  /** Cards that are flagged as duplicates — must exchange or keep each one */
  duplicateCards: PlayerCard[];
  onComplete: () => void;
}

/**
 * Mandatory inescapable exchange overlay.
 * Shows one duplicate card at a time. User must choose Exchange or Keep.
 * No backdrop click, no close button — must interact with each card.
 */
export function ExchangeOverlay({ duplicateCards, onComplete }: ExchangeOverlayProps) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [decisions, setDecisions] = useState<Record<number, "exchange" | "keep">>({});
  const [processing, setProcessing] = useState(false);
  const exchangeMutation = useExchangeCard();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const currentCard = duplicateCards[currentIdx];
  const total = duplicateCards.length;
  const isDone = currentIdx >= total;

  const quickSellValue = (card: PlayerCard) =>
    Math.floor(((card.overall ?? 70) ** 2) / 70);

  function advance() {
    if (currentIdx + 1 >= total) {
      // Invalidate queries and finish
      queryClient.invalidateQueries({ queryKey: getGetBalanceQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetInventorySummaryQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetPlayersQueryKey() });
      onComplete();
    } else {
      setCurrentIdx((i) => i + 1);
    }
  }

  function handleExchange(card: PlayerCard) {
    setProcessing(true);
    exchangeMutation.mutate(
      { inventoryId: card.inventory_id },
      {
        onSuccess: (data) => {
          setDecisions((d) => ({ ...d, [card.inventory_id]: "exchange" }));
          toast({
            title: "Card Exchanged!",
            description: `+${data.coins_earned} 🪙 for ${card.name}. New balance: ${data.new_balance}`,
          });
          setProcessing(false);
          advance();
        },
        onError: () => {
          setProcessing(false);
          toast({ variant: "destructive", title: "Exchange failed", description: "Please try again." });
        },
      },
    );
  }

  function handleKeep() {
    if (!currentCard) return;
    setDecisions((d) => ({ ...d, [currentCard.inventory_id]: "keep" }));
    advance();
  }

  if (!currentCard || isDone) return null;

  const qsv = quickSellValue(currentCard);
  const isBenchPool = currentCard.is_bench_pool;

  return (
    <AnimatePresence>
      <motion.div
        key="exchange-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 9999,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "rgba(0,0,0,0.92)",
          backdropFilter: "blur(12px)",
        }}
      >
        <motion.div
          key={currentCard.inventory_id}
          initial={{ scale: 0.8, opacity: 0, y: 40 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.8, opacity: 0, y: -40 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          style={{
            width: "100%",
            maxWidth: "380px",
            margin: "0 16px",
            textAlign: "center",
          }}
        >
          {/* Header */}
          <div style={{ marginBottom: "24px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", marginBottom: "8px" }}>
              <Package size={20} style={{ color: "#fbbf24" }} />
              <h2 style={{ fontSize: "18px", fontWeight: "800", color: "#fff", margin: 0 }}>
                Duplicate Card!
              </h2>
            </div>
            <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.5)", margin: 0 }}>
              {currentIdx + 1} of {total} · You already own this player
            </p>
          </div>

          {/* Card visual */}
          <div style={{ margin: "0 auto 24px", width: "200px", height: "280px", position: "relative" }}>
            {/* Glow */}
            <div style={{
              position: "absolute",
              inset: "-20px",
              background: isBenchPool
                ? "radial-gradient(ellipse, rgba(100,100,150,0.4) 0%, transparent 70%)"
                : "radial-gradient(ellipse, rgba(255,215,0,0.4) 0%, transparent 70%)",
              filter: "blur(12px)",
            }} />

            {/* Gold card face */}
            <div style={{
              position: "relative",
              width: "100%",
              height: "100%",
              borderRadius: "16px",
              overflow: "hidden",
              background: isBenchPool
                ? "linear-gradient(135deg, #3a3a4a 0%, #5a5a6a 25%, #4a4a5a 50%, #6a6a7a 75%, #3a3a4a 100%)"
                : "linear-gradient(135deg, #7c5c0a 0%, #d4a20a 15%, #ffd700 30%, #ffe566 45%, #c9922a 60%, #ffd700 75%, #d4a20a 90%, #7c5c0a 100%)",
              backgroundSize: "200% 200%",
              animation: "goldShimmer 3s ease-in-out infinite",
              boxShadow: isBenchPool
                ? "0 20px 60px rgba(0,0,0,0.8)"
                : "0 20px 60px rgba(255,180,0,0.3), 0 0 0 1px rgba(255,215,0,0.3)",
            }}>
              {/* Shimmer */}
              <div style={{
                position: "absolute", inset: 0,
                background: "linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.2) 50%, transparent 60%)",
                backgroundSize: "200% 100%",
                animation: "shimmerSlide 2s ease-in-out infinite",
              }} />

              <div style={{ position: "relative", height: "100%", padding: "16px", display: "flex", flexDirection: "column" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ fontSize: "32px", fontWeight: "900", color: isBenchPool ? "#ddd" : "#1a0a00", lineHeight: 1 }}>
                      {currentCard.overall ?? "—"}
                    </div>
                    <div style={{ fontSize: "9px", fontWeight: "700", color: isBenchPool ? "#aaa" : "#3a1a00", letterSpacing: "1px" }}>
                      {currentCard.is_gk ? "GK" : (currentCard.tactical_position ?? currentCard.position)}
                    </div>
                  </div>
                  <div style={{
                    background: "rgba(0,0,0,0.25)",
                    borderRadius: "6px",
                    padding: "3px 8px",
                    fontSize: "9px",
                    fontWeight: "800",
                    color: isBenchPool ? "#c0c0c0" : "#7c5c0a",
                    letterSpacing: "1px",
                  }}>
                    DUPLICATE
                  </div>
                </div>

                <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <div style={{
                    width: "80px", height: "80px", borderRadius: "50%",
                    background: isBenchPool ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.2)",
                    border: `3px solid ${isBenchPool ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.15)"}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "26px", fontWeight: "900",
                    color: isBenchPool ? "#fff" : "#1a0a00",
                  }}>
                    {currentCard.initials}
                  </div>
                </div>

                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "13px", fontWeight: "800", color: isBenchPool ? "#fff" : "#1a0a00", marginBottom: "4px" }}>
                    {currentCard.name}
                  </div>
                  <div style={{ fontSize: "10px", color: isBenchPool ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.5)" }}>
                    {currentCard.club}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Exchange value */}
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "6px",
            marginBottom: "24px",
            padding: "10px 20px",
            background: "rgba(251,191,36,0.1)",
            border: "1px solid rgba(251,191,36,0.2)",
            borderRadius: "12px",
          }}>
            <Coins size={16} style={{ color: "#fbbf24" }} />
            <span style={{ fontSize: "13px", color: "rgba(255,255,255,0.6)" }}>Exchange value:</span>
            <span style={{ fontSize: "15px", fontWeight: "800", color: "#fbbf24" }}>{qsv} coins</span>
          </div>

          {/* Action buttons */}
          <div style={{ display: "flex", gap: "12px" }}>
            <Button
              variant="outline"
              className="flex-1 h-12 font-bold text-base border-white/20 hover:bg-white/5"
              onClick={handleKeep}
              disabled={processing}
            >
              Keep It
            </Button>
            <Button
              className="flex-1 h-12 font-bold text-base gap-2"
              style={{ background: "linear-gradient(135deg, #d97706, #fbbf24)", color: "#000" }}
              onClick={() => handleExchange(currentCard)}
              disabled={processing}
            >
              <Coins size={16} />
              Exchange
              <ArrowRight size={16} />
            </Button>
          </div>

          {/* Progress dots */}
          {total > 1 && (
            <div style={{ display: "flex", justifyContent: "center", gap: "6px", marginTop: "20px" }}>
              {duplicateCards.map((_, i) => (
                <div
                  key={i}
                  style={{
                    width: "6px",
                    height: "6px",
                    borderRadius: "50%",
                    background: i < currentIdx ? "#22c55e"
                      : i === currentIdx ? "#fbbf24"
                      : "rgba(255,255,255,0.2)",
                    transition: "background 0.3s",
                  }}
                />
              ))}
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
