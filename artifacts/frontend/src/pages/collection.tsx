import { useState, useMemo } from "react";
import { useGetPlayers, PlayerCard as PlayerCardType } from "@workspace/api-client-react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Shield, Target, CalendarDays, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";

export default function Collection() {
  const { data: players, isLoading } = useGetPlayers();
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<"all" | "shooter" | "gk">("all");

  const filteredPlayers = useMemo(() => {
    if (!players) return [];
    return players.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || 
                           p.club.toLowerCase().includes(search.toLowerCase());
      const matchesType = filterType === "all" || 
                         (filterType === "gk" && p.is_gk) || 
                         (filterType === "shooter" && !p.is_gk);
      return matchesSearch && matchesType;
    }).sort((a, b) => new Date(b.acquired_at).getTime() - new Date(a.acquired_at).getTime());
  }, [players, search, filterType]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h1 className="text-4xl font-bold tracking-tight mb-2">Your Collection</h1>
          <p className="text-muted-foreground text-lg">Browse your {players?.length ?? 0} player cards.</p>
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
          <div className="w-full sm:w-40 flex items-center gap-2">
            <Filter size={18} className="text-muted-foreground hidden sm:block" />
            <Select value={filterType} onValueChange={(v: any) => setFilterType(v)}>
              <SelectTrigger className="h-11 bg-card border-border">
                <SelectValue placeholder="All Positions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Positions</SelectItem>
                <SelectItem value="shooter">Shooters Only</SelectItem>
                <SelectItem value="gk">Goalkeepers Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-96 bg-card rounded-2xl animate-pulse" />
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
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          <AnimatePresence mode="popLayout">
            {filteredPlayers.map((player, index) => (
              <PlayerCard key={player.id} player={player} index={index} />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

function PlayerCard({ player, index }: { player: PlayerCardType, index: number }) {
  const isGK = player.is_gk;
  
  // Calculate an overall rating approximation
  const overall = isGK 
    ? Math.round(((player.fks || 0) + (player.pks || 0)) / 2)
    : Math.round(((player.fk || 0) + (player.pk || 0)) / 2);
    
  // Card styles based on position and rating
  const isRare = overall >= 85;
  const borderClass = isRare ? "border-primary shadow-[0_0_15px_rgba(255,170,0,0.2)]" : "border-border";
  const bgClass = isGK ? "bg-gradient-to-b from-[#0A1F16] to-card" : "bg-gradient-to-b from-[#1E1100] to-card";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ delay: Math.min(index * 0.05, 0.5), duration: 0.3 }}
      className={`relative rounded-2xl overflow-hidden border ${borderClass} ${bgClass} group hover:-translate-y-2 transition-transform duration-300`}
    >
      {/* Sparkle effect on rare cards */}
      {isRare && (
        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      )}
      
      {/* Top Banner */}
      <div className="px-5 py-4 flex justify-between items-start relative z-10">
        <div className="flex flex-col items-center">
          <span className="text-3xl font-black font-mono tracking-tighter text-white drop-shadow-md">{overall}</span>
          <span className="text-xs font-bold uppercase tracking-wider text-white/70">{player.position}</span>
        </div>
        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isGK ? 'bg-secondary/20 text-secondary' : 'bg-primary/20 text-primary'}`}>
          {isGK ? <Shield size={16} /> : <Target size={16} />}
        </div>
      </div>
      
      {/* Player Image Placeholder (Using initials or generic silhouette) */}
      <div className="h-40 flex items-center justify-center relative">
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent z-10" />
        <div className="w-24 h-24 rounded-full border-2 border-white/10 flex items-center justify-center bg-black/30 backdrop-blur-sm z-0 shadow-xl overflow-hidden relative group-hover:scale-110 transition-transform duration-500">
          <span className="text-4xl font-black opacity-20 uppercase">
            {player.name.substring(0, 2)}
          </span>
        </div>
      </div>
      
      {/* Info Section */}
      <div className="p-5 pt-0 relative z-10 text-center">
        <h3 className="text-xl font-bold uppercase tracking-tight text-white mb-1 line-clamp-1">{player.name}</h3>
        <p className="text-sm font-medium text-white/60 mb-4 pb-4 border-b border-white/10 uppercase tracking-wider">{player.club}</p>
        
        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          {isGK ? (
            <>
              <Stat label="FKS" value={player.fks || 0} />
              <Stat label="PKS" value={player.pks || 0} />
            </>
          ) : (
            <>
              <Stat label="FK" value={player.fk || 0} />
              <Stat label="PK" value={player.pk || 0} />
            </>
          )}
        </div>
      </div>
      
      {/* Acquired banner on hover */}
      <div className="absolute bottom-0 left-0 right-0 p-2 bg-black/80 backdrop-blur text-[10px] text-center text-white/50 uppercase tracking-widest translate-y-full group-hover:translate-y-0 transition-transform duration-300 flex items-center justify-center gap-1">
        <CalendarDays size={10} />
        Acquired {format(new Date(player.acquired_at), "MMM d, yyyy")}
      </div>
    </motion.div>
  );
}

function Stat({ label, value }: { label: string, value: number }) {
  const isHigh = value >= 85;
  const isLow = value < 70;
  const colorClass = isHigh ? "text-primary" : isLow ? "text-white/50" : "text-white/80";
  
  return (
    <div className="flex flex-col items-center">
      <span className="text-xs text-white/40 uppercase font-bold tracking-widest mb-1">{label}</span>
      <span className={`text-xl font-black font-mono ${colorClass}`}>{value}</span>
    </div>
  );
}
