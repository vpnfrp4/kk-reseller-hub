import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import PageTransition from "@/components/dashboard/PageTransition";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import TopUpDialog from "@/components/wallet/TopUpDialog";
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
import SoundToggle from "@/components/shared/SoundToggle";
import NotificationSettings from "@/components/NotificationSettings";
import NotificationDropdown from "@/components/dashboard/NotificationDropdown";
import { t } from "@/lib/i18n";
import { useLang } from "@/contexts/LangContext";
import { cn } from "@/lib/utils";

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
  const [quickTopUpOpen, setQuickTopUpOpen] = useState(false);
  const { user, profile, logout } = useAuth();
  const { lang, toggle: toggleLang } = useLang();
  const location = useLocation();
  const navigate = useNavigate();

  // Listen for quick top-up event from header button
  useEffect(() => {
    const handler = () => setQuickTopUpOpen(true);
    window.addEventListener("open-topup-dialog", handler);
    return () => window.removeEventListener("open-topup-dialog", handler);
  }, []);

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
          "bg-sidebar border-r border-sidebar-border",
          "transition-transform duration-300 ease-out",
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Logo */}
        <div className="px-5 py-5 border-b border-sidebar-border">
          <Link to="/dashboard" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20 transition-all duration-200 group-hover:bg-primary/15 group-hover:shadow-[0_0_12px_rgba(212,175,55,0.15)]">
              <ShieldCheck className="w-[18px] h-[18px] text-primary" />
            </div>
            <div>
              <span className="text-[15px] font-bold text-foreground tracking-tight">KK<span className="gold-shimmer">Tech</span></span>
              <span className="text-[10px] block text-muted-foreground font-semibold uppercase tracking-[0.15em]">
                {lang === "mm" ? t.nav.reseller.mm : t.nav.reseller.en}
              </span>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 pt-4 pb-2 flex flex-col gap-1">
          {navItems.map((item) => {
            const active = location.pathname === item.path;
            const isNotif = item.en === "Notifications";
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "relative flex items-center gap-3 h-[44px] rounded-lg text-sm transition-all duration-200",
                  "pl-5 pr-3",
                  active
                    ? "bg-secondary text-foreground font-semibold"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                )}
              >
                {/* Active left accent bar */}
                {active && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-primary" />
                )}
                <item.icon
                  className={cn(
                    "w-[18px] h-[18px] shrink-0 transition-colors duration-200",
                    active ? "text-primary" : ""
                  )}
                  strokeWidth={active ? 2 : 1.5}
                />
                <span className="flex-1 truncate">{lang === "mm" ? item.mm : item.en}</span>
                {isNotif && unreadCount > 0 && (
                  <span className="ml-auto px-2 py-0.5 text-[10px] font-bold rounded-full bg-primary/15 text-primary min-w-[20px] text-center">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="mt-auto border-t border-sidebar-border px-3 pt-3 pb-3 space-y-1">
          {isAdmin && (
            <Link
              to="/admin"
              onClick={() => setSidebarOpen(false)}
              className="flex items-center gap-3 h-[44px] pl-5 pr-3 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-all duration-200"
            >
              <ArrowLeftRight className="w-[18px] h-[18px] shrink-0" strokeWidth={1.5} />
              <span>{lang === "mm" ? t.nav.adminPanel.mm : t.nav.adminPanel.en}</span>
            </Link>
          )}

          <div className="flex items-center gap-3 px-5 py-3">
            <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center text-xs font-bold text-foreground shrink-0 overflow-hidden">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                profile?.name?.charAt(0)?.toUpperCase() || "R"
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-foreground truncate leading-tight">{profile?.name || "Reseller"}</p>
              <p className="text-[11px] text-muted-foreground truncate leading-tight mt-0.5">{profile?.email}</p>
            </div>
          </div>

          <Button
            variant="ghost"
            className="w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/5 h-[44px] pl-5 text-sm rounded-lg"
            onClick={handleLogout}
          >
            <LogOut className="w-[18px] h-[18px] mr-3 shrink-0" strokeWidth={1.5} />
            <span>{lang === "mm" ? t.nav.signOut.mm : t.nav.signOut.en}</span>
          </Button>
        </div>
      </aside>

      {/* Main Area */}
      <div className="flex-1 flex flex-col min-w-0">
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

            <SoundToggle />
            <ThemeToggle />
            <NotificationDropdown />
            <NotificationSettings />
            <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-secondary border border-border">
              <Wallet className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-bold font-mono text-foreground tabular-nums">
                {(profile?.balance || 0).toLocaleString()}
              </span>
              <span className="text-xs text-muted-foreground font-semibold">MMK</span>
              <button
                onClick={() => {
                  // Dispatch custom event to open top-up dialog
                  window.dispatchEvent(new CustomEvent("open-topup-dialog"));
                }}
                className="ml-0.5 w-6 h-6 rounded-md bg-primary/10 hover:bg-primary/20 flex items-center justify-center transition-colors"
                title="Quick Top-up"
              >
                <span className="text-primary text-sm font-bold leading-none">+</span>
              </button>
            </div>
            <div className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl bg-secondary border border-border">
              <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center text-xs font-bold text-foreground shrink-0 overflow-hidden">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span>{profile?.name?.charAt(0)?.toUpperCase() || "R"}</span>
                )}
              </div>
              <span className="text-sm font-semibold text-foreground hidden sm:inline truncate max-w-[100px]">
                {profile?.name?.split(" ")[0] || "Reseller"}
              </span>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-8 overflow-auto">
          <AnimatePresence mode="wait">
            <PageTransition key={location.pathname}>
              {children}
            </PageTransition>
          </AnimatePresence>
        </main>

        <footer className="border-t border-border px-4 lg:px-8 py-4 text-center">
          <Link to="/terms" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
            {lang === "mm" ? t.common.termsAndConditions.mm : t.common.termsAndConditions.en}
          </Link>
        </footer>
      </div>

      {/* Quick Top-up Dialog */}
      <TopUpDialog
        userId={profile?.user_id}
        open={quickTopUpOpen}
        onOpenChange={setQuickTopUpOpen}
        hideTrigger
        onSubmitted={(id) => {
          setQuickTopUpOpen(false);
          navigate(`/dashboard/wallet/topup-status?id=${id}`);
        }}
      />
    </div>
  );
}
