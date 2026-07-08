import { useState } from "react";
import { motion } from "framer-motion";
import { Shield, Target, Star } from "lucide-react";
import type { PlayerCard as PlayerCardType } from "@workspace/api-client-react";

interface PlayerCardProps {
  player: PlayerCardType;
  index?: number;
  onClick?: () => void;
  compact?: boolean;
  isSelected?: boolean;
}

function getRatingColor(overall: number): string {
  if (overall >= 85) return "#ff6b35";
  if (overall >= 78) return "#ffd700";
  if (overall >= 70) return "#c0c0c0";
  return "#cd7f32";
}

function getTierLabel(overall: number): string {
  if (overall >= 85) return "ELITE";
  if (overall >= 78) return "GOLD";
  if (overall >= 70) return "SILVER";
  return "BENCH";
}

export function PlayerCard({ player, index = 0, onClick, compact = false, isSelected = false }: PlayerCardProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const ratingColor = getRatingColor(player.overall ?? 70);
  const tierLabel = getTierLabel(player.overall ?? 70);
  const isBenchPool = player.is_bench_pool;

  const quickSellValue = Math.floor(((player.overall ?? 70) ** 2) / 70);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ delay: index * 0.05, type: "spring", stiffness: 300, damping: 30 }}
      className={`relative cursor-pointer select-none ${compact ? "h-40" : "h-80"}`}
      style={{ perspective: "1000px" }}
      onMouseEnter={() => !compact && setIsFlipped(true)}
      onMouseLeave={() => !compact && setIsFlipped(false)}
      onClick={onClick}
    >
      {/* Card container with 3D transform */}
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          transformStyle: "preserve-3d",
          transition: "transform 0.55s cubic-bezier(0.4, 0, 0.2, 1)",
          transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
          willChange: "transform",
        }}
      >
        {/* ── FRONT FACE ─────────────────────────────────────────────────────── */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            borderRadius: "16px",
            overflow: "hidden",
            boxShadow: isSelected
              ? `0 0 0 3px ${ratingColor}, 0 8px 32px rgba(0,0,0,0.6)`
              : "0 8px 32px rgba(0,0,0,0.5)",
          }}
        >
          {/* Gold metallic gradient background */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: isBenchPool
                ? "linear-gradient(135deg, #3a3a4a 0%, #5a5a6a 25%, #4a4a5a 50%, #6a6a7a 75%, #3a3a4a 100%)"
                : "linear-gradient(135deg, #7c5c0a 0%, #d4a20a 15%, #ffd700 30%, #ffe566 45%, #c9922a 60%, #ffd700 75%, #d4a20a 90%, #7c5c0a 100%)",
              backgroundSize: "200% 200%",
              animation: "goldShimmer 4s ease-in-out infinite",
            }}
          />

          {/* Overlay shimmer */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.18) 50%, transparent 60%)",
              backgroundSize: "200% 100%",
              animation: "shimmerSlide 3s ease-in-out infinite",
            }}
          />

          {/* Card content */}
          <div style={{ position: "relative", height: "100%", display: "flex", flexDirection: "column", padding: compact ? "10px" : "16px" }}>
            {/* Top row: OVR + position */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ textAlign: "center" }}>
                <div style={{
                  fontSize: compact ? "22px" : "36px",
                  fontWeight: "900",
                  color: isBenchPool ? "#ddd" : "#1a0a00",
                  lineHeight: 1,
                  textShadow: isBenchPool ? "none" : "0 1px 2px rgba(255,200,0,0.5)",
                }}>
                  {player.overall ?? "—"}
                </div>
                <div style={{
                  fontSize: compact ? "8px" : "10px",
                  fontWeight: "700",
                  color: isBenchPool ? "#aaa" : "#3a1a00",
                  letterSpacing: "1px",
                }}>
                  {player.is_gk ? "GK" : (player.tactical_position ?? player.position)}
                </div>
              </div>

              {/* Tier badge */}
              {!compact && (
                <div style={{
                  background: "rgba(0,0,0,0.3)",
                  borderRadius: "6px",
                  padding: "2px 8px",
                  fontSize: "9px",
                  fontWeight: "800",
                  color: ratingColor,
                  letterSpacing: "1.5px",
                }}>
                  {tierLabel}
                </div>
              )}
            </div>

            {/* Initials circle */}
            {!compact && (
              <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", marginTop: "8px" }}>
                <div style={{
                  width: "72px",
                  height: "72px",
                  borderRadius: "50%",
                  background: isBenchPool ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.25)",
                  border: `3px solid ${isBenchPool ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)"}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "24px",
                  fontWeight: "900",
                  color: isBenchPool ? "#fff" : "#1a0a00",
                }}>
                  {player.initials}
                </div>
              </div>
            )}

            {/* Compact initials */}
            {compact && (
              <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontSize: "16px", fontWeight: "900", color: isBenchPool ? "#fff" : "#1a0a00" }}>
                  {player.initials}
                </span>
              </div>
            )}

            {/* Bottom: name + club */}
            <div style={{ textAlign: "center" }}>
              <div style={{
                fontSize: compact ? "9px" : "13px",
                fontWeight: "800",
                color: isBenchPool ? "#fff" : "#1a0a00",
                textShadow: isBenchPool ? "none" : "0 1px 0 rgba(255,200,0,0.6)",
                letterSpacing: "0.5px",
                lineHeight: 1.1,
                marginBottom: compact ? "2px" : "4px",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}>
                {player.name}
              </div>
              {!compact && (
                <div style={{
                  fontSize: "10px",
                  color: isBenchPool ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.5)",
                  fontWeight: "600",
                }}>
                  {player.club}
                </div>
              )}
            </div>

            {/* Listed badge */}
            {player.is_listed && (
              <div style={{
                position: "absolute",
                top: "8px",
                right: "8px",
                background: "#ef4444",
                borderRadius: "4px",
                padding: "2px 6px",
                fontSize: "8px",
                fontWeight: "700",
                color: "white",
              }}>
                LISTED
              </div>
            )}
          </div>
        </div>

        {/* ── BACK FACE ──────────────────────────────────────────────────────── */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
            borderRadius: "16px",
            overflow: "hidden",
            background: "linear-gradient(160deg, #0d1117 0%, #1c1f2e 50%, #0d1117 100%)",
            border: `1px solid ${ratingColor}40`,
            boxShadow: `0 8px 32px rgba(0,0,0,0.6), inset 0 1px 0 ${ratingColor}20`,
          }}
        >
          <div style={{ padding: "14px", height: "100%", display: "flex", flexDirection: "column", gap: "8px" }}>
            {/* Name header */}
            <div style={{ textAlign: "center", borderBottom: `1px solid ${ratingColor}30`, paddingBottom: "8px" }}>
              <div style={{ fontSize: "11px", fontWeight: "800", color: "#fff", letterSpacing: "0.5px" }}>{player.name}</div>
              <div style={{ fontSize: "9px", color: ratingColor, fontWeight: "700" }}>{player.club} · {player.country}</div>
            </div>

            {/* Stats */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "6px", justifyContent: "center" }}>
              {player.is_gk ? (
                <>
                  <StatRow label="FKS" value={player.fks} color="#60a5fa" icon={<Shield size={11} />} />
                  <StatRow label="PKS" value={player.pks} color="#a78bfa" icon={<Shield size={11} />} />
                </>
              ) : (
                <>
                  <StatRow label="FK" value={player.fk} color="#34d399" icon={<Target size={11} />} />
                  <StatRow label="PK" value={player.pk} color="#f87171" icon={<Target size={11} />} />
                </>
              )}
              <StatRow label="OVR" value={player.overall} color={ratingColor} icon={<Star size={11} />} />
            </div>

            {/* Quick sell value */}
            <div style={{
              textAlign: "center",
              fontSize: "10px",
              color: "rgba(255,255,255,0.4)",
              borderTop: "1px solid rgba(255,255,255,0.06)",
              paddingTop: "6px",
            }}>
              Quick Sell: <span style={{ color: "#fbbf24", fontWeight: "700" }}>🪙 {quickSellValue}</span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function StatRow({ label, value, color, icon }: { label: string; value: number | null | undefined; color: string; icon: React.ReactNode }) {
  const pct = Math.min(100, Math.max(0, value ?? 0));
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
      <div style={{ color, display: "flex", alignItems: "center" }}>{icon}</div>
      <div style={{ width: "28px", fontSize: "10px", fontWeight: "700", color: "rgba(255,255,255,0.6)" }}>{label}</div>
      <div style={{ flex: 1, height: "4px", background: "rgba(255,255,255,0.08)", borderRadius: "2px", overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: "2px", transition: "width 0.4s ease" }} />
      </div>
      <div style={{ width: "24px", textAlign: "right", fontSize: "11px", fontWeight: "700", color }}>{value ?? "—"}</div>
    </div>
  );
}

// CSS keyframes injected once via a style tag
if (typeof document !== "undefined" && !document.getElementById("card-animations")) {
  const style = document.createElement("style");
  style.id = "card-animations";
  style.textContent = `
    @keyframes goldShimmer {
      0%   { background-position: 0% 50%; }
      50%  { background-position: 100% 50%; }
      100% { background-position: 0% 50%; }
    }
    @keyframes shimmerSlide {
      0%   { background-position: -100% 0; }
      50%  { background-position: 200% 0; }
      100% { background-position: -100% 0; }
    }
  `;
  document.head.appendChild(style);
}
