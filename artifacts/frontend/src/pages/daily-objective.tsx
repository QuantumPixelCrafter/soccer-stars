import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  useGetDailyObjective,
  useGetPlayers,
  useSetSquadSlot,
  useRemoveSquadSlot,
  getGetSquadQueryKey,
  getGetDailyObjectiveQueryKey,
} from "@workspace/api-client-react";
import type { PlayerCard, SquadSlotPlayer } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Search, Target, Clock, X, ChevronRight, RefreshCw } from "lucide-react";

// Position slots for each formation string (simplified 11-man)
// Key format: [slot_key, tactical positions allowed]
const FORMATION_SLOTS: Record<string, Array<[string, string[]]>> = {
  "4-4-2":      [["GK",["GK"]],["RB",["RB"]],["CB1",["CB"]],["CB2",["CB"]],["LB",["LB"]],["RW",["RW","FW"]],["MID1",["CM","CDM","CAM","MF"]],["MID2",["CM","CDM","CAM","MF"]],["LW",["LW","FW"]],["ST",["ST","FW"]],["ST2",["ST","FW"]]],
  "4-2-3-1":    [["GK",["GK"]],["RB",["RB"]],["CB1",["CB"]],["CB2",["CB"]],["LB",["LB"]],["CDM1",["CDM","CM","MF"]],["CDM2",["CDM","CM","MF"]],["RW",["RW","FW","CAM","MF"]],["CAM",["CAM","CM","MF"]],["LW",["LW","FW","CAM","MF"]],["ST",["ST","FW"]]],
  "3-5-2":      [["GK",["GK"]],["CB1",["CB"]],["CB2",["CB"]],["CB3",["CB"]],["RW",["RW","FW","MF"]],["MID1",["CM","CDM","CAM","MF"]],["MID2",["CM","CDM","CAM","MF"]],["MID3",["CM","CDM","CAM","MF"]],["LW",["LW","FW","MF"]],["ST",["ST","FW"]],["ST2",["ST","FW"]]],
  "3-4-3":      [["GK",["GK"]],["CB1",["CB"]],["CB2",["CB"]],["CB3",["CB"]],["RB",["RB","MF"]],["MID1",["CM","CDM","CAM","MF"]],["MID2",["CM","CDM","CAM","MF"]],["LB",["LB","MF"]],["RW",["RW","FW"]],["ST",["ST","FW"]],["LW",["LW","FW"]]],
  "5-3-2":      [["GK",["GK"]],["RB",["RB"]],["CB1",["CB"]],["CB2",["CB"]],["CB3",["CB"]],["LB",["LB"]],["MID1",["CM","CDM","CAM","MF"]],["MID2",["CM","CDM","CAM","MF"]],["MID3",["CM","CDM","CAM","MF"]],["ST",["ST","FW"]],["ST2",["ST","FW"]]],
  "5-4-1":      [["GK",["GK"]],["RB",["RB"]],["CB1",["CB"]],["CB2",["CB"]],["CB3",["CB"]],["LB",["LB"]],["RW",["RW","FW","MF"]],["MID1",["CM","CDM","CAM","MF"]],["MID2",["CM","CDM","CAM","MF"]],["LW",["LW","FW","MF"]],["ST",["ST","FW"]]],
  "4-1-4-1":    [["GK",["GK"]],["RB",["RB"]],["CB1",["CB"]],["CB2",["CB"]],["LB",["LB"]],["CDM",["CDM","CM","MF"]],["RW",["RW","FW","CAM","MF"]],["MID1",["CM","CAM","MF"]],["MID2",["CM","CAM","MF"]],["LW",["LW","FW","CAM","MF"]],["ST",["ST","FW"]]],
  "4-3-2-1":    [["GK",["GK"]],["RB",["RB"]],["CB1",["CB"]],["CB2",["CB"]],["LB",["LB"]],["MID1",["CM","CDM","MF"]],["MID2",["CM","CDM","MF"]],["MID3",["CM","CDM","MF"]],["CAM1",["CAM","CM","MF"]],["CAM2",["CAM","CM","MF"]],["ST",["ST","FW"]]],
  "4-2-2-2":    [["GK",["GK"]],["RB",["RB"]],["CB1",["CB"]],["CB2",["CB"]],["LB",["LB"]],["CDM1",["CDM","CM","MF"]],["CDM2",["CDM","CM","MF"]],["RW",["RW","FW","CAM","MF"]],["LW",["LW","FW","CAM","MF"]],["ST",["ST","FW"]],["ST2",["ST","FW"]]],
  "4-4-1-1":    [["GK",["GK"]],["RB",["RB"]],["CB1",["CB"]],["CB2",["CB"]],["LB",["LB"]],["RW",["RW","FW","MF"]],["MID1",["CM","CDM","MF"]],["MID2",["CM","CDM","MF"]],["LW",["LW","FW","MF"]],["CAM",["CAM","CM","MF"]],["ST",["ST","FW"]]],
  "4-5-1":      [["GK",["GK"]],["RB",["RB"]],["CB1",["CB"]],["CB2",["CB"]],["LB",["LB"]],["RW",["RW","FW","MF"]],["MID1",["CM","CDM","CAM","MF"]],["MID2",["CM","CDM","CAM","MF"]],["MID3",["CM","CDM","CAM","MF"]],["LW",["LW","FW","MF"]],["ST",["ST","FW"]]],
  "4-1-2-1-2":  [["GK",["GK"]],["RB",["RB"]],["CB1",["CB"]],["CB2",["CB"]],["LB",["LB"]],["CDM",["CDM","CM","MF"]],["MID1",["CM","MF"]],["MID2",["CM","MF"]],["CAM",["CAM","CM","MF"]],["ST",["ST","FW"]],["ST2",["ST","FW"]]],
  "3-6-1":      [["GK",["GK"]],["CB1",["CB"]],["CB2",["CB"]],["CB3",["CB"]],["RW",["RW","FW","MF"]],["MID1",["CM","CDM","MF"]],["MID2",["CM","CDM","MF"]],["MID3",["CM","CDM","MF"]],["MID4",["CM","CAM","MF"]],["LW",["LW","FW","MF"]],["ST",["ST","FW"]]],
  "3-4-2-1":    [["GK",["GK"]],["CB1",["CB"]],["CB2",["CB"]],["CB3",["CB"]],["RB",["RB","MF"]],["MID1",["CM","CDM","MF"]],["MID2",["CM","CDM","MF"]],["LB",["LB","MF"]],["CAM1",["CAM","CM","MF"]],["CAM2",["CAM","CM","MF"]],["ST",["ST","FW"]]],
  "4-2-4":      [["GK",["GK"]],["RB",["RB"]],["CB1",["CB"]],["CB2",["CB"]],["LB",["LB"]],["CDM1",["CDM","CM","MF"]],["CDM2",["CDM","CM","MF"]],["RW",["RW","FW"]],["ST",["ST","FW"]],["ST2",["ST","FW"]],["LW",["LW","FW"]]],
  "5-2-3":      [["GK",["GK"]],["RB",["RB"]],["CB1",["CB"]],["CB2",["CB"]],["CB3",["CB"]],["LB",["LB"]],["MID1",["CM","CDM","CAM","MF"]],["MID2",["CM","CDM","CAM","MF"]],["RW",["RW","FW"]],["ST",["ST","FW"]],["LW",["LW","FW"]]],
};

function useCountdownToReset(nextResetAt: string | undefined) {
  const [display, setDisplay] = useState("");
  useEffect(() => {
    if (!nextResetAt) return;
    const tick = () => {
      const secs = Math.max(0, Math.floor((new Date(nextResetAt).getTime() - Date.now()) / 1000));
      const h = Math.floor(secs / 3600);
      const m = Math.floor((secs % 3600) / 60);
      const s = secs % 60;
      setDisplay(`${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [nextResetAt]);
  return display;
}

export default function DailyObjective() {
  const [activeSlot, setActiveSlot] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: objective, isLoading } = useGetDailyObjective();
  const { data: allPlayers } = useGetPlayers();
  const setSlotMutation = useSetSquadSlot();
  const removeSlotMutation = useRemoveSquadSlot();

  const countdown = useCountdownToReset(objective?.next_reset_at);

  const formation = objective?.formation ?? "4-4-2";
  const formationSlots = FORMATION_SLOTS[formation] ?? FORMATION_SLOTS["4-4-2"]!;

  // Build slots map from server squad
  const serverSlots = (objective?.squad?.slots as any[]) ?? [];
  const slotMap: Record<string, SquadSlotPlayer | null> = {};
  for (const [key] of formationSlots) slotMap[key] = null;
  for (const row of serverSlots) {
    if (row.slot_key && row.inventory_id) {
      slotMap[row.slot_key] = row as SquadSlotPlayer;
    }
  }

  const filledCount = Object.values(slotMap).filter(Boolean).length;

  // Eligible players for active slot
  const eligible = (() => {
    if (!activeSlot || !allPlayers) return [];
    const info = formationSlots.find(([k]) => k === activeSlot);
    if (!info) return [];
    const [, allowedPositions] = info;
    const usedIds = new Set(Object.values(slotMap).filter(Boolean).map((s) => (s as SquadSlotPlayer).inventory_id));

    return allPlayers.filter((p) => {
      if (p.is_listed || usedIds.has(p.inventory_id)) return false;
      if (allowedPositions.includes("GK")) return p.is_gk;
      if (p.is_gk) return false;
      return allowedPositions.includes(p.tactical_position ?? p.position);
    }).filter((p) =>
      !search || p.name.toLowerCase().includes(search.toLowerCase()),
    ).sort((a, b) => (b.overall ?? 0) - (a.overall ?? 0));
  })();

  function handleAssign(player: PlayerCard) {
    if (!activeSlot) return;
    setSlotMutation.mutate(
      { squadType: "daily_objective", data: { slot_key: activeSlot, inventory_id: player.inventory_id } },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getGetSquadQueryKey("daily_objective") });
          qc.invalidateQueries({ queryKey: getGetDailyObjectiveQueryKey() });
          setActiveSlot(null);
          setSearch("");
        },
        onError: (e) => toast({ variant: "destructive", title: "Error", description: (e.data as any)?.error }),
      },
    );
  }

  function handleRemove(slotKey: string) {
    removeSlotMutation.mutate(
      { squadType: "daily_objective", slotKey },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getGetSquadQueryKey("daily_objective") });
          qc.invalidateQueries({ queryKey: getGetDailyObjectiveQueryKey() });
        },
      },
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-48 bg-card rounded-lg animate-pulse" />
        <div className="h-64 bg-card rounded-2xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight mb-1">Daily Objective</h1>
          <p className="text-muted-foreground">Today's formation challenge · Resets at midnight UTC</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-card border border-border">
            <Clock size={16} className="text-muted-foreground" />
            <span className="font-mono font-bold text-lg tabular-nums">{countdown}</span>
          </div>
        </div>
      </div>

      {/* Formation badge */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-5 rounded-2xl border border-primary/30 bg-primary/5"
      >
        <div>
          <div className="text-xs font-bold text-primary/60 uppercase tracking-widest mb-1">Today's Formation</div>
          <div className="text-5xl font-black text-primary tracking-tight">{formation}</div>
        </div>
        <div className="sm:ml-auto text-sm text-muted-foreground max-w-xs">
          Build a valid 11-man squad using the <strong>{formation}</strong> formation from your collection.
          Positional rules apply — midfield slots vary by formation.
        </div>
        <div className="flex flex-col items-center gap-1">
          <div className="text-2xl font-black text-foreground">{filledCount}/11</div>
          <div className="text-xs text-muted-foreground">Filled</div>
        </div>
        {objective?.squad?.team_ovr && (
          <div className="flex flex-col items-center gap-1">
            <div className="text-2xl font-black text-yellow-400">{objective.squad.team_ovr}</div>
            <div className="text-xs text-muted-foreground">OVR</div>
          </div>
        )}
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Slot grid */}
        <div className="lg:col-span-2">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {formationSlots.map(([slotKey, allowed], i) => {
              const player = slotMap[slotKey];
              const isActive = activeSlot === slotKey;
              return (
                <motion.div
                  key={slotKey}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                >
                  {player ? (
                    <FilledSlotCard
                      player={player as SquadSlotPlayer}
                      slotLabel={slotKey}
                      onRemove={() => handleRemove(slotKey)}
                    />
                  ) : (
                    <EmptySlotCard
                      slotLabel={slotKey}
                      positions={allowed}
                      isActive={isActive}
                      onClick={() => setActiveSlot(slotKey === activeSlot ? null : slotKey)}
                    />
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Player picker */}
        <div>
          {activeSlot ? (
            <div className="bg-card border border-border rounded-2xl p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold">Select Player</h3>
                  <p className="text-xs text-muted-foreground">
                    {activeSlot} · {formationSlots.find(([k]) => k === activeSlot)?.[1].join(", ")}
                  </p>
                </div>
                <button onClick={() => { setActiveSlot(null); setSearch(""); }} className="p-1 rounded hover:bg-muted">
                  <X size={16} className="text-muted-foreground" />
                </button>
              </div>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9 text-sm" />
              </div>
              <div className="space-y-1.5 max-h-[400px] overflow-y-auto">
                {eligible.length === 0 ? (
                  <div className="text-center py-8 text-sm text-muted-foreground">No compatible players</div>
                ) : eligible.map((p) => (
                  <button
                    key={p.inventory_id}
                    onClick={() => handleAssign(p)}
                    className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-muted/50 transition-colors text-left"
                  >
                    <div style={{
                      width: "36px", height: "44px", borderRadius: "6px", flexShrink: 0,
                      background: p.is_bench_pool
                        ? "linear-gradient(135deg, #3a3a4a, #5a5a6a)"
                        : "linear-gradient(135deg, #7c5c0a, #ffd700, #c9922a)",
                      backgroundSize: "200% 200%",
                      animation: "goldShimmer 4s ease-in-out infinite",
                      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                    }}>
                      <span style={{ fontSize: "11px", fontWeight: "900", color: p.is_bench_pool ? "#ddd" : "#1a0a00" }}>{p.overall}</span>
                      <span style={{ fontSize: "8px", fontWeight: "700", color: p.is_bench_pool ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.5)" }}>
                        {p.tactical_position ?? p.position}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-sm truncate">{p.name}</div>
                      <div className="text-xs text-muted-foreground">{p.club}</div>
                    </div>
                    <ChevronRight size={14} className="text-muted-foreground shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
              <div className="flex items-center gap-2 font-bold"><RefreshCw size={16} className="text-primary" /> Formation Pool</div>
              <p className="text-xs text-muted-foreground">16 formations rotate daily. Today's challenge:</p>
              <div className="flex flex-wrap gap-1.5">
                {objective?.formations_pool?.map((f) => (
                  <span
                    key={f}
                    className={`text-xs px-2 py-1 rounded-md font-bold ${f === formation ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
                  >
                    {f}
                  </span>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">Tap an empty slot to assign a player from your collection.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FilledSlotCard({ player, slotLabel, onRemove }: { player: SquadSlotPlayer; slotLabel: string; onRemove: () => void }) {
  const ovr = player.overall ?? 0;
  const color = ovr >= 85 ? "#ff6b35" : ovr >= 78 ? "#ffd700" : ovr >= 70 ? "#c0c0c0" : "#cd7f32";
  return (
    <div className="relative group bg-card border rounded-xl p-3 flex items-center gap-3" style={{ borderColor: `${color}40` }}>
      <div style={{
        width: "40px", height: "50px", borderRadius: "6px", flexShrink: 0,
        background: player.is_bench_pool
          ? "linear-gradient(135deg, #3a3a4a, #5a5a6a)"
          : "linear-gradient(135deg, #7c5c0a, #ffd700, #c9922a)",
        backgroundSize: "200% 200%",
        animation: "goldShimmer 4s ease-in-out infinite",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        border: `1px solid ${color}50`,
      }}>
        <span style={{ fontSize: "12px", fontWeight: "900", color: player.is_bench_pool ? "#ddd" : "#1a0a00" }}>{ovr}</span>
        <span style={{ fontSize: "9px", fontWeight: "900", color: player.is_bench_pool ? "#fff" : "#1a0a00" }}>{player.initials}</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{slotLabel}</div>
        <div className="font-bold text-sm truncate">{player.name}</div>
        <div className="text-xs text-muted-foreground">{player.tactical_position}</div>
      </div>
      <button
        onClick={onRemove}
        className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-destructive/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <X size={10} />
      </button>
    </div>
  );
}

function EmptySlotCard({ slotLabel, positions, isActive, onClick }: { slotLabel: string; positions: string[]; isActive: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 rounded-xl p-3 border-2 border-dashed transition-all text-left"
      style={{
        borderColor: isActive ? "#ffd700" : "rgba(255,255,255,0.1)",
        background: isActive ? "rgba(255,215,0,0.06)" : "transparent",
      }}
    >
      <div style={{
        width: "40px", height: "50px", borderRadius: "6px", flexShrink: 0,
        background: "rgba(255,255,255,0.04)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <span style={{ fontSize: "18px", color: isActive ? "#ffd700" : "rgba(255,255,255,0.2)" }}>+</span>
      </div>
      <div>
        <div className="text-xs font-bold uppercase tracking-wider" style={{ color: isActive ? "#ffd700" : "rgba(255,255,255,0.3)" }}>{slotLabel}</div>
        <div className="text-xs text-muted-foreground/50 truncate">{positions.slice(0,3).join(", ")}</div>
      </div>
    </button>
  );
}
