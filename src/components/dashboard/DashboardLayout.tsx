import { useState, useEffect, useMemo } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import PrefetchLink from "@/components/PrefetchLink";
import { AnimatePresence, motion } from "framer-motion";
import PageTransition from "@/components/dashboard/PageTransition";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

import {
  Home,
  ShoppingCart,
  Receipt,
  User,
  LogOut,
  ArrowLeftRight,
  Wallet,
  ChevronsLeft,
  ChevronsRight,
  Menu,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCurrency } from "@/contexts/CurrencyContext";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

import FloatingSupport from "@/components/shared/FloatingSupport";
import BottomNav from "@/components/dashboard/BottomNav";
import kkLogo from "@/assets/kkremote-logo.png";

/* ── Sidebar nav groups ── */
interface NavItem {
  label: string;
  icon: React.ElementType;
  path: string;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    title: "MAIN",
    items: [
      { label: "Dashboard", icon: Home, path: "/dashboard" },
      { label: "Place Order", icon: ShoppingCart, path: "/dashboard/place-order" },
    ],
  },
  {
    title: "ORDERS",
    items: [
      { label: "Orders", icon: Receipt, path: "/dashboard/orders" },
    ],
  },
  {
    title: "FINANCE",
    items: [
      { label: "Wallet", icon: Wallet, path: "/dashboard/wallet" },
    ],
  },
  {
    title: "ACCOUNT",
    items: [
      { label: "Profile", icon: User, path: "/dashboard/settings" },
    ],
  },
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
  const location = useLocation();
  const navigate = useNavigate();

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
    if (path.includes("?tab=")) {
      const [basePath, query] = path.split("?");
      const tab = new URLSearchParams(query).get("tab");
      return location.pathname === basePath && new URLSearchParams(location.search).get("tab") === tab;
    }
    if (path === "/dashboard") return location.pathname === "/dashboard";
    return location.pathname.startsWith(path);
  };

  // Flatten all items for the header title
  const allItems = navGroups.flatMap((g) => g.items);

  return (
    <div className="min-h-[100dvh] flex flex-col lg:h-screen lg:flex-row bg-background lg:overflow-hidden">
      {/* Mobile overlay */}
      <div
        className={cn(
          "fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300",
          sidebarOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={() => setSidebarOpen(false)}
      />

      {/* ═══ SIDEBAR ═══ */}
      <aside
        className={cn(
          "fixed lg:static inset-y-0 left-0 z-50 flex flex-col",
          "bg-sidebar/80 backdrop-blur-xl border-r border-sidebar-border/50",
          "transition-all duration-300 ease-out",
          collapsed ? "lg:w-[72px]" : "lg:w-[260px]",
          "w-[280px]",
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <TooltipProvider delayDuration={0}>
          {/* Logo header */}
          <div className="h-14 px-4 border-b border-sidebar-border/50 flex items-center justify-between shrink-0">
            <Link to="/dashboard" className="flex items-center gap-3 group min-w-0" onClick={() => setSidebarOpen(false)}>
              <img
                src={kkLogo}
                alt="KKTech"
                className="w-8 h-8 rounded-xl object-contain shrink-0 transition-transform duration-200 group-hover:scale-105"
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

            {/* Close button on mobile, collapse toggle on desktop */}
            <button
              onClick={() => {
                if (window.innerWidth < 1024) setSidebarOpen(false);
                else toggleCollapsed();
              }}
              className="flex items-center justify-center w-7 h-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors shrink-0"
            >
              {sidebarOpen && window.innerWidth < 1024 ? (
                <X className="w-4 h-4" />
              ) : collapsed ? (
                <ChevronsRight className="w-4 h-4" />
              ) : (
                <ChevronsLeft className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* Navigation groups */}
          <nav className="flex-1 overflow-y-auto px-3 pt-3 pb-2 sidebar-scroll">
            {navGroups.map((group, gi) => (
              <div key={group.title} className={cn(gi > 0 && "mt-4")}>
                {/* Section label */}
                {!collapsed && (
                  <div className="px-3 mb-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground/60">
                      {group.title}
                    </span>
                  </div>
                )}
                {collapsed && gi > 0 && (
                  <div className="mx-3 mb-2 border-t border-sidebar-border/40" />
                )}

                <div className="flex flex-col gap-0.5">
                  {group.items.map((item) => {
                    const active = isActive(item.path);

                    const linkEl = (
                      <PrefetchLink
                        key={item.path}
                        to={item.path}
                        onClick={() => setSidebarOpen(false)}
                        className={cn(
                          "group relative flex items-center gap-3 h-10 rounded-lg text-[13px] tracking-wide",
                          "transition-all duration-200",
                          collapsed ? "justify-center px-0" : "pl-3 pr-3",
                          active
                            ? "bg-primary/12 text-foreground font-semibold"
                            : "text-muted-foreground hover:text-foreground hover:bg-secondary/40"
                        )}
                      >
                        {active && (
                          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-primary shadow-[0_0_8px_hsl(var(--primary)/0.4)]" />
                        )}
                        <div
                          className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all duration-200",
                            active
                              ? "bg-primary/15 text-primary"
                              : "text-muted-foreground group-hover:text-foreground group-hover:bg-secondary/60"
                          )}
                        >
                          <item.icon className="w-[16px] h-[16px]" strokeWidth={1.8} />
                        </div>
                        {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
                      </PrefetchLink>
                    );

                    return collapsed ? (
                      <Tooltip key={item.path}>
                        <TooltipTrigger asChild>{linkEl}</TooltipTrigger>
                        <TooltipContent side="right" sideOffset={8} className="text-xs font-medium">
                          {item.label}
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      <span key={item.path}>{linkEl}</span>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Admin group */}
            {isAdmin && (
              <div className="mt-4">
                {!collapsed && (
                  <div className="px-3 mb-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground/60">
                      ADMIN
                    </span>
                  </div>
                )}
                {collapsed && <div className="mx-3 mb-2 border-t border-sidebar-border/40" />}
                {(() => {
                  const linkEl = (
                    <Link
                      to="/admin"
                      onClick={() => setSidebarOpen(false)}
                      className={cn(
                        "group relative flex items-center gap-3 h-10 rounded-lg text-[13px] tracking-wide transition-all duration-200",
                        collapsed ? "justify-center px-0" : "pl-3 pr-3",
                        "text-muted-foreground hover:text-foreground hover:bg-secondary/40"
                      )}
                    >
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-muted-foreground group-hover:text-foreground group-hover:bg-secondary/60 transition-all duration-200">
                        <ArrowLeftRight className="w-[16px] h-[16px]" strokeWidth={1.8} />
                      </div>
                      {!collapsed && <span className="flex-1 truncate">Admin Panel</span>}
                    </Link>
                  );

                  return collapsed ? (
                    <Tooltip>
                      <TooltipTrigger asChild>{linkEl}</TooltipTrigger>
                      <TooltipContent side="right" sideOffset={8} className="text-xs font-medium">Admin Panel</TooltipContent>
                    </Tooltip>
                  ) : linkEl;
                })()}
              </div>
            )}
          </nav>

          {/* User profile footer */}
          <div className="mt-auto border-t border-sidebar-border/50 px-3 py-3 shrink-0">
            {!collapsed ? (
              <div className="flex items-center gap-3 px-2">
                <button
                  onClick={() => { navigate("/dashboard/settings"); setSidebarOpen(false); }}
                  className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-xs font-bold text-primary overflow-hidden transition-all hover:border-primary/40 shrink-0"
                >
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    profile?.name?.charAt(0)?.toUpperCase() || "R"
                  )}
                </button>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-foreground truncate">
                    {profile?.name || "Reseller"}
                  </p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                    {profile?.tier || "Reseller"}
                  </p>
                </div>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-8 h-8 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all shrink-0"
                      onClick={handleLogout}
                    >
                      <LogOut className="w-4 h-4" strokeWidth={1.8} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="text-xs">Sign Out</TooltipContent>
                </Tooltip>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => { navigate("/dashboard/settings"); setSidebarOpen(false); }}
                      className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-xs font-bold text-primary overflow-hidden transition-all hover:border-primary/40"
                    >
                      {profile?.avatar_url ? (
                        <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        profile?.name?.charAt(0)?.toUpperCase() || "R"
                      )}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="text-xs">{profile?.name || "Profile"}</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-8 h-8 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
                      onClick={handleLogout}
                    >
                      <LogOut className="w-4 h-4" strokeWidth={1.8} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="text-xs">Sign Out</TooltipContent>
                </Tooltip>
              </div>
            )}
          </div>
        </TooltipProvider>
      </aside>

      {/* ═══ MAIN AREA ═══ */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        {/* Top Navbar */}
        <header className="h-14 border-b border-border/50 flex items-center justify-between px-3 sm:px-4 lg:px-8 fixed top-0 left-0 right-0 lg:sticky lg:relative z-30 bg-card/90 backdrop-blur-xl">
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Hamburger for mobile */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
            >
              <Menu className="w-5 h-5" strokeWidth={1.5} />
            </button>
            <Link to="/dashboard" className="lg:hidden flex items-center gap-2">
              <img src={kkLogo} alt="KKTech" className="w-7 h-7 rounded-lg object-contain" />
              <span className="text-sm font-bold text-foreground">KK<span className="text-primary">Tech</span></span>
            </Link>
            <div className="hidden lg:block">
              <h2 className="text-sm font-semibold text-foreground tracking-wide">
                {location.pathname.startsWith("/dashboard/wallet") ? "Wallet"
                  : allItems.find((i) => !i.path.includes("?") && location.pathname.startsWith(i.path) && i.path !== "/dashboard")?.label
                  || (location.pathname === "/dashboard" ? "Dashboard" : "Dashboard")}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 lg:gap-3">
            <WalletChip profile={profile} />
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