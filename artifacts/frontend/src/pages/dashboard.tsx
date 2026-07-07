import { Link } from "wouter";
import { useGetInventorySummary, useDailyClaim } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { getGetInventorySummaryQueryKey, getGetBalanceQueryKey } from "@workspace/api-client-react";
import { motion } from "framer-motion";
import { Coins, Layers, PackageOpen, Target, Shield, ArrowRight, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Dashboard() {
  const { data: summary, isLoading } = useGetInventorySummary();
  const claimMutation = useDailyClaim();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  const handleClaim = () => {
    claimMutation.mutate(undefined, {
      onSuccess: (data) => {
        toast({
          title: "Daily Reward Claimed!",
          description: `You received +${data.awarded} coins. New balance: ${data.coins}`,
        });
        queryClient.invalidateQueries({ queryKey: getGetInventorySummaryQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetBalanceQueryKey() });
      },
      onError: (error) => {
        toast({
          variant: "destructive",
          title: "Claim Failed",
          description: (error.data as { error?: string })?.error || "You might have already claimed today.",
        });
      }
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-48 bg-card rounded-lg animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-card rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const stats = [
    { label: "Total Coins", value: summary?.coins ?? 0, icon: Coins, color: "text-primary", bg: "bg-primary/10" },
    { label: "Cards Owned", value: summary?.total_cards ?? 0, icon: Layers, color: "text-blue-500", bg: "bg-blue-500/10" },
    { label: "Shooters", value: summary?.shooter_count ?? 0, icon: Target, color: "text-red-500", bg: "bg-red-500/10" },
    { label: "Goalkeepers", value: summary?.gk_count ?? 0, icon: Shield, color: "text-secondary", bg: "bg-secondary/10" },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight mb-2">Club Headquarters</h1>
          <p className="text-muted-foreground text-lg">Manage your squad and resources.</p>
        </div>
        
        <Button 
          onClick={handleClaim} 
          disabled={claimMutation.isPending}
          size="lg"
          className="bg-card hover:bg-card/80 border border-primary/30 text-primary hover:text-primary transition-all shadow-[0_0_20px_rgba(255,170,0,0.1)] hover:shadow-[0_0_30px_rgba(255,170,0,0.3)]"
        >
          <Gift className="w-5 h-5 mr-2" />
          Claim Daily Reward
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1, duration: 0.4 }}
            className="bg-card border border-border rounded-xl p-6 relative overflow-hidden group"
          >
            <div className={`absolute -right-4 -top-4 w-24 h-24 rounded-full ${stat.bg} blur-2xl group-hover:bg-opacity-20 transition-all`} />
            <div className="relative z-10 flex items-center justify-between">
              <div>
                <p className="text-muted-foreground font-medium mb-1">{stat.label}</p>
                <p className="text-4xl font-bold font-mono tracking-tight">{stat.value}</p>
              </div>
              <div className={`w-12 h-12 rounded-xl ${stat.bg} flex items-center justify-center ${stat.color}`}>
                <stat.icon size={24} />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 }}
          className="bg-gradient-to-br from-card to-card/50 border border-border rounded-2xl p-8 flex flex-col items-start relative overflow-hidden group"
        >
          <div className="absolute right-0 bottom-0 opacity-10 group-hover:opacity-20 transition-opacity translate-x-1/4 translate-y-1/4">
            <PackageOpen size={200} className="text-primary" />
          </div>
          <div className="w-12 h-12 rounded-xl bg-primary/20 text-primary flex items-center justify-center mb-6">
            <PackageOpen size={24} />
          </div>
          <h2 className="text-2xl font-bold mb-2">Hit the Shop</h2>
          <p className="text-muted-foreground mb-8 max-w-sm">
            Spend your hard-earned coins on packs. High risk, high reward.
          </p>
          <Button onClick={() => setLocation("/shop")} className="mt-auto font-bold gap-2">
            Buy Packs <ArrowRight size={16} />
          </Button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5 }}
          className="bg-gradient-to-br from-card to-card/50 border border-border rounded-2xl p-8 flex flex-col items-start relative overflow-hidden group"
        >
          <div className="absolute right-0 bottom-0 opacity-10 group-hover:opacity-20 transition-opacity translate-x-1/4 translate-y-1/4">
            <Layers size={200} className="text-blue-500" />
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-500/20 text-blue-500 flex items-center justify-center mb-6">
            <Layers size={24} />
          </div>
          <h2 className="text-2xl font-bold mb-2">View Collection</h2>
          <p className="text-muted-foreground mb-8 max-w-sm">
            Examine your players, check their stats, and plan your ultimate squad.
          </p>
          <Button variant="secondary" onClick={() => setLocation("/collection")} className="mt-auto font-bold gap-2">
            Browse Cards <ArrowRight size={16} />
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
