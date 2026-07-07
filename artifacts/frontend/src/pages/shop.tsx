import { useState } from "react";
import { useGetPacks, useBuyPack, Pack, PlayerCard } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { getGetBalanceQueryKey, getGetInventorySummaryQueryKey, getGetPlayersQueryKey } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { Coins, Package, Sparkles, X, Target, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import confetti from "canvas-confetti";

export default function Shop() {
  const { data: packs, isLoading } = useGetPacks();
  const buyPackMutation = useBuyPack();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [openingPack, setOpeningPack] = useState<boolean>(false);
  const [revealData, setRevealData] = useState<PlayerCard[] | null>(null);

  const handleBuy = (pack: Pack) => {
    if (openingPack) return;
    
    setOpeningPack(true);
    
    buyPackMutation.mutate({ data: { packType: pack.id } }, {
      onSuccess: (data) => {
        // Delay reveal slightly for dramatic effect
        setTimeout(() => {
          setOpeningPack(false);
          setRevealData(data.players);
          
          // Fire confetti
          confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#FFD700', '#FFAA00', '#FFFFFF']
          });
          
          // Invalidate resources
          queryClient.invalidateQueries({ queryKey: getGetBalanceQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetInventorySummaryQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetPlayersQueryKey() });
        }, 800);
      },
      onError: (error) => {
        setOpeningPack(false);
        toast({
          variant: "destructive",
          title: "Purchase Failed",
          description: (error.data as { error?: string })?.error || "Not enough coins or pack unavailable.",
        });
      }
    });
  };

  return (
    <div className="space-y-8">
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
            onClose={() => setRevealData(null)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function PackItem({ pack, onBuy, isBuying }: { pack: Pack, onBuy: () => void, isBuying: boolean }) {
  // Determine style based on pack cost (cheap vs premium)
  const isPremium = pack.cost >= 500;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative bg-card border rounded-2xl overflow-hidden flex flex-col items-center p-8 text-center transition-all duration-300 ${
        isPremium 
          ? "border-primary/50 shadow-[0_0_30px_rgba(255,170,0,0.1)] hover:border-primary hover:shadow-[0_0_40px_rgba(255,170,0,0.2)]" 
          : "border-border hover:border-muted-foreground"
      }`}
    >
      {isPremium && (
        <div className="absolute top-4 right-4 text-primary animate-pulse">
          <Sparkles size={20} />
        </div>
      )}
      
      <div className={`w-32 h-40 rounded-xl mb-6 flex items-center justify-center shadow-2xl relative overflow-hidden ${
        isPremium ? "bg-gradient-to-br from-primary to-primary-border" : "bg-gradient-to-br from-slate-700 to-slate-900"
      }`}>
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-30 mix-blend-overlay" />
        <Package size={48} className="text-white relative z-10" />
      </div>
      
      <h3 className="text-2xl font-bold uppercase tracking-tight mb-2">{pack.name}</h3>
      <p className="text-muted-foreground mb-6 min-h-[48px]">{pack.description}</p>
      
      <div className="mt-auto w-full space-y-4">
        <div className="flex justify-between items-center px-4 py-2 bg-background/50 rounded-lg">
          <span className="text-sm font-bold text-muted-foreground uppercase">Cards</span>
          <span className="font-mono font-bold text-lg">{pack.card_count}</span>
        </div>
        
        <Button 
          onClick={onBuy}
          disabled={isBuying}
          className={`w-full h-14 text-lg font-bold gap-2 ${
            isPremium ? "bg-primary text-primary-foreground hover:bg-primary/90" : "bg-white text-black hover:bg-gray-200"
          }`}
        >
          {isBuying ? (
            <motion.div 
              animate={{ rotate: 360 }} 
              transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
            >
              <Package size={20} />
            </motion.div>
          ) : (
            <>
              Buy for {pack.cost} <Coins size={20} />
            </>
          )}
        </Button>
      </div>
    </motion.div>
  );
}

function PackReveal({ players, onClose }: { players: PlayerCard[], onClose: () => void }) {
  return (
    <Dialog open={true} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-5xl h-[80vh] bg-transparent border-none shadow-none flex flex-col items-center justify-center p-0">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-4 text-white/50 hover:text-white transition-colors z-50 rounded-full bg-black/20 backdrop-blur"
        >
          <X size={24} />
        </button>
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="w-full text-center mb-12"
        >
          <h2 className="text-4xl md:text-6xl font-black text-white uppercase tracking-widest drop-shadow-[0_0_20px_rgba(255,170,0,0.8)]">
            Pack Opened
          </h2>
        </motion.div>

        <div className="flex flex-wrap justify-center gap-6 md:gap-10 perspective-1000">
          {players.map((player, idx) => (
            <RevealCard key={idx} player={player} index={idx} total={players.length} />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function RevealCard({ player, index, total }: { player: PlayerCard, index: number, total: number }) {
  const isGK = player.is_gk;
  const overall = isGK 
    ? Math.round(((player.fks || 0) + (player.pks || 0)) / 2)
    : Math.round(((player.fk || 0) + (player.pk || 0)) / 2);
    
  const isRare = overall >= 85;
  const borderClass = isRare ? "border-primary shadow-[0_0_30px_rgba(255,170,0,0.5)]" : "border-border shadow-2xl";
  const bgClass = isGK ? "bg-gradient-to-b from-[#0A1F16] to-[#050f0b]" : "bg-gradient-to-b from-[#1E1100] to-[#0f0800]";

  return (
    <motion.div
      initial={{ opacity: 0, y: 100, rotateY: 180, scale: 0.8 }}
      animate={{ opacity: 1, y: 0, rotateY: 0, scale: 1 }}
      transition={{ 
        delay: 0.5 + (index * 0.4), 
        duration: 0.8, 
        type: "spring",
        bounce: 0.4
      }}
      whileHover={{ scale: 1.05, translateY: -10 }}
      className={`w-64 h-96 relative rounded-2xl overflow-hidden border-2 ${borderClass} ${bgClass} transform-style-3d`}
    >
      {isRare && (
        <motion.div 
          animate={{ opacity: [0.3, 0.8, 0.3] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute inset-0 bg-gradient-to-tr from-transparent via-primary/20 to-transparent pointer-events-none" 
        />
      )}
      
      <div className="px-5 py-4 flex justify-between items-start relative z-10">
        <div className="flex flex-col items-center">
          <span className="text-4xl font-black font-mono tracking-tighter text-white drop-shadow-md">{overall}</span>
          <span className="text-sm font-bold uppercase tracking-wider text-white/70">{player.position}</span>
        </div>
        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isGK ? 'bg-secondary/20 text-secondary' : 'bg-primary/20 text-primary'}`}>
          {isGK ? <Shield size={20} /> : <Target size={20} />}
        </div>
      </div>
      
      <div className="h-[120px] flex items-center justify-center relative">
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent z-10" />
        <div className="w-28 h-28 rounded-full border-2 border-white/10 flex items-center justify-center bg-black/50 backdrop-blur z-0 shadow-xl overflow-hidden relative">
          <span className="text-5xl font-black opacity-20 uppercase text-white">
            {player.name.substring(0, 2)}
          </span>
        </div>
      </div>
      
      <div className="p-5 relative z-10 text-center bg-gradient-to-t from-black via-black/80 to-transparent absolute bottom-0 left-0 right-0 pt-10">
        <h3 className="text-2xl font-bold uppercase tracking-tight text-white mb-1 line-clamp-1">{player.name}</h3>
        <p className="text-sm font-medium text-primary mb-4 uppercase tracking-wider">{player.club}</p>
        
        <div className="grid grid-cols-2 gap-4">
          {isGK ? (
            <>
              <RevealStat label="FKS" value={player.fks || 0} />
              <RevealStat label="PKS" value={player.pks || 0} />
            </>
          ) : (
            <>
              <RevealStat label="FK" value={player.fk || 0} />
              <RevealStat label="PK" value={player.pk || 0} />
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function RevealStat({ label, value }: { label: string, value: number }) {
  const isHigh = value >= 85;
  const colorClass = isHigh ? "text-primary text-shadow-glow" : "text-white";
  
  return (
    <div className="flex flex-col items-center">
      <span className="text-xs text-white/60 uppercase font-bold tracking-widest">{label}</span>
      <span className={`text-2xl font-black font-mono ${colorClass}`}>{value}</span>
    </div>
  );
}
