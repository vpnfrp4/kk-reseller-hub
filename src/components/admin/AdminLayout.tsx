import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { Navigate, Link, useLocation, useNavigate } from "react-router-dom";
import {
  // ShieldCheck removed — using logo image instead
  Package,
  KeyRound,
  Wallet,
  LayoutDashboard,
  LogOut,
  Menu,
  Users,
  ShoppingCart,
  ArrowLeftRight,
  X,
  Settings,
  Database,
  FileText,
  TrendingUp,
  Activity,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import AdminNotificationBell from "@/components/admin/AdminNotificationBell";
import ThemeToggle from "@/components/ThemeToggle";
import SoundToggle from "@/components/shared/SoundToggle";
import { toast } from "sonner";
import { notifyEvent } from "@/lib/notifications";
import { cn } from "@/lib/utils";
import kkLogo from "@/assets/kkremote-logo.png";

const navItems = [
  { label: "Overview", icon: LayoutDashboard, path: "/admin", accent: "text-sky-400" },
  { label: "Products", icon: Package, path: "/admin/products", accent: "text-violet-400" },
  { label: "Providers", icon: Database, path: "/admin/providers", accent: "text-cyan-400" },
  { label: "Credentials", icon: KeyRound, path: "/admin/credentials", accent: "text-amber-400" },
  { label: "Top-ups", icon: Wallet, path: "/admin/topups", accent: "text-emerald-400" },
  { label: "Orders", icon: ShoppingCart, path: "/admin/orders", accent: "text-orange-400" },
  { label: "Resellers", icon: Users, path: "/admin/resellers", accent: "text-pink-400" },
  { label: "Settings", icon: Settings, path: "/admin/settings", accent: "text-muted-foreground" },
  { label: "Profit", icon: TrendingUp, path: "/admin/profit", accent: "text-lime-400" },
  { label: "Monitoring", icon: Activity, path: "/admin/monitoring", accent: "text-rose-400" },
  { label: "Blog", icon: FileText, path: "/admin/blog", accent: "text-teal-400" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // Badge counts
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
    const checkAdmin = async () => {
      const { data } = await supabase.rpc("has_role", {
        _user_id: user.id,
        _role: "admin",
      });
      setIsAdmin(!!data);
    };
    checkAdmin();
  }, [user]);

  // Check for credentials expiring within 3 days
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
      <div className="min-h-screen flex items-center justify-center bg-background admin-theme">
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

  return (
    <div className="admin-theme h-screen flex bg-background overflow-hidden">
      {/* Mobile overlay */}
      <div
        className={cn(
          "fixed inset-0 bg-background/60 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300",
          sidebarOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={() => setSidebarOpen(false)}
      />

      {/* Sidebar — premium fintech */}
      <aside
        className={cn(
          "fixed lg:static inset-y-0 left-0 z-50 w-[260px] flex flex-col",
          "bg-sidebar/80 backdrop-blur-xl border-r border-sidebar-border/50",
          "transition-transform duration-300 ease-out",
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Logo */}
        <div className="px-5 py-5 border-b border-sidebar-border/50">
          <Link to="/admin" className="flex items-center gap-3 group">
            <img
              src={kkLogo}
              alt="KKTech"
              className="w-9 h-9 rounded-lg object-contain neon-logo-glow transition-transform duration-200 group-hover:scale-105"
            />
            <div>
              <span className="text-[15px] font-bold text-foreground tracking-tight">KK<span className="neon-text" style={{ fontSize: 'inherit', textShadow: '0 0 8px rgba(57,255,20,0.3)' }}>Tech</span></span>
              <span className="text-[10px] block text-[#39FF14]/70 font-bold uppercase tracking-[0.2em]">Command Center</span>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 pt-4 pb-2 flex flex-col gap-0.5">
          {navItems.map((item) => {
            const active = location.pathname === item.path;
            const badge = badgeMap[item.path] || 0;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "group relative flex items-center gap-3 h-[44px] rounded-lg text-[13px] tracking-wide",
                  "pl-5 pr-3 transition-all duration-200",
                  active
                    ? "bg-secondary/80 text-foreground font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/40 hover:scale-[1.02] active:scale-[0.98]"
                )}
              >
                {active && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-primary shadow-[0_0_8px_hsl(var(--primary)/0.5)]" />
                )}
                <item.icon
                  className={cn(
                    "w-[18px] h-[18px] shrink-0 transition-all duration-200",
                    active ? item.accent : "group-hover:text-foreground"
                  )}
                  strokeWidth={1.5}
                />
                <span className="flex-1 truncate">{item.label}</span>
                {badge > 0 && (
                  <span className="min-w-[22px] h-5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center px-1.5">
                    {badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="mt-auto border-t border-sidebar-border/50 px-3 pt-3 pb-3 space-y-1">
          <Link
            to="/dashboard"
            className="flex items-center gap-3 h-[44px] pl-5 pr-3 rounded-lg text-[13px] tracking-wide text-muted-foreground hover:text-foreground hover:bg-secondary/40 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
          >
            <ArrowLeftRight className="w-[18px] h-[18px] shrink-0" strokeWidth={1.5} />
            Reseller Panel
          </Link>
          <Button
            variant="ghost"
            className="w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/5 h-[44px] pl-5 text-[13px] tracking-wide rounded-lg hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
            onClick={handleLogout}
          >
            <LogOut className="w-[18px] h-[18px] mr-3 shrink-0 text-destructive/60" strokeWidth={1.5} />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Main Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b border-border flex items-center justify-between px-4 lg:px-8 sticky top-0 z-30 bg-card/80 backdrop-blur-xl admin-header">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors">
              <Menu className="w-5 h-5" strokeWidth={1.5} />
            </button>
            <div>
              <h2 className="text-sm font-semibold text-secondary-foreground tracking-wide uppercase">
                {navItems.find((i) => i.path === location.pathname)?.label || "Admin"}
              </h2>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <SoundToggle />
            <ThemeToggle />
            <AdminNotificationBell />
            <span className="admin-badge text-[10px] uppercase tracking-[0.15em] px-3 py-1.5 rounded-lg font-mono font-semibold">
              Admin
            </span>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-8 overflow-y-auto overscroll-contain" style={{ WebkitOverflowScrolling: 'touch' }}>{children}</main>

        <footer className="border-t border-border px-4 lg:px-8 py-4 text-center">
          <Link to="/terms" className="text-xs text-muted-foreground hover:text-foreground transition-colors duration-200">
            Terms and Conditions
          </Link>
        </footer>
      </div>
    </div>
  );
}
