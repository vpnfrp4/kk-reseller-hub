import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { Navigate, Link, useLocation, useNavigate } from "react-router-dom";
import {
  Package, KeyRound, Wallet, LayoutDashboard, LogOut, Menu, X, Users,
  ShoppingCart, ArrowLeftRight, Settings, Database, FileText, TrendingUp,
  Activity, Shield, ClipboardList, Download, Star, FolderOpen, ChevronRight,
} from "lucide-react";
import AdminNotificationBell from "@/components/admin/AdminNotificationBell";
import ThemeToggle from "@/components/ThemeToggle";
import SoundToggle from "@/components/shared/SoundToggle";
import { toast } from "sonner";
import { notifyEvent } from "@/lib/notifications";
import { cn } from "@/lib/utils";
import kkLogo from "@/assets/kkremote-logo.png";
import { motion, AnimatePresence } from "framer-motion";

const navSections = [
  {
    label: "Main",
    items: [
      { label: "Overview", icon: LayoutDashboard, path: "/admin" },
      { label: "Orders", icon: ShoppingCart, path: "/admin/orders" },
      { label: "Products", icon: Package, path: "/admin/products" },
      { label: "Credentials", icon: KeyRound, path: "/admin/credentials" },
    ],
  },
  {
    label: "Users & Finance",
    items: [
      { label: "Resellers", icon: Users, path: "/admin/resellers" },
      { label: "Top-ups", icon: Wallet, path: "/admin/topups" },
      { label: "Profit", icon: TrendingUp, path: "/admin/profit" },
      { label: "Reports", icon: Download, path: "/admin/reports" },
    ],
  },
  {
    label: "Services",
    items: [
      { label: "Providers", icon: Database, path: "/admin/providers" },
      { label: "IMEI Services", icon: Database, path: "/admin/imei-services" },
      { label: "Popular Services", icon: Star, path: "/admin/popular-services" },
      { label: "Categories", icon: FolderOpen, path: "/admin/categories" },
    ],
  },
  {
    label: "System",
    items: [
      { label: "Roles & Access", icon: Shield, path: "/admin/roles" },
      { label: "Audit Logs", icon: ClipboardList, path: "/admin/audit-logs" },
      { label: "Monitoring", icon: Activity, path: "/admin/monitoring" },
      { label: "Settings", icon: Settings, path: "/admin/settings" },
      { label: "Blog", icon: FileText, path: "/admin/blog" },
    ],
  },
];

const allNavItems = navSections.flatMap((s) => s.items);

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const { data: pendingTopups = 0 } = useQuery({
    queryKey: ["sidebar-pending-topups"],
    queryFn: async () => {
      const { count } = await supabase
        .from("wallet_transactions")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending");
      return count || 0;
    },
    refetchInterval: 30000,
  });

  const { data: expiringSoon = 0 } = useQuery({
    queryKey: ["sidebar-expiring-creds"],
    queryFn: async () => {
      const { count } = await supabase
        .from("product_credentials")
        .select("id", { count: "exact", head: true })
        .eq("is_sold", false)
        .not("expires_at", "is", null)
        .lte("expires_at", new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString());
      return count || 0;
    },
    refetchInterval: 30000,
  });

  const badgeMap: Record<string, number> = {
    "/admin/topups": pendingTopups,
    "/admin/credentials": expiringSoon,
  };

  useEffect(() => {
    if (!user) return;
    supabase.rpc("has_role", { _user_id: user.id, _role: "admin" }).then(({ data }) => setIsAdmin(!!data));
  }, [user]);

  const expiryChecked = useRef(false);
  useEffect(() => {
    if (!isAdmin || expiryChecked.current) return;
    expiryChecked.current = true;

    const checkExpiring = async () => {
      const threeDaysFromNow = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from("product_credentials")
        .select("id, credentials, expires_at, products(name)")
        .eq("is_sold", false)
        .not("expires_at", "is", null)
        .lte("expires_at", threeDaysFromNow);

      if (error || !data || data.length === 0) return;

      const expired = data.filter((c: any) => new Date(c.expires_at).getTime() <= Date.now());
      const expiring = data.filter((c: any) => new Date(c.expires_at).getTime() > Date.now());

      const lines: string[] = [];
      if (expired.length > 0) lines.push(`${expired.length} expired`);
      if (expiring.length > 0) lines.push(`${expiring.length} expiring soon`);
      const message = `${lines.join(" and ")} unsold credential${data.length === 1 ? "" : "s"}`;

      toast.warning(message, {
        duration: 10000,
        action: { label: "View", onClick: () => navigate("/admin/credentials?status=expiring") },
      });
      notifyEvent("Credential Expiry Alert", message, "error");
    };

    checkExpiring();
  }, [isAdmin, navigate]);

  if (loading || isAdmin === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background">
      {/* ═══ TOP BAR ═══ */}
      <header className="sticky top-0 z-50 border-b border-border/60 bg-card/85 backdrop-blur-xl backdrop-saturate-150">
        <div className="w-full max-w-[1220px] mx-auto px-3 sm:px-4">
          <div className="flex items-center justify-between min-h-[62px]">
            {/* Brand */}
            <Link to="/admin" className="inline-flex items-center gap-3 shrink-0 group">
              <div className="w-[36px] h-[36px] rounded-2xl grid place-items-center text-primary-foreground bg-primary shadow-lg shadow-primary/20 group-hover:shadow-primary/30 transition-shadow">
                <img src={kkLogo} alt="KK" className="w-full h-full rounded-2xl object-contain" />
              </div>
              <div className="grid gap-[0.06rem]">
                <strong className="font-display text-base leading-none tracking-[0.02em]">KKTech Panel</strong>
                <span className="text-[0.68rem] text-muted-foreground/70 leading-none font-medium">Admin Control Center</span>
              </div>
            </Link>

            {/* Right actions */}
            <div className="flex items-center gap-2">
              <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/8 border border-primary/15 text-[11px] font-bold font-display text-primary uppercase tracking-wider">
                <Shield className="w-3 h-3" />
                Super Admin
              </span>
              <SoundToggle />
              <ThemeToggle />
              <AdminNotificationBell />
              <div className="w-[34px] h-[34px] rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/15 grid place-items-center text-xs font-extrabold font-display text-primary">
                A
              </div>

              {/* Mobile hamburger */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
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
          <div className="border border-border/50 rounded-[var(--radius-card)] overflow-hidden shadow-card bg-card/80 backdrop-blur-xl">
            {/* Sidebar header accent */}
            <div className="h-[2px] bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
            <div className="px-4 pt-4 pb-3 border-b border-border/40">
              <p className="text-[0.68rem] text-muted-foreground/70 uppercase tracking-[0.14em] font-bold">
                Navigation
              </p>
            </div>
            <nav className="p-2.5 space-y-2 max-h-[calc(100vh-140px)] overflow-y-auto stool-scrollbar">
              {navSections.map((section, si) => (
                <div key={section.label}>
                  <p className="text-[0.65rem] font-bold text-muted-foreground/60 uppercase tracking-[0.14em] px-3 mb-1 mt-1">
                    {section.label}
                  </p>
                  <div className="grid gap-[2px]">
                    {section.items.map((item) => {
                      const active = isActive(item.path);
                      const badge = badgeMap[item.path] || 0;
                      return (
                        <Link
                          key={item.path}
                          to={item.path}
                          className={cn(
                            "relative flex items-center gap-2.5 px-3 py-[0.62rem] rounded-xl text-[0.84rem] font-semibold transition-all duration-200",
                            active
                              ? "text-primary bg-primary/8 font-bold"
                              : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                          )}
                        >
                          {/* Active indicator bar */}
                          {active && (
                            <motion.div
                              layoutId="admin-sidebar-active"
                              className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-full bg-primary"
                              transition={{ type: "spring", stiffness: 400, damping: 30 }}
                            />
                          )}
                          <item.icon className={cn("w-4 h-4 shrink-0", active && "text-primary")} strokeWidth={1.8} />
                          <span className="flex-1 truncate">{item.label}</span>
                          {badge > 0 && (
                            <span className="min-w-[20px] h-5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center px-1.5 animate-pulse">
                              {badge}
                            </span>
                          )}
                          {active && <ChevronRight className="w-3.5 h-3.5 text-primary/50 shrink-0" />}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}

              {/* Footer links */}
              <div className="border-t border-border/30 pt-2 mt-1 grid gap-[2px]">
                <Link
                  to="/dashboard"
                  className="flex items-center gap-2.5 px-3 py-[0.62rem] rounded-xl text-[0.84rem] font-semibold text-muted-foreground hover:text-primary hover:bg-primary/5 transition-all duration-200"
                >
                  <ArrowLeftRight className="w-4 h-4 shrink-0" strokeWidth={1.8} />
                  Reseller Panel
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2.5 px-3 py-[0.62rem] rounded-xl text-[0.84rem] font-semibold text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-all duration-200 text-left w-full"
                >
                  <LogOut className="w-4 h-4 shrink-0" strokeWidth={1.8} />
                  Sign Out
                </button>
              </div>
            </nav>
          </div>
        </aside>

        {/* ── Mobile Nav Dropdown ── */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              transition={{ duration: 0.2 }}
              className="lg:hidden border border-border/50 rounded-[var(--radius-card)] overflow-hidden shadow-card bg-card/92 backdrop-blur-xl"
            >
              <div className="h-[2px] bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
              <nav className="p-3 space-y-2 max-h-[60vh] overflow-y-auto">
                {navSections.map((section) => (
                  <div key={section.label}>
                    <p className="text-[0.65rem] font-bold text-muted-foreground/60 uppercase tracking-[0.14em] px-3 mb-1">
                      {section.label}
                    </p>
                    <div className="grid grid-cols-2 gap-1">
                      {section.items.map((item) => {
                        const active = isActive(item.path);
                        const badge = badgeMap[item.path] || 0;
                        return (
                          <Link
                            key={item.path}
                            to={item.path}
                            onClick={() => setMobileMenuOpen(false)}
                            className={cn(
                              "flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all",
                              active
                                ? "text-primary bg-primary/8 font-bold"
                                : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                            )}
                          >
                            <item.icon className="w-4 h-4 shrink-0" strokeWidth={1.8} />
                            <span className="truncate">{item.label}</span>
                            {badge > 0 && (
                              <span className="min-w-[18px] h-4 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold flex items-center justify-center px-1">
                                {badge}
                              </span>
                            )}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                ))}
                <div className="border-t border-border/30 pt-2 grid grid-cols-2 gap-1">
                  <Link
                    to="/dashboard"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-bold text-primary hover:bg-primary/5 transition-all"
                  >
                    <ArrowLeftRight className="w-4 h-4" strokeWidth={1.8} />
                    Reseller Panel
                  </Link>
                  <button
                    onClick={() => { setMobileMenuOpen(false); handleLogout(); }}
                    className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-bold text-destructive hover:bg-destructive/5 transition-all text-left"
                  >
                    <LogOut className="w-4 h-4" strokeWidth={1.8} />
                    Sign Out
                  </button>
                </div>
              </nav>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Main Content ── */}
        <main className="min-w-0 pb-4" data-scroll-area>
          {children}
        </main>
      </div>

      {/* Footer */}
      <footer className="w-full max-w-[1220px] mx-auto px-3 sm:px-4 py-3 text-right">
        <Link to="/terms" className="text-xs text-muted-foreground/60 hover:text-foreground transition-colors">
          © {new Date().getFullYear()} KKTech Dashboard Theme
        </Link>
      </footer>
    </div>
  );
}
