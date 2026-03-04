import { useState, useEffect } from "react";
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
  Code,
  Settings,
  Wrench,
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
import kkLogo from "@/assets/kkremote-logo.png";

/* ── Sidebar nav items ── */
const navItems = [
  { label: "Home", icon: Home, path: "/dashboard" },
  { label: "Place Order", icon: ShoppingCart, path: "/dashboard/place-order" },
  { label: "Orders", icon: Receipt, path: "/dashboard/orders" },
  { label: "Services", icon: Wrench, path: "/dashboard/products" },
  { label: "Wallet", icon: Wallet, path: "/dashboard/wallet" },
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
    <div className="h-screen flex bg-background overflow-hidden">
      {/* Mobile overlay */}
      <div
        className={cn(
          "fixed inset-0 bg-background/60 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300",
          sidebarOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={() => setSidebarOpen(false)}
      />

      {/* ═══ SIDEBAR — Dark Glass Style ═══ */}
      <aside
        className={cn(
          "fixed lg:static inset-y-0 left-0 z-50 flex flex-col",
          "bg-sidebar/80 backdrop-blur-xl border-r border-sidebar-border/50",
          "transition-all duration-300 ease-out",
          collapsed ? "lg:w-[68px]" : "lg:w-[260px]",
          "w-[260px]",
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
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

            {/* User profile */}
            {!collapsed && (
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-secondary/30">
                <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-xs font-bold text-primary shrink-0 overflow-hidden">
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    profile?.name?.charAt(0)?.toUpperCase() || "R"
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-foreground truncate leading-tight">{profile?.name || "Reseller"}</p>
                  <p className="text-[11px] text-muted-foreground truncate leading-tight mt-0.5">{profile?.email}</p>
                </div>
              </div>
            )}

            {collapsed && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex justify-center py-2 cursor-default">
                    <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-xs font-bold text-primary shrink-0 overflow-hidden">
                      {profile?.avatar_url ? (
                        <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        profile?.name?.charAt(0)?.toUpperCase() || "R"
                      )}
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="right" className="text-xs">{profile?.name || "Reseller"}</TooltipContent>
              </Tooltip>
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
        {/* Top Navbar */}
        <header className="h-14 border-b border-border/50 flex items-center justify-between px-4 lg:px-8 sticky top-0 z-30 bg-card/80 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
            >
              <Menu className="w-5 h-5" strokeWidth={1.5} />
            </button>
            <div className="hidden lg:block">
              <h2 className="text-sm font-semibold text-foreground tracking-wide">
                {location.pathname.startsWith("/dashboard/wallet") ? "Wallet"
                  : navItems.find((i) => location.pathname.startsWith(i.path) && i.path !== "/dashboard")?.label
                  || (location.pathname === "/dashboard" ? "Dashboard" : "Dashboard")}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Language toggle */}
            <button
              onClick={toggleLang}
              className="flex items-center h-8 rounded-lg border border-border bg-secondary/60 text-[11px] font-bold uppercase tracking-wider overflow-hidden transition-all duration-200"
            >
              <span className={cn("px-2 py-1.5 transition-all duration-300", lang === "en" ? "bg-primary/15 text-primary" : "text-muted-foreground")}>
                EN
              </span>
              <span className={cn("px-2 py-1.5 transition-all duration-300", lang === "mm" ? "bg-primary/15 text-primary" : "text-muted-foreground")}>
                MM
              </span>
            </button>

            <CurrencyToggle />

            <ThemeToggle />

            <WalletChip profile={profile} />

            <NotificationDropdown />

            {/* User Avatar */}
            <button
              onClick={() => navigate("/dashboard/settings")}
              className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-xs font-bold text-primary overflow-hidden transition-all hover:border-primary/40"
            >
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                profile?.name?.charAt(0)?.toUpperCase() || "R"
              )}
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-8 overflow-y-auto" data-scroll-area>
          <AnimatePresence mode="wait">
            <PageTransition key={location.pathname}>
              {children}
            </PageTransition>
          </AnimatePresence>
        </main>

        <footer className="border-t border-border/30 px-4 lg:px-8 py-3 text-center">
          <Link to="/terms" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
            Terms & Conditions
          </Link>
        </footer>
      </div>

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
