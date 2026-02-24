import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import NotificationSettings from "@/components/NotificationSettings";
import ThemeToggle from "@/components/ThemeToggle";
import { toast } from "sonner";
import { notifyEvent } from "@/lib/notifications";

const navItems = [
  { label: "Overview", icon: LayoutDashboard, path: "/admin" },
  { label: "Products", icon: Package, path: "/admin/products" },
  { label: "Credentials", icon: KeyRound, path: "/admin/credentials" },
  { label: "Top-ups", icon: Wallet, path: "/admin/topups" },
  { label: "Orders", icon: ShoppingCart, path: "/admin/orders" },
  { label: "Resellers", icon: Users, path: "/admin/resellers" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

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

  return (
    <div className="min-h-screen flex bg-background">
      {/* Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-card/60 backdrop-blur-2xl border-r border-border/40 flex flex-col transition-transform duration-300 ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
        {/* Logo */}
        <div className="p-6 border-b border-border/30">
          <Link to="/admin" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center relative overflow-hidden" style={{ background: 'var(--gradient-gold)' }}>
              <ShieldCheck className="w-5 h-5 text-primary-foreground relative z-10" />
            </div>
            <div>
              <span className="text-lg font-bold text-foreground tracking-tight">KKTech</span>
              <span className="text-[10px] block gold-text font-bold uppercase tracking-[0.2em]">Admin Panel</span>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-0.5 mt-2">
          {navItems.map((item) => {
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  active
                    ? "bg-primary/10 text-primary nav-active-indicator"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                }`}
              >
                <item.icon className={`w-[18px] h-[18px] ${active ? "text-primary" : ""}`} strokeWidth={active ? 2 : 1.5} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-border/30 space-y-0.5">
          <Link
            to="/dashboard"
            className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-all duration-200"
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
        <header className="h-16 border-b border-border/30 flex items-center justify-between px-4 lg:px-8 bg-card/40 backdrop-blur-2xl sticky top-0 z-30 admin-header">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
              <Menu className="w-5 h-5" strokeWidth={1.5} />
            </button>
            <div>
              <h2 className="text-base font-semibold text-foreground leading-tight">
                {navItems.find((i) => i.path === location.pathname)?.label || "Admin"}
              </h2>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <NotificationSettings />
            <span className="admin-badge text-[10px] uppercase tracking-[0.15em] px-3 py-1.5 rounded-full">
              Admin
            </span>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-8 overflow-auto">{children}</main>

        <footer className="border-t border-border/30 px-4 lg:px-8 py-3 text-center">
          <Link to="/terms" className="text-xs text-muted-foreground hover:text-primary transition-colors duration-200">
            Terms and Conditions
          </Link>
        </footer>
      </div>
    </div>
  );
}
