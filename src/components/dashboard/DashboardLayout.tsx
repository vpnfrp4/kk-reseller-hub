import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import PageTransition from "@/components/dashboard/PageTransition";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

import {
  Home,
  ShoppingCart,
  Receipt,
  User,
  LogOut,
  Menu,
  ArrowLeftRight,
  Settings2,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import CurrencyToggle from "@/components/shared/CurrencyToggle";
import { useCurrency } from "@/contexts/CurrencyContext";
import { t } from "@/lib/i18n";
import { useLang } from "@/contexts/LangContext";
import { cn } from "@/lib/utils";
import kkLogo from "@/assets/kkremote-logo.png";

/* ── S-Tool Pro style nav items ── */
const navItems = [
  { label: "Home", icon: Home, path: "/dashboard" },
  { label: "Place Order", icon: ShoppingCart, path: "/dashboard/place-order" },
  { label: "Top Up", icon: Wallet, path: "/dashboard/wallet" },
  { label: "Orders", icon: Receipt, path: "/dashboard/orders" },
  { label: "Account", icon: User, path: "/dashboard/settings" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const { user, profile, logout } = useAuth();
  const { lang, toggle: toggleLang } = useLang();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const handler = () => navigate("/dashboard/wallet");
    window.addEventListener("open-topup-dialog", handler);
    return () => window.removeEventListener("open-topup-dialog", handler);
  }, [navigate]);

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
      {/* Mobile overlay */}
      <div
        className={cn(
          "fixed inset-0 bg-background/60 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300",
          sidebarOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={() => setSidebarOpen(false)}
      />

      {/* ═══ Sidebar — S-Tool Pro Style ═══ */}
      <aside
        className={cn(
          "fixed lg:static inset-y-0 left-0 z-50 w-[240px] flex flex-col",
          "bg-sidebar border-r border-sidebar-border",
          "transition-transform duration-300 ease-out",
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Logo */}
        <div className="px-5 py-5 border-b border-sidebar-border">
          <Link to="/dashboard" className="flex items-center gap-3 group">
            <img
              src={kkLogo}
              alt="KKTech"
              className="w-8 h-8 rounded-lg object-contain transition-transform duration-200 group-hover:scale-105"
            />
            <div>
              <span className="text-[15px] font-bold text-foreground tracking-tight">
                KK<span className="text-primary">Tech</span>
              </span>
              <span className="text-[10px] block text-muted-foreground font-semibold uppercase tracking-[0.15em]">
                Reseller Hub
              </span>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 pt-4 pb-2 flex flex-col gap-1">
          {navItems.map((item) => {
            const active = location.pathname === item.path ||
              (item.path === "/dashboard" && location.pathname === "/dashboard") ||
              (item.path !== "/dashboard" && location.pathname.startsWith(item.path));
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "group relative flex items-center gap-3 h-[42px] rounded-lg text-[13px]",
                  "pl-4 pr-3 transition-all duration-200",
                  active
                    ? "bg-primary/10 text-primary font-semibold"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                )}
              >
                {active && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-primary" />
                )}
                <item.icon
                  className={cn(
                    "w-[18px] h-[18px] shrink-0",
                    active ? "text-primary" : "group-hover:text-foreground"
                  )}
                  strokeWidth={1.5}
                />
                <span className="flex-1 truncate">{item.label}</span>
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
              className="flex items-center gap-3 h-[42px] pl-4 pr-3 rounded-lg text-[13px] text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-all duration-200"
            >
              <ArrowLeftRight className="w-[18px] h-[18px] shrink-0" strokeWidth={1.5} />
              <span>Admin Panel</span>
            </Link>
          )}

          <div className="flex items-center gap-3 px-4 py-3">
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
            className="w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/5 h-[42px] pl-4 text-[13px] rounded-lg transition-all duration-200"
            onClick={handleLogout}
          >
            <LogOut className="w-[18px] h-[18px] mr-3 shrink-0 text-destructive/60" strokeWidth={1.5} />
            <span>Sign Out</span>
          </Button>
        </div>
      </aside>

      {/* Main Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b border-border/50 flex items-center justify-between px-3 lg:px-8 sticky top-0 z-30 bg-card/80 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
            >
              <Menu className="w-5 h-5" strokeWidth={1.5} />
            </button>
            <div className="hidden lg:block">
              <h2 className="text-sm font-semibold text-foreground tracking-wide">
                {navItems.find((i) => location.pathname.startsWith(i.path) && i.path !== "/dashboard")?.label
                  || (location.pathname === "/dashboard" ? "Home" : "Dashboard")}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Language toggle */}
            <button
              onClick={toggleLang}
              className="flex items-center h-8 rounded-lg border border-border bg-secondary text-[11px] font-bold uppercase tracking-wider overflow-hidden transition-all duration-200"
            >
              <span className={cn("px-2.5 py-1.5 transition-all duration-300", lang === "en" ? "bg-primary/15 text-primary" : "text-muted-foreground")}>
                EN
              </span>
              <span className={cn("px-2.5 py-1.5 transition-all duration-300", lang === "mm" ? "bg-primary/15 text-primary" : "text-muted-foreground")}>
                MM
              </span>
            </button>

            <CurrencyToggle />

            <WalletChip profile={profile} />

            <button
              onClick={() => navigate("/dashboard/settings")}
              className="p-2 rounded-lg border border-border bg-secondary text-muted-foreground hover:text-foreground transition-colors"
            >
              <Settings2 className="w-4 h-4" />
            </button>
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
            Terms & Conditions
          </Link>
        </footer>
      </div>

    </div>
  );
}

function WalletChip({ profile }: { profile: any }) {
  const { currency, convert } = useCurrency();
  const balance = profile?.balance || 0;
  const displayBalance = convert(balance);

  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl bg-secondary border border-border">
      <Wallet className="w-4 h-4 text-muted-foreground" />
      <span className="text-sm font-bold font-mono text-foreground tabular-nums">
        {currency === "USD"
          ? displayBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
          : displayBalance.toLocaleString()
        }
      </span>
      <span className="text-xs text-muted-foreground font-semibold hidden sm:inline">{currency}</span>
      <button
        onClick={() => window.dispatchEvent(new CustomEvent("open-topup-dialog"))}
        className="ml-0.5 w-6 h-6 rounded-md bg-primary/10 hover:bg-primary/20 flex items-center justify-center transition-colors"
        title="Quick Top-up"
      >
        <span className="text-primary text-sm font-bold leading-none">+</span>
      </button>
    </div>
  );
}
