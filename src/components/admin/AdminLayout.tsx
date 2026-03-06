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
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
  const [sidebarOpen, setSidebarOpen] = useState(false);
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
    const checkAdmin = async () => {
      const { data } = await supabase.rpc("has_role", {
        _user_id: user.id,
        _role: "admin",
      });
      setIsAdmin(!!data);
    };
    checkAdmin();
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

  const currentPage = allNavItems.find((i) => i.path === location.pathname)?.label || "Admin";

  return (
    <div className="min-h-[100dvh] lg:h-screen flex flex-col lg:flex-row bg-background lg:overflow-hidden">
      {/* Mobile overlay */}
      <div
        className={cn(
          "fixed inset-0 bg-background/60 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300",
          sidebarOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={() => setSidebarOpen(false)}
      />

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed lg:static inset-y-0 left-0 z-50 w-[248px] flex flex-col",
          "bg-card border-r border-border",
          "transition-transform duration-300 ease-out",
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Logo */}
        <div className="px-5 py-4 border-b border-border">
          <Link to="/admin" className="flex items-center gap-3 group">
            <img
              src={kkLogo}
              alt="KKTech"
              className="w-8 h-8 rounded-lg object-contain transition-transform duration-200 group-hover:scale-105"
            />
            <div>
              <span className="text-sm font-bold text-foreground tracking-tight">KKTech</span>
              <span className="text-[10px] block text-primary font-semibold uppercase tracking-[0.15em]">Admin Panel</span>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 pt-3 pb-2 overflow-y-auto space-y-4">
          {navSections.map((section) => (
            <div key={section.label}>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.12em] px-3 mb-1">
                {section.label}
              </p>
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const active = location.pathname === item.path;
                  const badge = badgeMap[item.path] || 0;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setSidebarOpen(false)}
                      className={cn(
                        "group relative flex items-center gap-3 h-9 rounded-lg text-[13px]",
                        "pl-3 pr-3 transition-all duration-150",
                        active
                          ? "bg-primary/10 text-primary font-semibold"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                      )}
                    >
                      {active && (
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 rounded-r-full bg-primary" />
                      )}
                      <item.icon className={cn("w-4 h-4 shrink-0", active ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} strokeWidth={1.5} />
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
        </nav>

        {/* Footer */}
        <div className="border-t border-border px-3 py-2 space-y-0.5">
          <Link
            to="/dashboard"
            className="flex items-center gap-3 h-9 pl-3 pr-3 rounded-lg text-[13px] text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all duration-150"
          >
            <ArrowLeftRight className="w-4 h-4 shrink-0" strokeWidth={1.5} />
            Reseller Panel
          </Link>
          <Button
            variant="ghost"
            className="w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/5 h-9 pl-3 text-[13px] rounded-lg"
            onClick={handleLogout}
          >
            <LogOut className="w-4 h-4 mr-3 shrink-0 text-destructive/60" strokeWidth={1.5} />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Main Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        <header className="h-14 border-b border-border flex items-center justify-between px-4 lg:px-6 sticky top-0 z-30 bg-card/95 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
              <Menu className="w-5 h-5" strokeWidth={1.5} />
            </button>
            <h2 className="text-sm font-semibold text-foreground">{currentPage}</h2>
          </div>
          <div className="flex items-center gap-2">
            <SoundToggle />
            <ThemeToggle />
            <AdminNotificationBell />
            <span className="text-[10px] uppercase tracking-[0.1em] px-2.5 py-1 rounded-full font-semibold bg-primary/10 text-primary border border-primary/20">
              Admin
            </span>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-6 overflow-y-auto" data-scroll-area style={{ WebkitOverflowScrolling: 'touch' as any }}>{children}</main>

        <footer className="border-t border-border px-4 lg:px-6 py-3 text-center">
          <Link to="/terms" className="text-xs text-muted-foreground hover:text-foreground transition-colors duration-200">
            Terms and Conditions
          </Link>
        </footer>
      </div>
    </div>
  );
}
