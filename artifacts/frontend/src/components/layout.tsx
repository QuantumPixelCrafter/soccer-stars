import { Link, useLocation } from "wouter";
import { useLogout, useGetBalance } from "@workspace/api-client-react";
import { clearToken } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Coins, LogOut, Package, Grid, LayoutDashboard } from "lucide-react";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const logout = useLogout();
  const { toast } = useToast();
  
  // We can fetch balance globally to display in the nav
  const { data: balance } = useGetBalance({ query: { enabled: location !== "/login", queryKey: ["getBalance"] } });

  const handleLogout = () => {
    logout.mutate(undefined, {
      onSuccess: () => {
        clearToken();
        setLocation("/login");
        toast({ title: "Logged out successfully" });
      },
      onError: () => {
        clearToken();
        setLocation("/login");
      }
    });
  };

  if (location === "/login") {
    return <main className="min-h-[100dvh] w-full bg-background flex">{children}</main>;
  }

  return (
    <div className="min-h-[100dvh] w-full bg-background text-foreground flex flex-col md:flex-row">
      <aside className="w-full md:w-64 border-r border-border bg-card/50 backdrop-blur flex flex-col justify-between p-4 md:sticky md:top-0 md:h-[100dvh]">
        <div className="space-y-8">
          <div className="flex items-center gap-2 px-2">
            <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold">
              FC
            </div>
            <h1 className="text-xl font-bold tracking-tight">FOOTBALL GACHA</h1>
          </div>
          
          <nav className="flex md:flex-col gap-2 overflow-x-auto md:overflow-visible pb-2 md:pb-0">
            <Link 
              href="/dashboard" 
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${location === "/dashboard" ? "bg-primary text-primary-foreground font-medium" : "hover:bg-muted text-muted-foreground hover:text-foreground"}`}
            >
              <LayoutDashboard size={20} />
              <span>Dashboard</span>
            </Link>
            
            <Link 
              href="/shop" 
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${location === "/shop" ? "bg-primary text-primary-foreground font-medium" : "hover:bg-muted text-muted-foreground hover:text-foreground"}`}
            >
              <Package size={20} />
              <span>Shop</span>
            </Link>
            
            <Link 
              href="/collection" 
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${location === "/collection" ? "bg-primary text-primary-foreground font-medium" : "hover:bg-muted text-muted-foreground hover:text-foreground"}`}
            >
              <Grid size={20} />
              <span>Collection</span>
            </Link>
          </nav>
        </div>
        
        <div className="hidden md:block space-y-4">
          <div className="px-4 py-3 rounded-lg bg-card border border-border flex items-center justify-between">
            <span className="text-muted-foreground text-sm">Balance</span>
            <div className="flex items-center gap-1.5 text-primary font-mono font-bold">
              <Coins size={16} />
              <span>{balance?.coins ?? 0}</span>
            </div>
          </div>
          
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
          >
            <LogOut size={20} />
            <span>Logout</span>
          </button>
        </div>
      </aside>
      
      <main className="flex-1 overflow-y-auto bg-background/50 relative">
        <div className="md:hidden flex items-center justify-between p-4 border-b border-border bg-card/50 backdrop-blur sticky top-0 z-10">
          <div className="flex items-center gap-1.5 text-primary font-mono font-bold bg-primary/10 px-3 py-1.5 rounded-full border border-primary/20">
            <Coins size={16} />
            <span>{balance?.coins ?? 0}</span>
          </div>
          <button 
            onClick={handleLogout}
            className="text-muted-foreground hover:text-destructive p-2"
          >
            <LogOut size={20} />
          </button>
        </div>
        <div className="p-4 md:p-8 max-w-6xl mx-auto pb-24 md:pb-8">
          {children}
        </div>
      </main>
    </div>
  );
}
