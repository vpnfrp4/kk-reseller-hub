import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { Navigate, Link, useLocation, useNavigate } from "react-router-dom";
import {
  ShieldCheck,
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
  Smartphone,
  Database,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import AdminNotificationBell from "@/components/admin/AdminNotificationBell";
import ThemeToggle from "@/components/ThemeToggle";
import { toast } from "sonner";
import { notifyEvent } from "@/lib/notifications";

const navItems = [
  { label: "Overview", icon: LayoutDashboard, path: "/admin" },
  { label: "Products", icon: Package, path: "/admin/products" },
  { label: "Providers", icon: Database, path: "/admin/providers" },
  { label: "Credentials", icon: KeyRound, path: "/admin/credentials" },
  { label: "Top-ups", icon: Wallet, path: "/admin/topups" },
  { label: "Orders", icon: ShoppingCart, path: "/admin/orders" },
  { label: "Resellers", icon: Users, path: "/admin/resellers" },
  { label: "Settings", icon: Settings, path: "/admin/settings" },
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
    <div className="admin-theme min-h-screen flex bg-background">
      {/* Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-background/80 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar — solid dark panel */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-sidebar border-r border-border flex flex-col transition-transform duration-300 ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
        {/* Logo */}
        <div className="p-6 border-b border-border">
          <Link to="/admin" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20 transition-all duration-300 group-hover:bg-primary/15">
              <ShieldCheck className="w-5 h-5 text-primary relative z-10" />
            </div>
            <div>
              <span className="text-base font-bold text-foreground tracking-tight">KKTech</span>
              <span className="text-[10px] block text-primary font-bold uppercase tracking-[0.2em]">Command Center</span>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1 mt-2">
          {navItems.map((item) => {
            const active = location.pathname === item.path;
            const badge = badgeMap[item.path] || 0;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                  active
                    ? "bg-primary/10 text-primary nav-active-indicator"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                }`}
              >
                <item.icon className={`w-[18px] h-[18px] ${active ? "text-primary" : ""}`} strokeWidth={active ? 2 : 1.5} />
                <span className="flex-1">{item.label}</span>
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
        <div className="p-3 border-t border-border space-y-1">
          <Link
            to="/dashboard"
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-all duration-200"
          >
            <ArrowLeftRight className="w-[18px] h-[18px]" strokeWidth={1.5} />
            Reseller Panel
          </Link>
          <Button variant="ghost" className="w-full justify-start text-muted-foreground hover:text-destructive h-10 px-4" onClick={handleLogout}>
            <LogOut className="w-[18px] h-[18px] mr-3" strokeWidth={1.5} />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Main Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-14 border-b border-border flex items-center justify-between px-4 lg:px-8 bg-card sticky top-0 z-30 admin-header">
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
            <ThemeToggle />
            <AdminNotificationBell />
            <span className="admin-badge text-[10px] uppercase tracking-[0.15em] px-3 py-1.5 rounded-lg font-mono font-semibold">
              Admin
            </span>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-8 overflow-auto">{children}</main>

        <footer className="border-t border-border px-4 lg:px-8 py-4 text-center">
          <Link to="/terms" className="text-xs text-muted-foreground hover:text-foreground transition-colors duration-200">
            Terms and Conditions
          </Link>
        </footer>
      </div>
    </div>
  );
}
