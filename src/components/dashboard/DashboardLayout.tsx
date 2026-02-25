import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
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
  ShieldCheck,
  ArrowLeftRight,
  Bell,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import ThemeToggle from "@/components/ThemeToggle";
import NotificationSettings from "@/components/NotificationSettings";
import { t } from "@/lib/i18n";
import { useLang } from "@/contexts/LangContext";

const navItems = [
  { mm: t.nav.dashboard.mm, en: t.nav.dashboard.en, icon: LayoutDashboard, path: "/dashboard" },
  { mm: t.nav.wallet.mm, en: t.nav.wallet.en, icon: Wallet, path: "/dashboard/wallet" },
  { mm: t.nav.products.mm, en: t.nav.products.en, icon: ShoppingBag, path: "/dashboard/products" },
  { mm: t.nav.orders.mm, en: t.nav.orders.en, icon: ClipboardList, path: "/dashboard/orders" },
  { mm: t.nav.notifications.mm, en: t.nav.notifications.en, icon: Bell, path: "/dashboard/notifications" },
  { mm: t.nav.settings.mm, en: t.nav.settings.en, icon: Settings, path: "/dashboard/settings" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const { user, profile, logout } = useAuth();
  const { lang, toggle: toggleLang } = useLang();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;
    supabase.rpc("has_role", { _user_id: user.id, _role: "admin" }).then(({ data }) => setIsAdmin(!!data));
  }, [user]);

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ["notifications-unread-count"],
    queryFn: async () => {
      const { count } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("is_read", false);
      return count || 0;
    },
    enabled: !!user,
    refetchInterval: 30000,
  });

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen flex bg-background">
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-background/80 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar — solid dark panel */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-[260px] flex flex-col bg-sidebar border-r border-border transition-transform duration-300 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Logo */}
        <div className="p-6 border-b border-border">
          <Link to="/dashboard" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20 transition-colors group-hover:bg-primary/15">
              <ShieldCheck className="w-5 h-5 text-primary" />
            </div>
            <div>
              <span className="text-base font-bold text-foreground tracking-tight">KKTech</span>
              <span className="text-[10px] block text-muted-foreground font-semibold uppercase tracking-[0.15em]">
                {lang === "mm" ? t.nav.reseller.mm : t.nav.reseller.en}
              </span>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1 mt-2">
          {navItems.map((item) => {
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-150 ${
                  active
                    ? "bg-primary/10 text-primary nav-active-indicator"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                }`}
              >
                <item.icon
                  className={`w-[18px] h-[18px] ${active ? "text-primary" : ""}`}
                  strokeWidth={active ? 2 : 1.5}
                />
                <span className="flex-1">{lang === "mm" ? item.mm : item.en}</span>
                {item.en === "Notifications" && unreadCount > 0 && (
                  <span className="ml-auto px-2 py-0.5 text-[10px] font-bold rounded-full bg-primary/15 text-primary min-w-[20px] text-center">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-border space-y-1">
          {isAdmin && (
            <Link
              to="/admin"
              onClick={() => setSidebarOpen(false)}
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors duration-150"
            >
              <ArrowLeftRight className="w-[18px] h-[18px]" strokeWidth={1.5} />
              <span>{lang === "mm" ? t.nav.adminPanel.mm : t.nav.adminPanel.en}</span>
            </Link>
          )}

          <div className="flex items-center gap-3 px-3 py-3 mt-1">
            <div className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center text-sm font-bold text-foreground">
              {profile?.name?.charAt(0)?.toUpperCase() || "R"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{profile?.name || "Reseller"}</p>
              <p className="text-xs text-muted-foreground truncate">{profile?.email}</p>
            </div>
          </div>

          <Button
            variant="ghost"
            className="w-full justify-start text-muted-foreground hover:text-destructive h-10 px-4 text-sm"
            onClick={handleLogout}
          >
            <LogOut className="w-[18px] h-[18px] mr-3" strokeWidth={1.5} />
            <span>{lang === "mm" ? t.nav.signOut.mm : t.nav.signOut.en}</span>
          </Button>
        </div>
      </aside>

      {/* Main Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header — solid surface */}
        <header className="h-14 border-b border-border flex items-center justify-between px-4 lg:px-8 sticky top-0 z-30 bg-card">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
            >
              <Menu className="w-5 h-5" strokeWidth={1.5} />
            </button>
            <div className="hidden lg:block">
              <h2 className="text-sm font-semibold text-secondary-foreground tracking-wide uppercase">
                {lang === "mm"
                  ? navItems.find((i) => i.path === location.pathname)?.mm
                  : navItems.find((i) => i.path === location.pathname)?.en
                  || "Dashboard"}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Language Toggle */}
            <button
              onClick={toggleLang}
              className="flex items-center h-8 rounded-lg border border-border bg-secondary text-xs font-semibold uppercase tracking-wider overflow-hidden"
            >
              <span className={`px-2.5 py-1.5 transition-colors ${lang === "en" ? "bg-primary/15 text-primary" : "text-muted-foreground"}`}>
                EN
              </span>
              <span className={`px-2.5 py-1.5 transition-colors ${lang === "mm" ? "bg-primary/15 text-primary" : "text-muted-foreground"}`}>
                MM
              </span>
            </button>

            <ThemeToggle />
            <NotificationSettings />
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-secondary border border-border">
              <Wallet className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-bold font-mono text-foreground tabular-nums">
                {(profile?.balance || 0).toLocaleString()}
              </span>
              <span className="text-xs text-muted-foreground font-semibold">MMK</span>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-8 overflow-auto">{children}</main>

        <footer className="border-t border-border px-4 lg:px-8 py-4 text-center">
          <Link to="/terms" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
            {lang === "mm" ? t.common.termsAndConditions.mm : t.common.termsAndConditions.en}
          </Link>
        </footer>
      </div>
    </div>
  );
}
