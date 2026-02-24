import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  LayoutDashboard,
  Wallet,
  ShoppingBag,
  ClipboardList,
  Settings,
  LogOut,
  Menu,
  Crown,
  ShieldCheck,
  ArrowLeftRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import NotificationSettings from "@/components/NotificationSettings";
import ThemeToggle from "@/components/ThemeToggle";

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
  { label: "Wallet", icon: Wallet, path: "/dashboard/wallet" },
  { label: "Products", icon: ShoppingBag, path: "/dashboard/products" },
  { label: "Orders", icon: ClipboardList, path: "/dashboard/orders" },
  { label: "Settings", icon: Settings, path: "/dashboard/settings" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const { user, profile, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;
    supabase.rpc("has_role", { _user_id: user.id, _role: "admin" }).then(({ data }) => setIsAdmin(!!data));
  }, [user]);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen flex bg-background">
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-card/60 backdrop-blur-2xl border-r border-border/40 flex flex-col transition-transform duration-300 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Logo */}
        <div className="p-6 border-b border-border/30">
          <Link to="/dashboard" className="flex items-center gap-3 group">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center relative overflow-hidden transition-all duration-300 group-hover:shadow-luxury group-hover:scale-105"
              style={{ background: "var(--gradient-gold)" }}
            >
              <Crown className="w-5 h-5 text-primary-foreground relative z-10 transition-transform duration-300 group-hover:rotate-12" />
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 gold-shimmer-bg" />
            </div>
            <div>
              <span className="text-lg font-bold text-foreground tracking-tight transition-colors duration-300 group-hover:gold-text">KKTech</span>
              <span className="text-[10px] block gold-text font-bold uppercase tracking-[0.2em]">Reseller</span>
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
                <item.icon
                  className={`w-[18px] h-[18px] ${active ? "text-primary" : ""}`}
                  strokeWidth={active ? 2 : 1.5}
                />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-border/30 space-y-0.5">
          {isAdmin && (
            <Link
              to="/admin"
              onClick={() => setSidebarOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-all duration-200"
            >
              <ArrowLeftRight className="w-[18px] h-[18px]" strokeWidth={1.5} />
              Admin Panel
            </Link>
          )}

          <div className="flex items-center gap-3 px-3 py-2 mt-2">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold"
              style={{ background: "var(--gradient-gold)", color: "hsl(var(--primary-foreground))" }}
            >
              {profile?.name?.charAt(0) || "R"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{profile?.name || "Reseller"}</p>
              <p className="text-xs text-muted-foreground truncate">{profile?.email}</p>
            </div>
          </div>

          <Button
            variant="ghost"
            className="w-full justify-start text-muted-foreground hover:text-destructive h-10 px-4"
            onClick={handleLogout}
          >
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
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            >
              <Menu className="w-5 h-5" strokeWidth={1.5} />
            </button>
            <div className="hidden lg:block">
              <h2 className="text-base font-semibold text-foreground leading-tight">
                {navItems.find((i) => i.path === location.pathname)?.label || "Dashboard"}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <NotificationSettings />
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-card/40 backdrop-blur-xl border border-primary/15 shadow-sm" style={{ boxShadow: "0 0 20px hsl(43 76% 47% / 0.08), inset 0 1px 0 hsl(0 0% 100% / 0.04)" }}>
              <Wallet className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold font-mono gold-shimmer">
                {(profile?.balance || 0).toLocaleString()} <span className="text-xs">MMK</span>
              </span>
            </div>
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
