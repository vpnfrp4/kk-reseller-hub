import { useState, useEffect, useMemo, useCallback } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import PrefetchLink from "@/components/PrefetchLink";
import { AnimatePresence } from "framer-motion";
import PageTransition from "@/components/dashboard/PageTransition";
import PullToRefresh from "@/components/shared/PullToRefresh";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
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
  X,
  Settings,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCurrency } from "@/contexts/CurrencyContext";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import FloatingSupport from "@/components/shared/FloatingSupport";
import BottomNav from "@/components/dashboard/BottomNav";
import kkLogo from "@/assets/kkremote-logo.png";
import { Money } from "@/components/shared";

/* ── Sidebar nav — simplified, no duplicates ── */
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
];

const SIDEBAR_COLLAPSED_KEY = "sidebar-collapsed";

/* ── Wallet Chip ── */
function WalletChip({ profile }: { profile: any }) {
  const navigate = useNavigate();
  const { convert } = useCurrency();
  return (
    <button
      onClick={() => navigate("/dashboard/wallet")}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/8 border border-primary/15 text-sm font-bold font-mono tabular-nums text-primary hover:bg-primary/12 transition-colors"
    >
      <Wallet className="w-3.5 h-3.5" />
      <Money amount={convert(profile?.balance || 0)} raw className="text-sm" />
    </button>
  );
}

/* ── User Avatar Dropdown ── */
function UserAvatarDropdown({ profile, isAdmin, onLogout }: { profile: any; isAdmin: boolean; onLogout: () => void }) {
  const navigate = useNavigate();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-1.5 p-0.5 rounded-xl hover:bg-secondary/60 transition-colors">
          <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-xs font-bold text-primary overflow-hidden transition-all hover:border-primary/40 shrink-0">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              profile?.name?.charAt(0)?.toUpperCase() || "R"
            )}
          </div>
          <ChevronDown className="w-3 h-3 text-muted-foreground hidden sm:block" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <div className="px-3 py-2 border-b border-border/30">
          <p className="text-sm font-semibold text-foreground truncate">{profile?.name || "Reseller"}</p>
          <p className="text-[10px] text-muted-foreground truncate">{profile?.email}</p>
        </div>
        <DropdownMenuItem onClick={() => navigate("/dashboard/settings")} className="gap-2 cursor-pointer">
          <User className="w-4 h-4" /> Profile
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate("/dashboard/settings?tab=preferences")} className="gap-2 cursor-pointer">
          <Settings className="w-4 h-4" /> Settings
        </DropdownMenuItem>
        {isAdmin && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate("/admin")} className="gap-2 cursor-pointer text-primary">
              <ArrowLeftRight className="w-4 h-4" /> Admin Panel
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onLogout} className="gap-2 cursor-pointer text-destructive focus:text-destructive">
          <LogOut className="w-4 h-4" /> Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

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
  const queryClient = useQueryClient();

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
    if (path.includes("?tab=")) {
      const [basePath, query] = path.split("?");
      const tab = new URLSearchParams(query).get("tab");
      return location.pathname === basePath && new URLSearchParams(location.search).get("tab") === tab;
    }
    if (path === "/dashboard") return location.pathname === "/dashboard";
    return location.pathname.startsWith(path);
  };

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

      {/* ═══ SIDEBAR (Desktop only) ═══ */}
      <aside
        className={cn(
          "fixed lg:static inset-y-0 left-0 z-50 flex flex-col",
          "bg-sidebar/70 backdrop-blur-2xl border-r border-sidebar-border/30",
          "transition-all duration-300 ease-out",
          collapsed ? "lg:w-[72px]" : "lg:w-[240px]",
          "w-[260px]",
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.02] via-transparent to-accent/[0.02] pointer-events-none rounded-none" />
        <TooltipProvider delayDuration={0}>
          {/* Logo header */}
          <div className="h-14 px-4 border-b border-sidebar-border/30 flex items-center justify-between shrink-0">
            <Link to="/dashboard" className="flex items-center gap-3 group min-w-0" onClick={() => setSidebarOpen(false)}>
              <img src={kkLogo} alt="KKTech" className="w-8 h-8 rounded-xl object-contain shrink-0 transition-transform duration-200 group-hover:scale-105" />
              {!collapsed && (
                <div className="overflow-hidden">
                  <span className="text-[15px] font-bold text-foreground tracking-tight">
                    KK<span className="text-primary">Tech</span>
                  </span>
                  <span className="text-[9px] block text-primary/60 font-bold uppercase tracking-[0.15em]">
                    Digital Unlock Hub
                  </span>
                </div>
              )}
            </Link>
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

          {/* Navigation groups — clean, no redundancy */}
          <nav className="flex-1 overflow-y-auto px-3 pt-3 pb-2 sidebar-scroll">
            {navGroups.map((group, gi) => (
              <div key={group.title} className={cn(gi > 0 && "mt-3")}>
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
                          "group relative flex items-center gap-3 h-10 rounded-xl text-[13px] tracking-wide",
                          "transition-all duration-200",
                          collapsed ? "justify-center px-0" : "pl-3 pr-3",
                          active
                            ? "bg-primary/10 text-foreground font-semibold"
                            : "text-muted-foreground hover:text-foreground hover:bg-secondary/40"
                        )}
                      >
                        {active && (
                          <span
                            className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full"
                            style={{
                              background: 'linear-gradient(180deg, hsl(217 91% 60%), hsl(250 70% 60%))',
                              boxShadow: '0 0 10px hsl(217 91% 60% / 0.5), 0 0 20px hsl(250 70% 60% / 0.2)',
                            }}
                          />
                        )}
                        <div className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all duration-200",
                          active
                            ? "bg-gradient-to-br from-primary/20 to-accent/15 text-primary"
                            : "text-muted-foreground group-hover:text-foreground group-hover:bg-secondary/60"
                        )}>
                          <item.icon className="w-[16px] h-[16px]" strokeWidth={1.8} />
                        </div>
                        {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
                      </PrefetchLink>
                    );
                    return collapsed ? (
                      <Tooltip key={item.path}>
                        <TooltipTrigger asChild>{linkEl}</TooltipTrigger>
                        <TooltipContent side="right" sideOffset={8} className="text-xs font-medium">{item.label}</TooltipContent>
                      </Tooltip>
                    ) : (
                      <span key={item.path}>{linkEl}</span>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Admin link — only for admins, in sidebar */}
            {isAdmin && !collapsed && (
              <div className="mt-3">
                <div className="px-3 mb-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground/60">ADMIN</span>
                </div>
                <Link
                  to="/admin"
                  onClick={() => setSidebarOpen(false)}
                  className="group relative flex items-center gap-3 h-10 rounded-xl text-[13px] tracking-wide pl-3 pr-3 text-muted-foreground hover:text-foreground hover:bg-secondary/40 transition-all duration-200"
                >
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-muted-foreground group-hover:text-foreground group-hover:bg-secondary/60 transition-all duration-200">
                    <ArrowLeftRight className="w-[16px] h-[16px]" strokeWidth={1.8} />
                  </div>
                  <span className="flex-1 truncate">Admin Panel</span>
                </Link>
              </div>
            )}
            {isAdmin && collapsed && (
              <div className="mt-3">
                <div className="mx-3 mb-2 border-t border-sidebar-border/40" />
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link
                      to="/admin"
                      onClick={() => setSidebarOpen(false)}
                      className="group relative flex items-center justify-center h-10 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary/40 transition-all duration-200"
                    >
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0">
                        <ArrowLeftRight className="w-[16px] h-[16px]" strokeWidth={1.8} />
                      </div>
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="right" sideOffset={8} className="text-xs font-medium">Admin Panel</TooltipContent>
                </Tooltip>
              </div>
            )}
          </nav>

          {/* User profile footer — simplified */}
          <div className="mt-auto border-t border-sidebar-border/30 px-3 py-3 shrink-0">
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
                  <p className="text-[13px] font-semibold text-foreground truncate">{profile?.name || "Reseller"}</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{profile?.tier || "Reseller"}</p>
                </div>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="w-8 h-8 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all shrink-0" onClick={handleLogout}>
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
                    <Button variant="ghost" size="icon" className="w-8 h-8 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all" onClick={handleLogout}>
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
        {/* Top Navbar — streamlined */}
        <header className="h-12 lg:h-14 border-b border-border/30 flex items-center justify-between px-3 sm:px-4 lg:px-8 fixed top-0 left-0 right-0 lg:sticky lg:relative z-30 bg-card/80 backdrop-blur-2xl">
          <div className="flex items-center gap-2">
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

          <div className="flex items-center gap-2 lg:gap-3">
            <WalletChip profile={profile} />
            <UserAvatarDropdown profile={profile} isAdmin={isAdmin} onLogout={handleLogout} />
          </div>
        </header>

        {/* Spacer for fixed header on mobile */}
        <div className="h-12 lg:h-0 shrink-0 lg:hidden" />

        <main
          className="flex-1 p-3 sm:p-4 lg:p-8 pb-24 lg:pb-8 lg:overflow-y-auto"
          data-scroll-area
          style={{ paddingBottom: 'max(6rem, calc(5rem + env(safe-area-inset-bottom, 0px)))' }}
        >
          <PullToRefresh onRefresh={handlePullRefresh}>
            <AnimatePresence mode="wait">
              <PageTransition key={location.pathname}>
                {children}
              </PageTransition>
            </AnimatePresence>
          </PullToRefresh>
        </main>
      </div>

      {/* Bottom Nav */}
      <BottomNav />
      <FloatingSupport />
    </div>
  );
}
