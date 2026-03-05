import { useLocation } from "react-router-dom";
import PrefetchLink from "@/components/PrefetchLink";
import { Home, ShoppingCart, Receipt, Wallet, User } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Home", icon: Home, path: "/dashboard" },
  { label: "Order", icon: ShoppingCart, path: "/dashboard/place-order" },
  { label: "Orders", icon: Receipt, path: "/dashboard/orders" },
  { label: "Wallet", icon: Wallet, path: "/dashboard/wallet" },
  { label: "Account", icon: User, path: "/dashboard/settings" },
];

export default function BottomNav() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 lg:hidden border-t border-border/40 pb-safe"
      style={{
        background: 'hsl(var(--card) / 0.92)',
        backdropFilter: 'blur(24px) saturate(1.8)',
        WebkitBackdropFilter: 'blur(24px) saturate(1.8)',
      }}
    >
      <div className="flex items-stretch justify-around h-16">
        {navItems.map((item) => {
          const active =
            item.path === "/dashboard"
              ? location.pathname === "/dashboard"
              : location.pathname.startsWith(item.path);

          return (
            <PrefetchLink
              key={item.path}
              to={item.path}
              className={cn(
                "flex flex-col items-center justify-center flex-1 gap-1 text-[11px] font-semibold transition-all duration-200",
                "active:scale-90 active:opacity-70 min-h-[48px]",
                active ? "text-primary" : "text-muted-foreground"
              )}
            >
              <div className="relative">
                {active && (
                  <span
                    className="absolute -top-2 left-1/2 -translate-x-1/2 w-6 h-[3px] rounded-full"
                    style={{
                      background: 'linear-gradient(90deg, hsl(217 91% 60%), hsl(250 70% 60%))',
                      boxShadow: '0 2px 8px hsl(217 91% 60% / 0.4)',
                    }}
                  />
                )}
                <div className={cn(
                  "w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-200",
                  active
                    ? "bg-primary/10 shadow-[0_0_12px_hsl(var(--primary)/0.15)]"
                    : ""
                )}>
                  <item.icon
                    className={cn("w-5 h-5 transition-all duration-200")}
                    strokeWidth={active ? 2.2 : 1.5}
                  />
                </div>
              </div>
              <span className={cn(active ? "font-bold" : "font-medium")}>{item.label}</span>
            </PrefetchLink>
          );
        })}
      </div>
    </nav>
  );
}
