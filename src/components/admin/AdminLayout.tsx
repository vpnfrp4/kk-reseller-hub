import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { Navigate, Link, useLocation, useNavigate } from "react-router-dom";
import {
  Package,
  KeyRound,
  Wallet,
  LayoutDashboard,
  LogOut,
  Menu,
  X,
  Users,
  ShoppingCart,
  ArrowLeftRight,
  Settings,
  Database,
  FileText,
  TrendingUp,
  Activity,
  Shield,
  ClipboardList,
  Download,
  Star,
  FolderOpen,
} from "lucide-react";
import AdminNotificationBell from "@/components/admin/AdminNotificationBell";
import ThemeToggle from "@/components/ThemeToggle";
import SoundToggle from "@/components/shared/SoundToggle";
import { toast } from "sonner";
import { notifyEvent } from "@/lib/notifications";
import { cn } from "@/lib/utils";
import kkLogo from "@/assets/kkremote-logo.png";

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
      <header
        className="sticky top-0 z-50 border-b border-border"
        style={{ background: "hsl(var(--card) / 0.9)", backdropFilter: "blur(8px)" }}
      >
        <div className="w-full max-w-[1220px] mx-auto px-3 sm:px-4">
          <div className="flex items-center justify-between min-h-[62px]">
            {/* Brand */}
            <Link to="/admin" className="inline-flex items-center gap-3 shrink-0">
              <div className="w-[34px] h-[34px] rounded-[0.9rem] grid place-items-center text-primary-foreground bg-primary shadow-[0_8px_16px_-10px_hsl(var(--primary))]">
                <img src={kkLogo} alt="KK" className="w-full h-full rounded-[0.9rem] object-contain" />
              </div>
              <div className="grid gap-[0.06rem]">
                <strong className="font-display text-base leading-none tracking-[0.02em]">KKTech Panel</strong>
                <span className="text-[0.72rem] text-muted-foreground leading-none">CarDrive-style Dashboard UI</span>
              </div>
            </Link>

            {/* Right actions */}
            <div className="flex items-center gap-2.5">
              <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-sm font-bold font-display text-primary">
                🛠 Super Admin
              </span>
              <SoundToggle />
              <ThemeToggle />
              <AdminNotificationBell />
              <div className="w-[34px] h-[34px] rounded-full bg-accent border border-border grid place-items-center text-xs font-bold font-display text-accent-foreground">
                A
              </div>

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
          <div
            className="border border-border rounded-[1.2rem] overflow-hidden shadow-card"
            style={{ background: "hsl(var(--card) / 0.82)", backdropFilter: "blur(10px)" }}
          >
            <div className="px-4 pt-4 pb-3 border-b border-border">
              <p className="text-[0.74rem] text-muted-foreground uppercase tracking-[0.12em] font-semibold">
                Admin Navigation
              </p>
            </div>
            <nav className="p-3 space-y-3 max-h-[calc(100vh-140px)] overflow-y-auto stool-scrollbar">
              {navSections.map((section) => (
                <div key={section.label}>
                  <p className="text-[0.68rem] font-semibold text-muted-foreground uppercase tracking-[0.12em] px-3 mb-1">
                    {section.label}
                  </p>
                  <div className="grid gap-[0.3rem]">
                    {section.items.map((item) => {
                      const active = isActive(item.path);
                      const badge = badgeMap[item.path] || 0;
                      return (
                        <Link
                          key={item.path}
                          to={item.path}
                          className={cn(
                            "flex items-center gap-2.5 px-3 py-[0.72rem] rounded-[0.8rem] text-[0.86rem] font-semibold border transition-all duration-200",
                            active
                              ? "text-primary border-primary/25 bg-primary/10"
                              : "text-muted-foreground border-transparent hover:border-input hover:text-foreground hover:bg-secondary"
                          )}
                        >
                          <item.icon className="w-4 h-4 shrink-0" strokeWidth={1.8} />
                          <span className="flex-1 truncate">{item.label}</span>
                          {badge > 0 && (
                            <span className="min-w-[20px] h-5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center px-1.5">
                              {badge}
                            </span>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}

              {/* Footer links */}
              <div className="border-t border-border/40 pt-2 mt-2 grid gap-[0.3rem]">
                <Link
                  to="/dashboard"
                  className="flex items-center gap-2.5 px-3 py-[0.72rem] rounded-[0.8rem] text-[0.86rem] font-semibold border border-transparent text-muted-foreground hover:border-input hover:text-foreground hover:bg-secondary transition-all duration-200"
                >
                  <ArrowLeftRight className="w-4 h-4 shrink-0" strokeWidth={1.8} />
                  Reseller Panel
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2.5 px-3 py-[0.72rem] rounded-[0.8rem] text-[0.86rem] font-semibold border border-transparent text-muted-foreground hover:border-destructive/25 hover:text-destructive hover:bg-destructive/5 transition-all duration-200 text-left w-full"
                >
                  <LogOut className="w-4 h-4 shrink-0" strokeWidth={1.8} />
                  Sign Out
                </button>
              </div>
            </nav>
          </div>
        </aside>

        {/* ── Mobile Nav Dropdown ── */}
        {mobileMenuOpen && (
          <div
            className="lg:hidden border border-border rounded-[1.2rem] overflow-hidden shadow-card animate-fade-in"
            style={{ background: "hsl(var(--card) / 0.92)", backdropFilter: "blur(10px)" }}
          >
            <nav className="p-3 space-y-2 max-h-[60vh] overflow-y-auto">
              {navSections.map((section) => (
                <div key={section.label}>
                  <p className="text-[0.68rem] font-semibold text-muted-foreground uppercase tracking-[0.12em] px-3 mb-1">
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
                            "flex items-center gap-2 px-3 py-2.5 rounded-[0.8rem] text-sm font-semibold border transition-all",
                            active
                              ? "text-primary border-primary/25 bg-primary/10"
                              : "text-muted-foreground border-transparent hover:text-foreground hover:bg-secondary"
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
              <div className="border-t border-border/40 pt-2 grid grid-cols-2 gap-1">
                <Link
                  to="/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-[0.8rem] text-sm font-semibold text-primary border border-transparent hover:bg-primary/5 transition-all"
                >
                  <ArrowLeftRight className="w-4 h-4" strokeWidth={1.8} />
                  Reseller Panel
                </Link>
                <button
                  onClick={() => { setMobileMenuOpen(false); handleLogout(); }}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-[0.8rem] text-sm font-semibold text-destructive border border-transparent hover:bg-destructive/5 transition-all text-left"
                >
                  <LogOut className="w-4 h-4" strokeWidth={1.8} />
                  Sign Out
                </button>
              </div>
            </nav>
          </div>
        )}

        {/* ── Main Content ── */}
        <main className="min-w-0 pb-4" data-scroll-area>
          {children}
        </main>
      </div>

      {/* Footer */}
      <footer className="w-full max-w-[1220px] mx-auto px-3 sm:px-4 py-3 text-right">
        <Link to="/terms" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
          © {new Date().getFullYear()} KKTech Dashboard Theme
        </Link>
      </footer>
    </div>
  );
}
