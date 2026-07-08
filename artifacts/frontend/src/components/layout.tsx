import { Link, useLocation } from "wouter";
import { useLogout, useGetBalance } from "@workspace/api-client-react";
import { clearToken } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import {
  Coins, LogOut, Package, Grid, LayoutDashboard,
  Users, ShoppingBag, Target, ChevronRight,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/dashboard",       label: "Dashboard",       icon: LayoutDashboard },
  { href: "/squad",           label: "My Squad",        icon: Users },
  { href: "/daily-objective", label: "Daily Objective", icon: Target },
  { href: "/shop",            label: "Pack Shop",       icon: Package },
  { href: "/collection",      label: "Collection",      icon: Grid },
  { href: "/market",          label: "Transfer Market", icon: ShoppingBag },
] as const;

export function Layout({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const logout = useLogout();
  const { toast } = useToast();

  // `UseQueryOptions` in TanStack v5 requires queryKey; cast to bypass codegen mismatch
  const { data: balance } = useGetBalance({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    query: { enabled: location !== "/login" } as any,
  });

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
      },
    });
  };

  if (location === "/login") {
    return (
      <main className="min-h-[100dvh] w-full bg-background flex">
        {children}
      </main>
    );
  }

  return (
    <div className="min-h-[100dvh] w-full bg-background text-foreground flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 border-r border-border bg-card/50 backdrop-blur flex flex-col justify-between p-4 md:sticky md:top-0 md:h-[100dvh]">
        <div className="space-y-6">
          {/* Logo */}
          <div className="flex items-center gap-2 px-2">
            <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm">
              FK
            </div>
            <h1 className="text-xl font-bold tracking-tight">FREEKICK</h1>
          </div>

          {/* Nav */}
          <nav className="flex md:flex-col gap-1 overflow-x-auto md:overflow-visible pb-2 md:pb-0">
            {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
              const active = location === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors whitespace-nowrap ${
                    active
                      ? "bg-primary text-primary-foreground font-semibold"
                      : "hover:bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon size={18} />
                  <span className="text-sm">{label}</span>
                  {active && <ChevronRight size={14} className="ml-auto opacity-60 hidden md:block" />}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom: balance + logout */}
        <div className="hidden md:flex flex-col gap-3">
          <div className="px-4 py-3 rounded-xl bg-card border border-border flex items-center justify-between">
            <span className="text-muted-foreground text-sm">Balance</span>
            <div className="flex items-center gap-1.5 text-primary font-mono font-bold">
              <Coins size={14} />
              <span>{(balance?.coins ?? 0).toLocaleString()}</span>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors text-sm w-full"
          >
            <LogOut size={16} />
            <span>Log out</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-4 md:p-8 overflow-auto">
        {children}
      </main>
    </div>
  );
}
