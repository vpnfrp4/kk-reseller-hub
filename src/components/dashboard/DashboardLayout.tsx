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
  Bell,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";

import BottomNav from "@/components/dashboard/BottomNav";
import NotificationDropdown from "@/components/dashboard/NotificationDropdown";

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

/* ── Sidebar Nav Link ── */
function SidebarNavLink({ item, active, onClick }: { item: NavItem; active: boolean; onClick?: () => void }) {
  return (
    <PrefetchLink
      to={item.path}
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-sm font-medium transition-all duration-200",
        active
          ? "text-foreground bg-secondary font-semibold"
          : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
      )}
    >
      <item.icon className={cn("w-[18px] h-[18px]", active ? "text-foreground" : "text-muted-foreground")} strokeWidth={1.5} />
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
      {/* ═══ MINIMAL TOP BAR (BNPL) ═══ */}
      <header className="sticky top-0 z-50 bg-background">
        <div className="w-full max-w-[1220px] mx-auto px-4 sm:px-5">
          <div className="flex items-center justify-between h-14 lg:h-16">
            {/* Left: Search icon (mobile) / Brand (desktop) */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate("/dashboard/place-order")}
                className="lg:hidden p-2 -ml-2 text-muted-foreground"
              >
                <Search className="w-5 h-5" strokeWidth={1.5} />
              </button>
              <Link to="/dashboard" className="hidden lg:inline-flex items-center gap-2.5">
                <strong className="text-base font-bold tracking-tight">KKTech</strong>
              </Link>
            </div>

            {/* Right: Notification bell */}
            <div className="flex items-center gap-1">
              <NotificationDropdown />
              {/* Mobile hamburger */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 text-muted-foreground"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ═══ SHELL: SIDEBAR + CONTENT ═══ */}
      <div className="w-full max-w-[1220px] mx-auto px-4 sm:px-5 flex-1 grid gap-5 py-3 lg:py-5 lg:grid-cols-[220px_minmax(0,1fr)]">

        {/* ── Desktop Sidebar ── */}
        <aside className="hidden lg:block self-start sticky top-20">
          <nav className="space-y-1">
            {navItems.map((item) => (
              <SidebarNavLink key={item.path} item={item} active={isActive(item.path)} />
            ))}

            {isAdmin && (
              <>
                <div className="h-px bg-border/20 mx-3 my-3" />
                <SidebarNavLink
                  item={{ label: "Admin", icon: ArrowLeftRight, path: "/admin" }}
                  active={location.pathname.startsWith("/admin")}
                />
              </>
            )}

            <div className="h-px bg-border/20 mx-3 my-3" />

            <SidebarNavLink
              item={{ label: "Settings", icon: Settings, path: "/dashboard/settings" }}
              active={location.pathname.startsWith("/dashboard/settings")}
            />

            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-sm font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-all duration-200 text-left"
            >
              <LogOut className="w-[18px] h-[18px]" strokeWidth={1.5} />
              Sign Out
            </button>
          </nav>
        </aside>

        {/* ── Mobile Menu Dropdown ── */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
              className="lg:hidden rounded-2xl bg-card border border-border/30 overflow-hidden"
              style={{ boxShadow: "var(--shadow-card)" }}
            >
              <nav className="p-2 grid grid-cols-2 gap-1">
                {navItems.map((item) => {
                  const active = isActive(item.path);
                  return (
                    <PrefetchLink
                      key={item.path}
                      to={item.path}
                      onClick={() => setMobileMenuOpen(false)}
                      className={cn(
                        "flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                        active ? "text-foreground bg-secondary" : "text-muted-foreground"
                      )}
                    >
                      <item.icon className="w-4 h-4" strokeWidth={1.5} />
                      {item.label}
                    </PrefetchLink>
                  );
                })}
                {isAdmin && (
                  <Link
                    to="/admin"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium text-primary"
                  >
                    <ArrowLeftRight className="w-4 h-4" strokeWidth={1.5} />
                    Admin
                  </Link>
                )}
                <PrefetchLink
                  to="/dashboard/settings"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground"
                >
                  <Settings className="w-4 h-4" strokeWidth={1.5} />
                  Settings
                </PrefetchLink>
                <button
                  onClick={() => { setMobileMenuOpen(false); handleLogout(); }}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium text-destructive text-left"
                >
                  <LogOut className="w-4 h-4" strokeWidth={1.5} />
                  Sign Out
                </button>
              </nav>
            </motion.div>
          )}
        </AnimatePresence>

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
    </div>
  );
}
