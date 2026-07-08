import { Link } from "wouter";
import { useGetInventorySummary, useDailyClaim } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { getGetInventorySummaryQueryKey, getGetBalanceQueryKey } from "@workspace/api-client-react";
import { motion } from "framer-motion";
import {
  Coins, Layers, PackageOpen, Target, Shield, ArrowRight,
  Gift, Users, ShoppingBag,
} from "lucide-react";
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
      },
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
    { label: "Coins",       value: (summary?.coins ?? 0).toLocaleString(), icon: Coins,  color: "text-yellow-400",  bg: "bg-yellow-500/10" },
    { label: "Total Cards", value: summary?.total_cards ?? 0,               icon: Layers, color: "text-blue-400",   bg: "bg-blue-500/10"   },
    { label: "Shooters",    value: summary?.shooters ?? 0,                  icon: Target, color: "text-green-400",  bg: "bg-green-500/10"  },
    { label: "Goalkeepers", value: summary?.goalkeepers ?? 0,               icon: Shield, color: "text-purple-400", bg: "bg-purple-500/10" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold tracking-tight mb-2">Dashboard</h1>
        <p className="text-muted-foreground text-lg">Welcome back, manager.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className={`p-5 rounded-2xl border border-border bg-card flex flex-col gap-3`}
          >
            <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center`}>
              <stat.icon size={20} className={stat.color} />
            </div>
            <div>
              <div className={`text-2xl font-black ${stat.color}`}>{stat.value}</div>
              <div className="text-sm text-muted-foreground">{stat.label}</div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Daily claim — hidden once claimed */}
      {!summary?.daily_claimed && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="flex items-center justify-between p-5 rounded-2xl border border-yellow-500/30 bg-yellow-500/5"
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-yellow-500/20 flex items-center justify-center">
              <Gift size={20} className="text-yellow-400" />
            </div>
            <div>
              <div className="font-bold">Daily Reward</div>
              <div className="text-sm text-muted-foreground">Claim +200 coins once per day</div>
            </div>
          </div>
          <Button
            onClick={handleClaim}
            disabled={claimMutation.isPending}
            className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold"
          >
            {claimMutation.isPending ? "Claiming…" : "Claim 🪙"}
          </Button>
        </motion.div>
      )}

      {/* Quick nav cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {[
          {
            title:   "My Squad",
            desc:    "Build and manage your 4-3-3 starting eleven. Track Team OVR.",
            icon:    Users,
            color:   "text-emerald-400",
            bg:      "bg-emerald-500/10",
            href:    "/squad",
            cta:     "Manage Squad",
          },
          {
            title:   "Daily Objective",
            desc:    "Today's formation challenge. Build a squad, earn rewards.",
            icon:    Target,
            color:   "text-orange-400",
            bg:      "bg-orange-500/10",
            href:    "/daily-objective",
            cta:     "View Objective",
          },
          {
            title:   "Transfer Market",
            desc:    "Buy and sell players globally. Real-time bidding with coin escrow.",
            icon:    ShoppingBag,
            color:   "text-cyan-400",
            bg:      "bg-cyan-500/10",
            href:    "/market",
            cta:     "Open Market",
          },
          {
            title:   "Pack Shop",
            desc:    "Spend coins on packs. Pull Gold Cards. High risk, high reward.",
            icon:    PackageOpen,
            color:   "text-yellow-400",
            bg:      "bg-yellow-500/10",
            href:    "/shop",
            cta:     "Buy Packs",
          },
          {
            title:   "Collection",
            desc:    "Browse all your player cards. Quick-sell duplicates for coins.",
            icon:    Layers,
            color:   "text-blue-400",
            bg:      "bg-blue-500/10",
            href:    "/collection",
            cta:     "View Cards",
          },
        ].map((card, i) => (
          <motion.div
            key={card.href}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 + i * 0.07 }}
            className="bg-card border border-border rounded-2xl p-6 flex flex-col relative overflow-hidden group"
          >
            <div className={`absolute right-0 bottom-0 translate-x-1/4 translate-y-1/4 opacity-5 group-hover:opacity-10 transition-opacity`}>
              <card.icon size={140} />
            </div>
            <div className={`w-11 h-11 rounded-xl ${card.bg} flex items-center justify-center mb-4`}>
              <card.icon size={22} className={card.color} />
            </div>
            <h2 className="text-xl font-bold mb-1">{card.title}</h2>
            <p className="text-muted-foreground text-sm mb-5 flex-1">{card.desc}</p>
            <Button
              variant={i === 0 ? "default" : "secondary"}
              onClick={() => setLocation(card.href)}
              className="mt-auto font-bold gap-2 w-fit"
            >
              {card.cta} <ArrowRight size={14} />
            </Button>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
