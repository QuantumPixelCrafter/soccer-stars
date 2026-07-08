import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  useGetSquad,
  useGetPlayers,
  useSetSquadSlot,
  useRemoveSquadSlot,
  getGetSquadQueryKey,
} from "@workspace/api-client-react";
import type { PlayerCard, SquadSlotPlayer } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Users, X, Search, ChevronRight } from "lucide-react";

// ─── Formation definitions ─────────────────────────────────────────────────────
// x/y are percentages of the pitch area (0=left/top, 100=right/bottom)
// Attackers: ST at top-center, LW/RW flanking at same level but slightly lower
type SlotDef = {
  key: string;
  label: string;
  positions: string[];
  x: number;
  y: number;
};

type FormationDef = {
  id: string;
  name: string;
  slots: SlotDef[];
};

const DEFENSE_AND_GK: SlotDef[] = [
  { key: "LB",  label: "LB", positions: ["LB"],           x: 8,  y: 68 },
  { key: "CB1", label: "CB", positions: ["CB"],            x: 32, y: 68 },
  { key: "CB2", label: "CB", positions: ["CB"],            x: 68, y: 68 },
  { key: "RB",  label: "RB", positions: ["RB"],            x: 92, y: 68 },
  { key: "GK",  label: "GK", positions: ["GK"],            x: 50, y: 90 },
];

const ATTACK_LINE: SlotDef[] = [
  { key: "ST", label: "ST", positions: ["ST"], x: 50, y: 8  },
  { key: "LW", label: "LW", positions: ["LW"], x: 14, y: 20 },
  { key: "RW", label: "RW", positions: ["RW"], x: 86, y: 20 },
];

const FORMATIONS: FormationDef[] = [
  {
    id: "433",
    name: "4-3-3",
    slots: [
      ...ATTACK_LINE,
      { key: "MID1", label: "CM", positions: ["CM", "CDM", "CAM"], x: 20, y: 43 },
      { key: "MID2", label: "CM", positions: ["CM", "CDM", "CAM"], x: 50, y: 43 },
      { key: "MID3", label: "CM", positions: ["CM", "CDM", "CAM"], x: 80, y: 43 },
      ...DEFENSE_AND_GK,
    ],
  },
  {
    id: "433-defend",
    name: "4-3-3 Defend",
    slots: [
      ...ATTACK_LINE,
      { key: "CDM1", label: "CDM", positions: ["CDM", "CM"], x: 22, y: 48 },
      { key: "MID1", label: "CM",  positions: ["CM", "CDM", "CAM"], x: 50, y: 39 },
      { key: "CDM2", label: "CDM", positions: ["CDM", "CM"], x: 78, y: 48 },
      ...DEFENSE_AND_GK,
    ],
  },
  {
    id: "433-holding",
    name: "4-3-3 Holding",
    slots: [
      ...ATTACK_LINE,
      { key: "MID1", label: "CM",  positions: ["CM", "CDM", "CAM"], x: 22, y: 39 },
      { key: "CDM",  label: "CDM", positions: ["CDM", "CM"],        x: 50, y: 50 },
      { key: "MID2", label: "CM",  positions: ["CM", "CDM", "CAM"], x: 78, y: 39 },
      ...DEFENSE_AND_GK,
    ],
  },
  {
    id: "433-attack",
    name: "4-3-3 Attack",
    slots: [
      ...ATTACK_LINE,
      { key: "MID1", label: "CM",  positions: ["CM", "CDM", "CAM"], x: 22, y: 46 },
      { key: "CAM",  label: "CAM", positions: ["CAM", "CM"],        x: 50, y: 33 },
      { key: "MID2", label: "CM",  positions: ["CM", "CDM", "CAM"], x: 78, y: 46 },
      ...DEFENSE_AND_GK,
    ],
  },
];

const ALL_SLOT_INFO = Object.fromEntries(
  FORMATIONS.flatMap((f) => f.slots).map((s) => [s.key, s]),
);

export default function Squad() {
  const [formationId, setFormationId] = useState<string>(() => {
    return localStorage.getItem("squad_formation") ?? "433";
  });
  const [activeSlot, setActiveSlot] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const formation = FORMATIONS.find((f) => f.id === formationId) ?? FORMATIONS[0]!;

  const { data: squad, isLoading: squadLoading } = useGetSquad("main");
  const { data: allPlayers } = useGetPlayers();
  const setSlotMutation = useSetSquadSlot();
  const removeSlotMutation = useRemoveSquadSlot();

  const slots = (squad?.slots ?? {}) as Record<string, SquadSlotPlayer | null>;
  const teamOvr = squad?.team_ovr ?? null;

  // Count filled slots for current formation only
  const filledSlots = formation.slots.filter((s) => slots[s.key]).length;

  function switchFormation(id: string) {
    localStorage.setItem("squad_formation", id);
    setFormationId(id);
    setActiveSlot(null);
    setSearch("");
  }

  function ovrBuffText(ovr: number | null): string {
    if (!ovr) return "";
    if (ovr >= 85) return "+10% ATK BUFF";
    if (ovr >= 80) return "+5% ATK BUFF";
    if (ovr <= 60) return "-10% NERF";
    if (ovr <= 70) return "-5% NERF";
    return "Balanced";
  }

  const eligiblePlayers = useMemo(() => {
    if (!activeSlot || !allPlayers) return [];
    const info = ALL_SLOT_INFO[activeSlot];
    if (!info) return [];

    const usedInventoryIds = new Set(
      formation.slots
        .map((s) => slots[s.key])
        .filter(Boolean)
        .map((s) => (s as SquadSlotPlayer).inventory_id),
    );

    return allPlayers
      .filter((p) => {
        if (p.is_listed) return false;
        if (usedInventoryIds.has(p.inventory_id)) return false;
        if (info.positions.includes("GK")) return p.is_gk;
        if (p.is_gk) return false;
        return info.positions.includes(p.tactical_position ?? p.position);
      })
      .filter(
        (p) =>
          !search ||
          p.name.toLowerCase().includes(search.toLowerCase()) ||
          p.club.toLowerCase().includes(search.toLowerCase()),
      )
      .sort((a, b) => (b.overall ?? 0) - (a.overall ?? 0));
  }, [activeSlot, allPlayers, slots, search, formation]);

  function handleAssign(player: PlayerCard) {
    if (!activeSlot) return;
    setSlotMutation.mutate(
      { squadType: "main", data: { slot_key: activeSlot, inventory_id: player.inventory_id } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetSquadQueryKey("main") });
          setActiveSlot(null);
          setSearch("");
        },
        onError: (err) => {
          const msg = (err.data as { error?: string })?.error ?? "Failed to assign player";
          toast({ variant: "destructive", title: "Error", description: msg });
        },
      },
    );
  }

  function handleRemove(slotKey: string) {
    removeSlotMutation.mutate(
      { squadType: "main", slotKey },
      { onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetSquadQueryKey("main") }) },
    );
  }

  if (squadLoading) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-48 bg-card rounded-lg animate-pulse" />
        <div className="h-[500px] bg-card rounded-2xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight mb-1">Main Squad</h1>
          <p className="text-muted-foreground">
            {formation.name} · {filledSlots}/11 players
          </p>
        </div>
        {teamOvr && (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex flex-col items-center px-6 py-3 rounded-xl border border-yellow-500/30 bg-yellow-500/10"
          >
            <div className="text-3xl font-black text-yellow-400">{teamOvr}</div>
            <div className="text-xs text-yellow-400/70 font-bold uppercase tracking-widest">Team OVR</div>
            <div className="text-xs text-yellow-300/60 mt-0.5">{ovrBuffText(teamOvr)}</div>
          </motion.div>
        )}
      </div>

      {/* Formation selector */}
      <div className="flex gap-2 flex-wrap">
        {FORMATIONS.map((f) => (
          <button
            key={f.id}
            onClick={() => switchFormation(f.id)}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all border ${
              formationId === f.id
                ? "bg-yellow-500/20 border-yellow-500/60 text-yellow-300"
                : "bg-card border-border text-muted-foreground hover:text-foreground hover:border-border/80"
            }`}
          >
            {f.name}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pitch */}
        <div className="lg:col-span-2">
          <div
            className="relative rounded-2xl overflow-hidden"
            style={{
              background:
                "linear-gradient(180deg, #0f4c1a 0%, #1a6b2a 30%, #1a6b2a 70%, #0f4c1a 100%)",
              paddingBottom: "80%", // keep aspect ratio
            }}
          >
            {/* Pitch markings */}
            <div style={{ position: "absolute", inset: 0 }}>
              {/* Centre circle */}
              <div
                style={{
                  position: "absolute",
                  left: "50%",
                  top: "55%",
                  width: "28%",
                  paddingTop: "28%",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: "50%",
                  transform: "translate(-50%, -50%)",
                }}
              />
              {/* Halfway line */}
              <div
                style={{
                  position: "absolute",
                  left: "5%",
                  right: "5%",
                  top: "55%",
                  height: "1px",
                  background: "rgba(255,255,255,0.10)",
                }}
              />
              {/* Penalty area */}
              <div
                style={{
                  position: "absolute",
                  left: "25%",
                  right: "25%",
                  bottom: "5%",
                  height: "20%",
                  border: "1px solid rgba(255,255,255,0.12)",
                }}
              />
            </div>

            {/* Slots – absolutely positioned */}
            <div style={{ position: "absolute", inset: 0 }}>
              {formation.slots.map((slotDef) => {
                const player = slots[slotDef.key] as SquadSlotPlayer | null | undefined;
                const isActive = activeSlot === slotDef.key;

                return (
                  <div
                    key={slotDef.key}
                    style={{
                      position: "absolute",
                      left: `${slotDef.x}%`,
                      top: `${slotDef.y}%`,
                      transform: "translate(-50%, -50%)",
                      width: "72px",
                      textAlign: "center",
                    }}
                  >
                    {player ? (
                      <FilledSlot
                        player={player}
                        label={slotDef.label}
                        onRemove={() => handleRemove(slotDef.key)}
                        onClick={() =>
                          setActiveSlot(slotDef.key === activeSlot ? null : slotDef.key)
                        }
                      />
                    ) : (
                      <EmptySlot
                        label={slotDef.label}
                        isActive={isActive}
                        onClick={() =>
                          setActiveSlot(slotDef.key === activeSlot ? null : slotDef.key)
                        }
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Player picker */}
        <div>
          <AnimatePresence mode="wait">
            {activeSlot ? (
              <motion.div
                key="picker"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="bg-card border border-border rounded-2xl p-4 space-y-4"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-lg">Select Player</h3>
                    <p className="text-muted-foreground text-sm">
                      Slot:{" "}
                      <span className="text-primary font-bold">
                        {ALL_SLOT_INFO[activeSlot]?.label}
                      </span>
                      {" · "}
                      <span className="text-xs">
                        {ALL_SLOT_INFO[activeSlot]?.positions.join(", ")}
                      </span>
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setActiveSlot(null);
                      setSearch("");
                    }}
                    className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                  >
                    <X size={18} className="text-muted-foreground" />
                  </button>
                </div>

                <div className="relative">
                  <Search
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  />
                  <Input
                    placeholder="Search…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 h-9"
                  />
                </div>

                <div className="space-y-1.5 max-h-[420px] overflow-y-auto">
                  {eligiblePlayers.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      No compatible players in your collection
                    </div>
                  ) : (
                    eligiblePlayers.map((player) => (
                      <PickerRow
                        key={player.inventory_id}
                        player={player}
                        onSelect={() => handleAssign(player)}
                      />
                    ))
                  )}
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="hint"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="bg-card border border-border rounded-2xl p-6 flex flex-col items-center justify-center text-center gap-4 min-h-[200px]"
              >
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Users size={24} className="text-primary" />
                </div>
                <div>
                  <h3 className="font-bold mb-1">Build Your Squad</h3>
                  <p className="text-muted-foreground text-sm">
                    Tap an empty slot on the pitch to assign a player
                  </p>
                </div>
                <div className="w-full border-t border-border pt-4 text-left space-y-1 text-xs text-muted-foreground">
                  <div>• Fill all 11 slots to unlock Team OVR</div>
                  <div>• Choose from 4 tactical formations above</div>
                  <div>• Midfield slots accept CM, CDM or CAM</div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function FilledSlot({
  player,
  label,
  onRemove,
  onClick,
}: {
  player: SquadSlotPlayer;
  label: string;
  onRemove: () => void;
  onClick: () => void;
}) {
  const ovr = player.overall ?? 0;
  const color =
    ovr >= 85 ? "#ff6b35" : ovr >= 78 ? "#ffd700" : ovr >= 70 ? "#c0c0c0" : "#cd7f32";

  return (
    <div className="relative group cursor-pointer" onClick={onClick}>
      <div
        style={{
          width: "72px",
          height: "82px",
          borderRadius: "10px",
          overflow: "hidden",
          background: player.is_bench_pool
            ? "linear-gradient(135deg, #3a3a4a, #5a5a6a)"
            : "linear-gradient(135deg, #7c5c0a, #ffd700, #c9922a, #ffd700, #7c5c0a)",
          backgroundSize: "200% 200%",
          animation: "goldShimmer 4s ease-in-out infinite",
          border: `2px solid ${color}80`,
          position: "relative",
          boxShadow: `0 4px 16px ${color}30`,
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            padding: "5px",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              fontSize: "13px",
              fontWeight: "900",
              color: player.is_bench_pool ? "#ddd" : "#1a0a00",
              lineHeight: 1,
            }}
          >
            {ovr}
          </div>
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span
              style={{
                fontSize: "12px",
                fontWeight: "900",
                color: player.is_bench_pool ? "#fff" : "#1a0a00",
              }}
            >
              {player.initials}
            </span>
          </div>
          <div
            style={{
              fontSize: "7px",
              fontWeight: "700",
              color: player.is_bench_pool
                ? "rgba(255,255,255,0.7)"
                : "rgba(0,0,0,0.5)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              textAlign: "center",
            }}
          >
            {player.name.split(" ").slice(-1)[0]}
          </div>
        </div>
      </div>

      {/* Remove button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-destructive text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
      >
        <X size={10} />
      </button>

      <div className="mt-1 text-center text-[9px] font-bold text-white/70 uppercase tracking-wider drop-shadow">
        {label}
      </div>
    </div>
  );
}

function EmptySlot({
  label,
  isActive,
  onClick,
}: {
  label: string;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <div className="cursor-pointer" onClick={onClick}>
      <div
        style={{
          width: "72px",
          height: "82px",
          borderRadius: "10px",
          border: `2px dashed ${isActive ? "#ffd700" : "rgba(255,255,255,0.25)"}`,
          background: isActive ? "rgba(255,215,0,0.10)" : "rgba(255,255,255,0.05)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "all 0.2s",
        }}
      >
        <span
          style={{
            fontSize: "20px",
            color: isActive ? "#ffd700" : "rgba(255,255,255,0.35)",
          }}
        >
          +
        </span>
      </div>
      <div className="mt-1 text-center text-[9px] font-bold text-white/50 uppercase tracking-wider drop-shadow">
        {label}
      </div>
    </div>
  );
}

function PickerRow({ player, onSelect }: { player: PlayerCard; onSelect: () => void }) {
  const ovr = player.overall ?? 0;
  const color =
    ovr >= 85 ? "#ff6b35" : ovr >= 78 ? "#ffd700" : ovr >= 70 ? "#c0c0c0" : "#cd7f32";

  return (
    <button
      onClick={onSelect}
      className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-muted/50 transition-colors text-left"
    >
      {/* Mini card */}
      <div
        style={{
          width: "36px",
          height: "44px",
          borderRadius: "6px",
          flexShrink: 0,
          background: player.is_bench_pool
            ? "linear-gradient(135deg, #3a3a4a, #5a5a6a)"
            : "linear-gradient(135deg, #7c5c0a, #ffd700, #c9922a)",
          backgroundSize: "200% 200%",
          animation: "goldShimmer 4s ease-in-out infinite",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          border: `1px solid ${color}50`,
        }}
      >
        <span
          style={{
            fontSize: "11px",
            fontWeight: "900",
            color: player.is_bench_pool ? "#ddd" : "#1a0a00",
          }}
        >
          {ovr}
        </span>
        <span
          style={{
            fontSize: "9px",
            fontWeight: "700",
            color: player.is_bench_pool ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.5)",
          }}
        >
          {player.tactical_position ?? player.position}
        </span>
      </div>

      <div className="flex-1 min-w-0">
        <div className="font-bold text-sm truncate">{player.name}</div>
        <div className="text-xs text-muted-foreground truncate">{player.club}</div>
      </div>

      <ChevronRight size={14} className="text-muted-foreground shrink-0" />
    </button>
  );
}
