import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useTheme } from "next-themes";
import { useLogout, useGetBalance, useDeleteAccount } from "@workspace/api-client-react";
import { clearToken } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import {
  Coins, LogOut, Package, Grid, LayoutDashboard,
  Users, ShoppingBag, Target, ChevronRight, Sun, Moon, Trash2,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

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
  const deleteAccount = useDeleteAccount();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const queryClient = useQueryClient();
  const [deleteOpen, setDeleteOpen] = useState(false);

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

  const handleDeleteAccount = () => {
    deleteAccount.mutate(undefined, {
      onSuccess: () => {
        clearToken();
        queryClient.clear();
        setLocation("/login");
        toast({ title: "Account deleted", description: "Your account has been permanently removed." });
      },
      onError: () => {
        toast({ variant: "destructive", title: "Failed to delete account", description: "Please try again." });
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
          {/* Logo + Theme toggle */}
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm">
                FK
              </div>
              <h1 className="text-xl font-bold tracking-tight">FREEKICK</h1>
            </div>
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            >
              {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            </button>
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

        {/* Bottom: balance + logout + delete account */}
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

          <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
            <AlertDialogTrigger asChild>
              <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors text-sm w-full">
                <Trash2 size={16} />
                <span>Delete Account</span>
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete your account?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete your account, all your cards, squad, and market listings.
                  Your username will become available again. This cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteAccount}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Yes, delete my account
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-4 md:p-8 overflow-auto">
        {children}
      </main>
    </div>
  );
}
