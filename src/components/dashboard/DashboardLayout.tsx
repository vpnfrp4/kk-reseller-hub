import { useState, useEffect, useCallback } from "react";
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
  Settings,
  ChevronDown,
  Menu,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCurrency } from "@/contexts/CurrencyContext";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import BottomNav from "@/components/dashboard/BottomNav";
import NotificationDropdown from "@/components/dashboard/NotificationDropdown";
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
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-sm font-bold font-display tabular-nums text-primary hover:bg-primary/15 transition-colors"
    >
      <Wallet className="w-3.5 h-3.5" />
      <Money amount={convert(profile?.balance || 0)} raw className="text-sm" />
    </button>
  );
}

/* ── User Avatar (topbar) ── */
function UserAvatar({ profile }: { profile: any }) {
  return (
    <div className="w-[34px] h-[34px] rounded-full bg-accent border border-border flex items-center justify-center text-xs font-bold font-display text-accent-foreground overflow-hidden shrink-0">
      {profile?.avatar_url ? (
        <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
      ) : (
        profile?.name?.charAt(0)?.toUpperCase() || "R"
      )}
    </div>
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
      <header className="sticky top-0 z-50 border-b border-border" style={{ background: 'hsl(var(--card) / 0.9)', backdropFilter: 'blur(8px)' }}>
        <div className="w-full max-w-[1220px] mx-auto px-3 sm:px-4">
          <div className="flex items-center justify-between min-h-[62px]">
            {/* Brand */}
            <Link to="/dashboard" className="inline-flex items-center gap-3 shrink-0">
              <div className="w-[34px] h-[34px] rounded-[0.9rem] grid place-items-center text-[0.72rem] font-bold font-display text-primary-foreground bg-primary shadow-[0_8px_16px_-10px_hsl(var(--primary))]">
                <img src={kkLogo} alt="KK" className="w-full h-full rounded-[0.9rem] object-contain" />
              </div>
              <div className="grid gap-[0.06rem]">
                <strong className="font-display text-base leading-none tracking-[0.02em]">KKTech Panel</strong>
                <span className="text-[0.72rem] text-muted-foreground leading-none">CarDrive-style Dashboard UI</span>
              </div>
            </Link>

            {/* Right actions */}
            <div className="flex items-center gap-2.5">
              <WalletChip profile={profile} />
              {/* <NotificationDropdown /> */}
              <UserAvatar profile={profile} />

              {/* Mobile hamburger */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ═══ SHELL: SIDEBAR + CONTENT ═══ */}
      <div className="w-full max-w-[1220px] mx-auto px-3 sm:px-4 flex-1 grid gap-4 py-4 lg:grid-cols-[var(--sidebar-width,252px)_minmax(0,1fr)]">
        
        {/* ── Desktop Sidebar ── */}
        <aside className="hidden lg:block self-start sticky top-[77px]">
          <div className="border border-border rounded-[1.2rem] overflow-hidden shadow-card" style={{ background: 'hsl(var(--card) / 0.82)', backdropFilter: 'blur(10px)' }}>
            <div className="px-4 pt-4 pb-3 border-b border-border">
              <p className="text-[0.74rem] text-muted-foreground uppercase tracking-[0.12em] font-semibold">Main Navigation</p>
            </div>
            <nav className="grid gap-[0.3rem] p-3">
              {navItems.map((item) => {
                const active = isActive(item.path);
                return (
                  <PrefetchLink
                    key={item.path}
                    to={item.path}
                    className={cn(
                      "flex items-center gap-2.5 px-3 py-[0.72rem] rounded-[0.8rem] text-[0.86rem] font-semibold border transition-all duration-200",
                      active
                        ? "text-primary border-primary/25 bg-primary/10"
                        : "text-muted-foreground border-transparent hover:border-input hover:text-foreground hover:bg-secondary"
                    )}
                  >
                    <item.icon className="w-4 h-4" strokeWidth={1.8} />
                    {item.label}
                  </PrefetchLink>
                );
              })}
              {isAdmin && (
                <>
                  <div className="border-t border-border/40 my-1" />
                  <PrefetchLink
                    to="/admin"
                    className={cn(
                      "flex items-center gap-2.5 px-3 py-[0.72rem] rounded-[0.8rem] text-[0.86rem] font-semibold border transition-all duration-200",
                      location.pathname.startsWith("/admin")
                        ? "text-primary border-primary/25 bg-primary/10"
                        : "text-muted-foreground border-transparent hover:border-input hover:text-foreground hover:bg-secondary"
                    )}
                  >
                    <ArrowLeftRight className="w-4 h-4" strokeWidth={1.8} />
                    Admin
                  </PrefetchLink>
                </>
              )}

              {/* Settings & Sign Out */}
              <div className="border-t border-border/40 my-1" />
              <PrefetchLink
                to="/dashboard/settings"
                className={cn(
                  "flex items-center gap-2.5 px-3 py-[0.72rem] rounded-[0.8rem] text-[0.86rem] font-semibold border transition-all duration-200",
                  location.pathname.startsWith("/dashboard/settings")
                    ? "text-primary border-primary/25 bg-primary/10"
                    : "text-muted-foreground border-transparent hover:border-input hover:text-foreground hover:bg-secondary"
                )}
              >
                <Settings className="w-4 h-4" strokeWidth={1.8} />
                Settings
              </PrefetchLink>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2.5 px-3 py-[0.72rem] rounded-[0.8rem] text-[0.86rem] font-semibold border border-transparent text-muted-foreground hover:border-destructive/25 hover:text-destructive hover:bg-destructive/5 transition-all duration-200 text-left"
              >
                <LogOut className="w-4 h-4" strokeWidth={1.8} />
                Sign Out
              </button>
            </nav>
          </div>
        </aside>

        {/* ── Mobile Sidebar Dropdown ── */}
        {mobileMenuOpen && (
          <div className="lg:hidden border border-border rounded-[1.2rem] overflow-hidden shadow-card animate-fade-in" style={{ background: 'hsl(var(--card) / 0.92)', backdropFilter: 'blur(10px)' }}>
            <nav className="grid gap-1 p-3 grid-cols-2 sm:grid-cols-3">
              {navItems.map((item) => {
                const active = isActive(item.path);
                return (
                  <PrefetchLink
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2.5 rounded-[0.8rem] text-sm font-semibold border transition-all",
                      active
                        ? "text-primary border-primary/25 bg-primary/10"
                        : "text-muted-foreground border-transparent hover:text-foreground hover:bg-secondary"
                    )}
                  >
                    <item.icon className="w-4 h-4" strokeWidth={1.8} />
                    {item.label}
                  </PrefetchLink>
                );
              })}
              {isAdmin && (
                <Link
                  to="/admin"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-[0.8rem] text-sm font-semibold text-primary border border-transparent hover:bg-primary/5 transition-all"
                >
                  <ArrowLeftRight className="w-4 h-4" strokeWidth={1.8} />
                  Admin
                </Link>
              )}
              <button
                onClick={() => { setMobileMenuOpen(false); handleLogout(); }}
                className="flex items-center gap-2 px-3 py-2.5 rounded-[0.8rem] text-sm font-semibold text-destructive border border-transparent hover:bg-destructive/5 transition-all text-left"
              >
                <LogOut className="w-4 h-4" strokeWidth={1.8} />
                Sign Out
              </button>
            </nav>
          </div>
        )}

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
