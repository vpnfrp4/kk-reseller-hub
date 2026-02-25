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
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar — dark glass panel */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-[260px] flex flex-col transition-transform duration-300 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
        style={{
          background: "var(--glass-bg)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderRight: "1px solid var(--glass-border)",
        }}
      >
        {/* Logo */}
        <div className="p-6 border-b border-border/20">
          <Link to="/dashboard" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-lg bg-primary/8 flex items-center justify-center border border-primary/15 transition-colors group-hover:bg-primary/12">
              <ShieldCheck className="w-[18px] h-[18px] text-primary" />
            </div>
            <div>
              <span className="text-[15px] font-semibold text-foreground tracking-tight">KKTech</span>
              <span className="text-[9px] block text-muted-foreground font-medium uppercase tracking-[0.15em]">
                {lang === "mm" ? t.nav.reseller.mm : t.nav.reseller.en}
              </span>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-0.5 mt-1">
          {navItems.map((item) => {
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-150 ${
                  active
                    ? "bg-primary/8 text-primary nav-active-indicator"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/20"
                }`}
              >
                <item.icon
                  className={`w-[17px] h-[17px] ${active ? "text-primary" : ""}`}
                  strokeWidth={active ? 1.8 : 1.5}
                />
                <span className="flex-1">{lang === "mm" ? item.mm : item.en}</span>
                {item.en === "Notifications" && unreadCount > 0 && (
                  <span className="ml-auto px-1.5 py-0.5 text-[9px] font-bold rounded-full bg-primary/15 text-primary min-w-[18px] text-center">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-border/15 space-y-0.5">
          {isAdmin && (
            <Link
              to="/admin"
              onClick={() => setSidebarOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-[13px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted/20 transition-colors duration-150"
            >
              <ArrowLeftRight className="w-[17px] h-[17px]" strokeWidth={1.5} />
              <span>{lang === "mm" ? t.nav.adminPanel.mm : t.nav.adminPanel.en}</span>
            </Link>
          )}

          <div className="flex items-center gap-3 px-3 py-2.5 mt-1">
            <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center text-xs font-semibold text-foreground">
              {profile?.name?.charAt(0)?.toUpperCase() || "R"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium text-foreground truncate">{profile?.name || "Reseller"}</p>
              <p className="text-[11px] text-muted-foreground truncate">{profile?.email}</p>
            </div>
          </div>

          <Button
            variant="ghost"
            className="w-full justify-start text-muted-foreground hover:text-destructive h-9 px-4 text-[13px]"
            onClick={handleLogout}
          >
            <LogOut className="w-[17px] h-[17px] mr-3" strokeWidth={1.5} />
            <span>{lang === "mm" ? t.nav.signOut.mm : t.nav.signOut.en}</span>
          </Button>
        </div>
      </aside>

      {/* Main Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header — subtle blur, minimal */}
        <header
          className="h-13 border-b flex items-center justify-between px-4 lg:px-8 sticky top-0 z-30"
          style={{
            background: "var(--glass-bg)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            borderColor: "var(--glass-border)",
            boxShadow: "var(--shadow-header)",
          }}
        >
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/20 transition-colors"
            >
              <Menu className="w-5 h-5" strokeWidth={1.5} />
            </button>
            <div className="hidden lg:block">
              <h2 className="text-[13px] font-semibold text-foreground/80 tracking-wide uppercase">
                {lang === "mm"
                  ? navItems.find((i) => i.path === location.pathname)?.mm
                  : navItems.find((i) => i.path === location.pathname)?.en
                  || "Dashboard"}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Language Toggle */}
            <button
              onClick={toggleLang}
              className="flex items-center h-7 rounded-md border border-border/60 bg-muted/20 text-[10px] font-semibold uppercase tracking-wider overflow-hidden"
            >
              <span className={`px-2 py-1 transition-colors ${lang === "en" ? "bg-primary/15 text-primary" : "text-muted-foreground"}`}>
                EN
              </span>
              <span className={`px-2 py-1 transition-colors ${lang === "mm" ? "bg-primary/15 text-primary" : "text-muted-foreground"}`}>
                MM
              </span>
            </button>

            <NotificationSettings />
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/30 border border-border/40">
              <Wallet className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-[13px] font-semibold font-mono text-foreground tabular-nums">
                {(profile?.balance || 0).toLocaleString()}
              </span>
              <span className="text-[10px] text-muted-foreground font-medium">MMK</span>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-8 overflow-auto">{children}</main>

        <footer className="border-t border-border/15 px-4 lg:px-8 py-3 text-center">
          <Link to="/terms" className="text-[11px] text-muted-foreground/50 hover:text-muted-foreground transition-colors">
            {lang === "mm" ? t.common.termsAndConditions.mm : t.common.termsAndConditions.en}
          </Link>
        </footer>
      </div>
    </div>
  );
}
