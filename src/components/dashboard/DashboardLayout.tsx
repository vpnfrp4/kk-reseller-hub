import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation, useNavigate } from "react-router-dom";
import PrefetchLink from "@/components/PrefetchLink";
import { AnimatePresence } from "framer-motion";
import PageTransition from "@/components/dashboard/PageTransition";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

import {
  Home,
  ShoppingCart,
  Receipt,
  User,
  LogOut,
  Menu,
  ArrowLeftRight,
  Wallet,
  ChevronsLeft,
  ChevronsRight,
  Bell,
  Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import CurrencyToggle from "@/components/shared/CurrencyToggle";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useLang } from "@/contexts/LangContext";
import { cn } from "@/lib/utils";
import ThemeToggle from "@/components/ThemeToggle";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import NotificationDropdown from "@/components/dashboard/NotificationDropdown";
import FloatingSupport from "@/components/shared/FloatingSupport";
import BottomNav from "@/components/dashboard/BottomNav";
import kkLogo from "@/assets/kkremote-logo.png";

/* ── Sidebar nav items ── */
const baseNavItems = [
  { label: "Dashboard", icon: Home, path: "/dashboard" },
  { label: "Place Order", icon: ShoppingCart, path: "/dashboard/place-order" },
  { label: "Orders", icon: Receipt, path: "/dashboard/orders" },
  { label: "Account", icon: User, path: "/dashboard/settings" },
];

const SIDEBAR_COLLAPSED_KEY = "sidebar-collapsed";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "true");
  const [isAdmin, setIsAdmin] = useState(false);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(!prev));
      return !prev;
    });
  };
  const { user, profile, logout } = useAuth();
  const { lang, toggle: toggleLang } = useLang();
  const location = useLocation();
  const navigate = useNavigate();

  // Build nav items — Wallet only shows if user has balance
  const navItems = useMemo(() => {
    const items = [...baseNavItems];
    const balance = profile?.balance || 0;
    if (balance > 0) {
      // Insert Wallet before Account
      const accountIdx = items.findIndex(i => i.path === "/dashboard/settings");
      items.splice(accountIdx, 0, { label: "Wallet", icon: Wallet, path: "/dashboard/wallet" });
    }
    return items;
  }, [profile?.balance]);

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

  return (
    <div className="min-h-[100dvh] flex flex-col lg:h-screen lg:flex-row bg-background lg:overflow-hidden">
      {/* Mobile overlay — only used for sidebar sheet on large screens; bottom nav replaces sidebar on mobile */}
      <div
        className={cn(
          "fixed inset-0 bg-background/60 backdrop-blur-sm z-40 hidden transition-opacity duration-300",
          sidebarOpen ? "lg:block opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={() => setSidebarOpen(false)}
      />

      {/* ═══ SIDEBAR — Desktop only ═══ */}
      <aside
        className={cn(
          "hidden lg:static lg:flex inset-y-0 left-0 z-50 flex-col",
          "bg-sidebar/80 backdrop-blur-xl border-r border-sidebar-border/50",
          "transition-all duration-300 ease-out",
          collapsed ? "lg:w-[68px]" : "lg:w-[260px]",
        )}
      >
        <TooltipProvider delayDuration={0}>
          {/* Logo */}
          <div className="px-4 py-5 border-b border-sidebar-border/50 flex items-center justify-between">
            <Link to="/dashboard" className="flex items-center gap-3 group min-w-0" onClick={() => setSidebarOpen(false)}>
              <img
                src={kkLogo}
                alt="KKTech"
                className="w-9 h-9 rounded-xl object-contain shrink-0 transition-transform duration-200 group-hover:scale-105"
              />
              {!collapsed && (
                <div className="overflow-hidden">
                  <span className="text-[15px] font-bold text-foreground tracking-tight">
                    KK<span className="text-primary">Tech</span>
                  </span>
                  <span className="text-[10px] block text-primary/60 font-bold uppercase tracking-[0.15em]">
                    Reseller Hub
                  </span>
                </div>
              )}
            </Link>
            <button
              onClick={toggleCollapsed}
              className="hidden lg:flex items-center justify-center w-7 h-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors shrink-0"
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {collapsed ? <ChevronsRight className="w-4 h-4" /> : <ChevronsLeft className="w-4 h-4" />}
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 pt-5 pb-2 flex flex-col gap-1">
            {navItems.map((item) => {
              const active = location.pathname === item.path ||
                (item.path === "/dashboard" && location.pathname === "/dashboard") ||
                (item.path !== "/dashboard" && location.pathname.startsWith(item.path));

              const linkEl = (
                <PrefetchLink
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    "group relative flex items-center gap-3 h-[44px] rounded-xl text-[13px] tracking-wide",
                    "transition-all duration-200",
                    collapsed ? "justify-center px-0" : "pl-4 pr-3",
                    active
                      ? "bg-primary/15 text-foreground font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/40 hover:shadow-[0_0_12px_rgba(59,130,246,0.06)]"
                  )}
                >
                  {active && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-primary shadow-[0_0_8px_hsl(var(--primary)/0.5)]" />
                  )}
                  <item.icon
                    className={cn(
                      "w-[18px] h-[18px] shrink-0 transition-colors duration-200",
                      active ? "text-primary" : "group-hover:text-foreground"
                    )}
                    strokeWidth={1.5}
                  />
                  {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
                </PrefetchLink>
              );

              return collapsed ? (
                <Tooltip key={item.path}>
                  <TooltipTrigger asChild>{linkEl}</TooltipTrigger>
                  <TooltipContent side="right" className="text-xs">{item.label}</TooltipContent>
                </Tooltip>
              ) : (
                <span key={item.path}>{linkEl}</span>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="mt-auto border-t border-sidebar-border/50 px-3 pt-3 pb-4 space-y-1">
            {isAdmin && (
              collapsed ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link
                      to="/admin"
                      onClick={() => setSidebarOpen(false)}
                      className="flex items-center justify-center gap-3 h-[44px] rounded-xl text-[13px] text-muted-foreground hover:text-foreground hover:bg-secondary/40 transition-all duration-200 px-0"
                    >
                      <ArrowLeftRight className="w-[18px] h-[18px] shrink-0" strokeWidth={1.5} />
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="text-xs">Admin Panel</TooltipContent>
                </Tooltip>
              ) : (
                <Link
                  to="/admin"
                  onClick={() => setSidebarOpen(false)}
                  className="flex items-center gap-3 h-[44px] rounded-xl text-[13px] text-muted-foreground hover:text-foreground hover:bg-secondary/40 transition-all duration-200 pl-4 pr-3"
                >
                  <ArrowLeftRight className="w-[18px] h-[18px] shrink-0" strokeWidth={1.5} />
                  <span>Admin Panel</span>
                </Link>
              )
            )}

            {collapsed ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    className="w-full text-muted-foreground hover:text-destructive hover:bg-destructive/5 h-[44px] text-[13px] rounded-xl transition-all duration-200 justify-center px-0"
                    onClick={handleLogout}
                  >
                    <LogOut className="w-[18px] h-[18px] shrink-0 text-destructive/60" strokeWidth={1.5} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right" className="text-xs">Sign Out</TooltipContent>
              </Tooltip>
            ) : (
              <Button
                variant="ghost"
                className="w-full text-muted-foreground hover:text-destructive hover:bg-destructive/5 h-[44px] text-[13px] rounded-xl transition-all duration-200 justify-start pl-4"
                onClick={handleLogout}
              >
                <LogOut className="w-[18px] h-[18px] shrink-0 text-destructive/60 mr-3" strokeWidth={1.5} />
                <span>Sign Out</span>
              </Button>
            )}
          </div>
        </TooltipProvider>
      </aside>

      {/* ═══ MAIN AREA ═══ */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        {/* Top Navbar — ALWAYS visible, fixed on mobile, sticky on desktop */}
        <header className="h-14 border-b border-border/50 flex items-center justify-between px-3 sm:px-4 lg:px-8 fixed top-0 left-0 right-0 lg:sticky lg:relative z-30 bg-card/90 backdrop-blur-xl">
          <div className="flex items-center gap-2 sm:gap-3">
            <Link to="/dashboard" className="lg:hidden flex items-center gap-2">
              <img src={kkLogo} alt="KKTech" className="w-7 h-7 rounded-lg object-contain" />
              <span className="text-sm font-bold text-foreground">KK<span className="text-primary">Tech</span></span>
            </Link>
            <div className="hidden lg:block">
              <h2 className="text-sm font-semibold text-foreground tracking-wide">
                {location.pathname.startsWith("/dashboard/wallet") ? "Wallet"
                  : navItems.find((i) => location.pathname.startsWith(i.path) && i.path !== "/dashboard")?.label
                  || (location.pathname === "/dashboard" ? "Dashboard" : "Dashboard")}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 lg:gap-3">
            {/* Language toggle — hide on very small screens */}
            <button
              onClick={toggleLang}
              className="hidden sm:flex items-center h-8 rounded-lg border border-border bg-secondary/60 text-[11px] font-bold uppercase tracking-wider overflow-hidden transition-all duration-200"
            >
              <span className={cn("px-2 py-1.5 transition-all duration-300", lang === "en" ? "bg-primary/15 text-primary" : "text-muted-foreground")}>
                EN
              </span>
              <span className={cn("px-2 py-1.5 transition-all duration-300", lang === "mm" ? "bg-primary/15 text-primary" : "text-muted-foreground")}>
                MM
              </span>
            </button>

            <CurrencyToggle />

            <div className="hidden sm:block">
              <ThemeToggle />
            </div>

            <WalletChip profile={profile} />

            <NotificationDropdown />

            {/* User Avatar */}
            <button
              onClick={() => navigate("/dashboard/settings")}
              className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-xs font-bold text-primary overflow-hidden transition-all hover:border-primary/40 shrink-0"
            >
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                profile?.name?.charAt(0)?.toUpperCase() || "R"
              )}
            </button>
          </div>
        </header>

        {/* Spacer for fixed header on mobile */}
        <div className="h-14 shrink-0 lg:hidden" />

        <main
          className="flex-1 p-3 sm:p-4 lg:p-8 pb-24 lg:pb-8 lg:overflow-y-auto"
          data-scroll-area
          style={{ paddingBottom: 'max(6rem, calc(5rem + env(safe-area-inset-bottom, 0px)))' }}
        >
          <AnimatePresence mode="wait">
            <PageTransition key={location.pathname}>
              {children}
            </PageTransition>
          </AnimatePresence>
        </main>

        <footer className="hidden lg:block border-t border-border/30 px-4 lg:px-8 py-3 text-center">
          <Link to="/terms" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
            Terms & Conditions
          </Link>
        </footer>
      </div>

      <BottomNav />
      <FloatingSupport />
    </div>
  );
}

function WalletChip({ profile }: { profile: any }) {
  const { currency, convert } = useCurrency();
  const balance = profile?.balance || 0;
  const displayBalance = convert(balance);

  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl bg-secondary/60 border border-border/50 hover:border-primary/20 transition-all">
      <Wallet className="w-4 h-4 text-primary/70" />
      <span className="text-sm font-bold font-mono text-foreground tabular-nums">
        {currency === "USD"
          ? displayBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
          : displayBalance.toLocaleString()
        }
      </span>
      <span className="text-[10px] text-muted-foreground font-semibold hidden sm:inline">{currency}</span>
      <button
        onClick={() => window.dispatchEvent(new CustomEvent("open-topup-dialog"))}
        className="ml-0.5 w-6 h-6 rounded-md bg-primary/10 hover:bg-primary/20 flex items-center justify-center transition-colors"
        title="Quick Top-up"
      >
        <span className="text-primary text-sm font-bold leading-none">+</span>
      </button>
    </div>
  );
}
