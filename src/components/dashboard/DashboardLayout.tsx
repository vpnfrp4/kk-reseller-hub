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

/* ── Top nav items ── */
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

/* ── Wallet Chip ── */
function WalletChip({ profile }: { profile: any }) {
  const navigate = useNavigate();
  const { convert } = useCurrency();
  return (
    <button
      onClick={() => navigate("/dashboard/wallet")}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-sm font-bold font-mono tabular-nums text-primary hover:bg-primary/15 transition-colors"
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
        <button className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-secondary/60 transition-colors">
          <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-xs font-bold text-primary overflow-hidden shrink-0">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              profile?.name?.charAt(0)?.toUpperCase() || "R"
            )}
          </div>
          <span className="text-sm font-medium text-foreground hidden sm:block max-w-[100px] truncate">
            {profile?.name || "Reseller"}
          </span>
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground hidden sm:block" />
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
      {/* ═══ TOP NAVIGATION BAR ═══ */}
      <header className="sticky top-0 z-50 bg-card border-b border-border shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            {/* Logo */}
            <div className="flex items-center gap-6">
              <Link to="/dashboard" className="flex items-center gap-2.5 shrink-0">
                <img src={kkLogo} alt="KKTech" className="w-8 h-8 rounded-lg object-contain" />
                <span className="text-base font-bold text-foreground tracking-tight">
                  KK<span className="text-primary">Tech</span>
                </span>
              </Link>

              {/* Desktop Nav Links */}
              <nav className="hidden lg:flex items-center gap-1">
                {navItems.map((item) => {
                  const active = isActive(item.path);
                  return (
                    <PrefetchLink
                      key={item.path}
                      to={item.path}
                      className={cn(
                        "flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                        active
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                      )}
                    >
                      <item.icon className="w-4 h-4" strokeWidth={1.8} />
                      {item.label}
                    </PrefetchLink>
                  );
                })}
              </nav>
            </div>

            {/* Right side */}
            <div className="flex items-center gap-2">
              <WalletChip profile={profile} />
              <NotificationDropdown />
              <UserAvatarDropdown profile={profile} isAdmin={isAdmin} onLogout={handleLogout} />
              
              {/* Mobile menu button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile dropdown menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-border bg-card px-4 py-3 space-y-1">
            {navItems.map((item) => {
              const active = isActive(item.path);
              return (
                <PrefetchLink
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/40"
                  )}
                >
                  <item.icon className="w-4 h-4" strokeWidth={1.8} />
                  {item.label}
                </PrefetchLink>
              );
            })}
            {isAdmin && (
              <>
                <div className="border-t border-border/40 my-2" />
                <Link
                  to="/admin"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-primary hover:bg-primary/5 transition-all"
                >
                  <ArrowLeftRight className="w-4 h-4" strokeWidth={1.8} />
                  Admin Panel
                </Link>
              </>
            )}
          </div>
        )}
      </header>

      {/* ═══ MAIN CONTENT ═══ */}
      <main
        className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 lg:py-6 pb-24 lg:pb-8"
        data-scroll-area
      >
        <PullToRefresh onRefresh={handlePullRefresh}>
          <AnimatePresence mode="wait">
            <PageTransition key={location.pathname}>
              {children}
            </PageTransition>
          </AnimatePresence>
        </PullToRefresh>
      </main>

      {/* Bottom Nav (mobile only) */}
      <BottomNav />
    </div>
  );
}
