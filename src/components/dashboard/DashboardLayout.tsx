import { useState, useEffect, useCallback } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import PrefetchLink from "@/components/PrefetchLink";
import { AnimatePresence, motion } from "framer-motion";
import PageTransition from "@/components/dashboard/PageTransition";
import PullToRefresh from "@/components/shared/PullToRefresh";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

import {
  Home,
  ShoppingCart,
  Receipt,
  LogOut,
  ArrowLeftRight,
  Wallet,
  Settings,
  Menu,
  X,
  ChevronRight,
  Zap,
} from "lucide-react";
import { useCurrency } from "@/contexts/CurrencyContext";
import { cn } from "@/lib/utils";

import BottomNav from "@/components/dashboard/BottomNav";
import kkLogo from "@/assets/kkremote-logo.png";
import { Money } from "@/components/shared";

/* ── Nav items ── */
interface NavItem {
  label: string;
  icon: React.ElementType;
  path: string;
}

const navItems: NavItem[] = [
  { label: "Dashboard", icon: Home, path: "/dashboard" },
  { label: "Place Order", icon: ShoppingCart, path: "/dashboard/place-order" },
  { label: "Orders", icon: Receipt, path: "/dashboard/orders" },
  { label: "Wallet", icon: Wallet, path: "/dashboard/wallet" },
];

/* ── Wallet Chip (topbar) ── */
function WalletChip({ profile }: { profile: any }) {
  const navigate = useNavigate();
  const { convert } = useCurrency();
  return (
    <button
      onClick={() => navigate("/dashboard/wallet")}
      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary/8 border border-primary/15 text-sm font-bold font-display tabular-nums text-primary hover:bg-primary/12 hover:border-primary/25 transition-all duration-200"
    >
      <Wallet className="w-3.5 h-3.5" />
      <Money amount={convert(profile?.balance || 0)} raw className="text-sm" />
    </button>
  );
}

/* ── User Avatar ── */
function UserAvatar({ profile, size = "sm" }: { profile: any; size?: "sm" | "md" }) {
  const dims = size === "md" ? "w-10 h-10 text-sm" : "w-[34px] h-[34px] text-xs";
  return (
    <div className={cn(dims, "rounded-full bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/15 flex items-center justify-center font-bold font-display text-primary overflow-hidden shrink-0")}>
      {profile?.avatar_url ? (
        <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
      ) : (
        profile?.name?.charAt(0)?.toUpperCase() || "R"
      )}
    </div>
  );
}

/* ── Sidebar Nav Link ── */
function SidebarNavLink({ item, active, onClick }: { item: NavItem; active: boolean; onClick?: () => void }) {
  return (
    <PrefetchLink
      to={item.path}
      onClick={onClick}
      className={cn(
        "relative flex items-center gap-3 px-3.5 py-[0.65rem] rounded-xl text-[0.84rem] font-semibold transition-all duration-200 group",
        active
          ? "text-primary bg-primary/8"
          : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
      )}
    >
      {/* Active indicator bar */}
      {active && (
        <motion.div
          layoutId="sidebar-active"
          className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-full bg-primary"
          transition={{ type: "spring", stiffness: 380, damping: 30 }}
        />
      )}
      <item.icon className={cn("w-[18px] h-[18px] transition-colors", active ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} strokeWidth={1.7} />
      {item.label}
    </PrefetchLink>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

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
    if (path === "/dashboard") return location.pathname === "/dashboard";
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background">
      {/* ═══ TOP BAR ═══ */}
      <header
        className="sticky top-0 z-50 border-b border-border/40"
        style={{
          background: 'hsl(var(--card) / 0.92)',
          backdropFilter: 'blur(20px) saturate(1.4)',
          WebkitBackdropFilter: 'blur(20px) saturate(1.4)',
        }}
      >
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-primary/10 to-transparent" />
        <div className="w-full max-w-[1220px] mx-auto px-3 sm:px-4">
          <div className="flex items-center justify-between min-h-[60px]">
            {/* Brand */}
            <Link to="/dashboard" className="inline-flex items-center gap-2.5 shrink-0 group">
              <div className="w-9 h-9 rounded-xl grid place-items-center bg-primary shadow-[0_4px_12px_-4px_hsl(var(--primary)/0.4)] group-hover:shadow-[0_6px_20px_-4px_hsl(var(--primary)/0.5)] transition-shadow duration-300 overflow-hidden">
                <img src={kkLogo} alt="KK" className="w-full h-full object-contain" />
              </div>
              <strong className="font-display text-[0.95rem] leading-none tracking-tight">KKTech Panel</strong>
            </Link>

            {/* Right actions */}
            <div className="flex items-center gap-2">
              <WalletChip profile={profile} />
              <UserAvatar profile={profile} />

              {/* Mobile hamburger */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-all"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ═══ SHELL: SIDEBAR + CONTENT ═══ */}
      <div className="w-full max-w-[1220px] mx-auto px-3 sm:px-4 flex-1 grid gap-5 py-4 lg:grid-cols-[var(--sidebar-width,244px)_minmax(0,1fr)]">

        {/* ── Desktop Sidebar ── */}
        <aside className="hidden lg:block self-start sticky top-[76px]">
          <div
            className="rounded-2xl overflow-hidden border border-border/60"
            style={{
              background: 'hsl(var(--card) / 0.88)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
            }}
          >
            {/* User Profile Card */}
            <div className="p-4 border-b border-border/40">
              <div className="flex items-center gap-3">
                <UserAvatar profile={profile} size="md" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-foreground truncate">{profile?.name || "Reseller"}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{profile?.email || ""}</p>
                </div>
              </div>
            </div>

            {/* Navigation */}
            <nav className="p-2.5 space-y-0.5">
              <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-[0.14em] px-3.5 pt-1 pb-2">Menu</p>
              {navItems.map((item) => (
                <SidebarNavLink key={item.path} item={item} active={isActive(item.path)} />
              ))}

              {isAdmin && (
                <>
                  <div className="h-px bg-border/30 mx-3 my-2" />
                  <SidebarNavLink
                    item={{ label: "Admin", icon: ArrowLeftRight, path: "/admin" }}
                    active={location.pathname.startsWith("/admin")}
                  />
                </>
              )}

              <div className="h-px bg-border/30 mx-3 my-2" />
              <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-[0.14em] px-3.5 pt-1 pb-2">Account</p>

              <SidebarNavLink
                item={{ label: "Settings", icon: Settings, path: "/dashboard/settings" }}
                active={location.pathname.startsWith("/dashboard/settings")}
              />

              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3.5 py-[0.65rem] rounded-xl text-[0.84rem] font-semibold text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-all duration-200 text-left"
              >
                <LogOut className="w-[18px] h-[18px]" strokeWidth={1.7} />
                Sign Out
              </button>
            </nav>
          </div>
        </aside>

        {/* ── Mobile Sidebar Dropdown ── */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
              className="lg:hidden border border-border/50 rounded-2xl overflow-hidden"
              style={{ background: 'hsl(var(--card) / 0.95)', backdropFilter: 'blur(12px)' }}
            >
              {/* User info */}
              <div className="flex items-center gap-3 p-3.5 border-b border-border/30">
                <UserAvatar profile={profile} size="md" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-foreground truncate">{profile?.name || "Reseller"}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{profile?.email || ""}</p>
                </div>
              </div>

              <nav className="grid gap-0.5 p-2.5 grid-cols-2 sm:grid-cols-3">
                {navItems.map((item) => {
                  const active = isActive(item.path);
                  return (
                    <PrefetchLink
                      key={item.path}
                      to={item.path}
                      onClick={() => setMobileMenuOpen(false)}
                      className={cn(
                        "flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all",
                        active
                          ? "text-primary bg-primary/8"
                          : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                      )}
                    >
                      <item.icon className="w-4 h-4" strokeWidth={1.7} />
                      {item.label}
                    </PrefetchLink>
                  );
                })}
                {isAdmin && (
                  <Link
                    to="/admin"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold text-primary hover:bg-primary/5 transition-all"
                  >
                    <ArrowLeftRight className="w-4 h-4" strokeWidth={1.7} />
                    Admin
                  </Link>
                )}
                <PrefetchLink
                  to="/dashboard/settings"
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all",
                    location.pathname.startsWith("/dashboard/settings")
                      ? "text-primary bg-primary/8"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                  )}
                >
                  <Settings className="w-4 h-4" strokeWidth={1.7} />
                  Settings
                </PrefetchLink>
                <button
                  onClick={() => { setMobileMenuOpen(false); handleLogout(); }}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold text-destructive hover:bg-destructive/5 transition-all text-left"
                >
                  <LogOut className="w-4 h-4" strokeWidth={1.7} />
                  Sign Out
                </button>
              </nav>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Main Content ── */}
        <main className="min-w-0 pb-24 lg:pb-4" data-scroll-area>
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
    </div>
  );
}
