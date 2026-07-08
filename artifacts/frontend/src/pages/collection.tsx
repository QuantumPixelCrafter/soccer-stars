import { useState, useMemo } from "react";
import { useGetPlayers } from "@workspace/api-client-react";
import type { PlayerCard as PlayerCardType } from "@workspace/api-client-react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlayerCard } from "@/components/player-card";
import { ExchangeOverlay } from "@/components/exchange-overlay";
import { useQueryClient } from "@tanstack/react-query";
import { getGetPlayersQueryKey, getGetBalanceQueryKey, getGetInventorySummaryQueryKey } from "@workspace/api-client-react";

export default function Collection() {
  const { data: players, isLoading } = useGetPlayers();
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<"all" | "shooter" | "gk" | "gold" | "bench">("all");
  const [exchangeCards, setExchangeCards] = useState<PlayerCardType[]>([]);
  const qc = useQueryClient();

  const filteredPlayers = useMemo(() => {
    if (!players) return [];
    return players
      .filter((p) => {
        const matchesSearch =
          p.name.toLowerCase().includes(search.toLowerCase()) ||
          p.club.toLowerCase().includes(search.toLowerCase());
        const matchesType =
          filterType === "all" ||
          (filterType === "gk" && p.is_gk) ||
          (filterType === "shooter" && !p.is_gk) ||
          (filterType === "gold" && !p.is_bench_pool) ||
          (filterType === "bench" && p.is_bench_pool);
        return matchesSearch && matchesType;
      })
      .sort((a, b) => (b.overall ?? 0) - (a.overall ?? 0));
  }, [players, search, filterType]);

  const goldCount = players?.filter((p) => !p.is_bench_pool).length ?? 0;
  const benchCount = players?.filter((p) => p.is_bench_pool).length ?? 0;

  function handleExchangeSingle(card: PlayerCardType) {
    setExchangeCards([card]);
  }

  function handleExchangeComplete() {
    setExchangeCards([]);
    qc.invalidateQueries({ queryKey: getGetPlayersQueryKey() });
    qc.invalidateQueries({ queryKey: getGetBalanceQueryKey() });
    qc.invalidateQueries({ queryKey: getGetInventorySummaryQueryKey() });
  }

  return (
    <div className="space-y-8">
      {/* Exchange overlay */}
      {exchangeCards.length > 0 && (
        <ExchangeOverlay duplicateCards={exchangeCards} onComplete={handleExchangeComplete} />
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h1 className="text-4xl font-bold tracking-tight mb-2">Your Collection</h1>
          <p className="text-muted-foreground text-lg">
            {players?.length ?? 0} cards ·{" "}
            <span className="text-yellow-400 font-semibold">{goldCount} Gold</span>
            {" · "}
            <span className="text-slate-400 font-semibold">{benchCount} Bench</span>
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            <Input
              placeholder="Search players or clubs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-card border-border h-11"
            />
          </div>
          <div className="w-full sm:w-44 flex items-center gap-2">
            <Filter size={18} className="text-muted-foreground hidden sm:block shrink-0" />
            <Select value={filterType} onValueChange={(v: any) => setFilterType(v)}>
              <SelectTrigger className="h-11 bg-card border-border">
                <SelectValue placeholder="All Cards" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Cards</SelectItem>
                <SelectItem value="gold">Gold Cards</SelectItem>
                <SelectItem value="bench">Bench Pool</SelectItem>
                <SelectItem value="shooter">Shooters Only</SelectItem>
                <SelectItem value="gk">Goalkeepers Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="h-80 bg-card rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : filteredPlayers.length === 0 ? (
        <div className="py-20 text-center border border-dashed border-border rounded-2xl bg-card/30">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
            <Search className="text-muted-foreground" size={24} />
          </div>
          <h3 className="text-xl font-bold mb-2">No players found</h3>
          <p className="text-muted-foreground">Try adjusting your filters or search term.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          <AnimatePresence mode="popLayout">
            {filteredPlayers.map((player, index) => (
              <div key={player.inventory_id} className="relative group">
                <PlayerCard
                  player={player}
                  index={index}
                  onClick={() => {}} // flip handled on hover
                />
                {/* Quick-sell button on hover */}
                {!player.is_listed && (
                  <motion.button
                    initial={{ opacity: 0 }}
                    whileHover={{ opacity: 1 }}
                    className="absolute bottom-2 left-2 right-2 py-1.5 rounded-lg text-xs font-bold bg-yellow-500/90 text-black opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleExchangeSingle(player);
                    }}
                  >
                    🪙 Quick Sell
                  </motion.button>
                )}
                {player.is_listed && (
                  <div className="absolute bottom-2 left-2 right-2 py-1.5 rounded-lg text-xs font-bold bg-red-500/80 text-white text-center pointer-events-none">
                    On Market
                  </div>
                )}
              </div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
