import { useState, useEffect, useCallback } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import PrefetchLink from "@/components/PrefetchLink";
import { AnimatePresence } from "framer-motion";
import PageTransition from "@/components/dashboard/PageTransition";
import PullToRefresh from "@/components/shared/PullToRefresh";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrency } from "@/contexts/CurrencyContext";
import {
  Home, ShoppingCart, Receipt, Wallet, Settings, LogOut, ArrowLeftRight, Sun, Moon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import BottomNav from "@/components/dashboard/BottomNav";
import NotificationDropdown from "@/components/dashboard/NotificationDropdown";

const NAV_LINKS = [
  { to: "/dashboard", key: "dashboard", icon: Home, label: "Dashboard" },
  { to: "/dashboard/place-order", key: "place-order", icon: ShoppingCart, label: "Place Order" },
  { to: "/dashboard/orders", key: "orders", icon: Receipt, label: "Orders" },
  { to: "/dashboard/wallet", key: "wallet", icon: Wallet, label: "Wallet" },
  { to: "/dashboard/settings", key: "settings", icon: Settings, label: "Settings" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [isAdmin, setIsAdmin] = useState(false);
  const { user, profile, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { theme, setTheme } = useTheme();
  const { formatAmount } = useCurrency();

  const handlePullRefresh = useCallback(async () => {
    await queryClient.invalidateQueries();
  }, [queryClient]);

  useEffect(() => {
    const handler = () => navigate("/dashboard/wallet");
    window.addEventListener("open-topup-dialog", handler);
    return () => window.removeEventListener("open-topup-dialog", handler);
  }, [navigate]);

  useEffect(() => {
    if (!user) return;
    supabase.rpc("has_role", { _user_id: user.id, _role: "admin" }).then(({ data }) => setIsAdmin(!!data));
  }, [user]);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const isActive = (path: string) => {
    if (path === "/dashboard") return location.pathname === "/dashboard";
    return location.pathname.startsWith(path);
  };

  const initial = (profile?.name || profile?.email || "K").charAt(0).toUpperCase();

  return (
    <>
      {/* ─── Ambient Background ─── */}
      <div className="app-bg" aria-hidden="true" />

      {/* ═══ TOPBAR ═══ */}
      <header className="sticky top-0 z-50 border-b border-border bg-card/90 backdrop-blur-lg">
        <div className="w-[min(1220px,calc(100%-1.6rem))] mx-auto min-h-[62px] flex items-center justify-between gap-4">
          {/* Brand */}
          <Link to="/dashboard" className="inline-flex items-center gap-3">
            <span
              className="w-[34px] h-[34px] rounded-[0.9rem] grid place-items-center text-[0.72rem] font-bold text-primary-foreground bg-primary"
              style={{ boxShadow: "0 8px 16px -10px hsl(var(--primary))" }}
            >
              KK
            </span>
            <span className="hidden sm:grid gap-0.5">
              <strong className="text-base font-bold tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
                KKTech Panel
              </strong>
              <span className="text-[0.72rem] text-muted-foreground">Reseller Dashboard</span>
            </span>
          </Link>

          {/* Right actions */}
          <div className="flex items-center gap-2.5">
            {/* Theme toggle */}
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="w-[34px] h-[34px] rounded-full border border-border bg-card text-muted-foreground grid place-items-center hover:text-foreground hover:border-primary/40 transition-all"
              style={{ boxShadow: "0 6px 14px -10px hsl(var(--foreground) / 0.45)" }}
            >
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Balance pill */}
            <span
              className="hidden sm:inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[0.77rem] font-bold border border-primary/20 bg-primary/10 text-primary"
              style={{ fontFamily: "var(--font-display)" }}
            >
              💰 {formatAmount(profile?.balance || 0)} MMK
            </span>

            <NotificationDropdown />

            {/* Avatar */}
            <span className="w-[34px] h-[34px] rounded-full grid place-items-center text-[0.8rem] font-bold text-accent-foreground bg-accent border border-border">
              {initial}
            </span>
          </div>
        </div>
      </header>

      {/* ═══ SHELL: SIDEBAR + CONTENT ═══ */}
      <div className="w-[min(1220px,calc(100%-1.6rem))] mx-auto grid gap-4 py-4 lg:grid-cols-[var(--sidebar-width)_minmax(0,1fr)]">

        {/* ── Desktop Sidebar ── */}
        <aside className="hidden lg:block self-start sticky top-[77px] cd-reveal">
          <div
            className="border border-border rounded-[1.2rem] bg-card/80 backdrop-blur-[10px] overflow-hidden"
            style={{ boxShadow: "0 20px 30px -24px hsl(var(--foreground) / 0.35)" }}
          >
            <div className="px-4 pt-4 pb-3 border-b border-border">
              <p className="text-[0.74rem] text-muted-foreground uppercase tracking-[0.12em] font-semibold">
                Main Navigation
              </p>
            </div>

            <nav className="grid gap-1 p-3">
              {NAV_LINKS.map((link) => {
                const active = isActive(link.to);
                const Icon = link.icon;
                return (
                  <PrefetchLink
                    key={link.key}
                    to={link.to}
                    className={cn(
                      "flex items-center gap-2.5 border border-transparent rounded-[0.8rem] px-3 py-2.5 text-[0.86rem] font-semibold transition-all duration-200",
                      active
                        ? "text-primary border-primary/25 bg-primary/10"
                        : "text-muted-foreground hover:border-input hover:text-foreground hover:bg-secondary"
                    )}
                  >
                    <Icon className="w-4 h-4" strokeWidth={1.5} />
                    {link.label}
                  </PrefetchLink>
                );
              })}

              {isAdmin && (
                <Link
                  to="/admin"
                  className={cn(
                    "flex items-center gap-2.5 border border-transparent rounded-[0.8rem] px-3 py-2.5 text-[0.86rem] font-semibold transition-all duration-200",
                    location.pathname.startsWith("/admin")
                      ? "text-primary border-primary/25 bg-primary/10"
                      : "text-muted-foreground hover:border-input hover:text-foreground hover:bg-secondary"
                  )}
                >
                  <ArrowLeftRight className="w-4 h-4" strokeWidth={1.5} />
                  Admin
                </Link>
              )}
            </nav>

            <div className="px-3 pb-3 pt-1 border-t border-border">
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 rounded-[calc(var(--radius)-4px)] border border-input bg-card px-3.5 py-2.5 text-[0.78rem] font-bold uppercase tracking-[0.08em] text-secondary-foreground hover:bg-secondary transition-all"
                style={{ fontFamily: "var(--font-display)" }}
              >
                <LogOut className="w-4 h-4" strokeWidth={1.5} />
                Sign Out
              </button>
            </div>
          </div>
        </aside>

        {/* ── Main Content ── */}
        <main className="min-w-0 pb-24 lg:pb-6" data-scroll-area>
          <PullToRefresh onRefresh={handlePullRefresh}>
            <AnimatePresence mode="wait">
              <PageTransition key={location.pathname}>
                {children}
              </PageTransition>
            </AnimatePresence>
          </PullToRefresh>
        </main>
      </div>

      {/* Bottom Nav (mobile only) */}
      <BottomNav />
    </>
  );
}
