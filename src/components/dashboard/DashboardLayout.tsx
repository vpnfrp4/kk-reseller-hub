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
  Zap,
  ShieldCheck,
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

      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-card border-r border-border flex flex-col transition-transform duration-300 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="p-6 border-b border-border">
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
              <Zap className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <span className="text-lg font-bold text-foreground tracking-tight">KKTech</span>
              <span className="text-xs block text-muted-foreground -mt-1">Reseller Panel</span>
            </div>
          </Link>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
                {active && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary animate-pulse-glow" />
                )}
              </Link>
            );
          })}
        </nav>

        {isAdmin && (
          <div className="px-4 pb-2">
            <Link
              to="/admin"
              onClick={() => setSidebarOpen(false)}
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-destructive bg-destructive/10 hover:bg-destructive/20 transition-colors"
            >
              <ShieldCheck className="w-5 h-5" />
              Admin Panel
            </Link>
          </div>
        )}

        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-3 px-3 py-2 mb-2">
            <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-primary font-semibold text-sm">
              {profile?.name?.charAt(0) || "R"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{profile?.name || "Reseller"}</p>
              <p className="text-xs text-muted-foreground truncate">{profile?.email}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            className="w-full justify-start text-muted-foreground hover:text-destructive"
            onClick={handleLogout}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-border flex items-center justify-between px-4 lg:px-8 bg-card/50 backdrop-blur-sm sticky top-0 z-30">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="hidden lg:block">
            <h2 className="text-lg font-semibold text-foreground">
              {navItems.find((i) => i.path === location.pathname)?.label || "Dashboard"}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <NotificationSettings />
            <div className="stat-card !p-2 !px-4 flex items-center gap-2">
              <Wallet className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold font-mono text-foreground">
                {(profile?.balance || 0).toLocaleString()} <span className="text-xs text-muted-foreground">MMK</span>
              </span>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-8 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
