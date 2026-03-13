import { useLocation } from "react-router-dom";
import PrefetchLink from "@/components/PrefetchLink";
import { Home, ShoppingCart, Receipt, Wallet, User } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Home", icon: Home, path: "/dashboard" },
  { label: "Orders", icon: Receipt, path: "/dashboard/orders" },
  { label: "Order", icon: ShoppingCart, path: "/dashboard/place-order", center: true },
  { label: "Wallet", icon: Wallet, path: "/dashboard/wallet" },
  { label: "Account", icon: User, path: "/dashboard/settings" },
];

export default function BottomNav() {
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === "/dashboard") return location.pathname === "/dashboard";
    return location.pathname.startsWith(path);
  };

  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-50 border-t border-border/30 bg-card/95 backdrop-blur-xl pb-[env(safe-area-inset-bottom)]"
      style={{ boxShadow: "0 -2px 20px rgba(0,0,0,0.06)" }}
    >
      <div className="flex items-end justify-around px-2 pt-1.5 pb-1.5 max-w-md mx-auto relative">
        {navItems.map((item) => {
          const active = isActive(item.path);
          const Icon = item.icon;

          if (item.center) {
            return (
              <PrefetchLink
                key={item.path}
                to={item.path}
                className="relative -mt-5 flex flex-col items-center"
              >
                <div className={cn(
                  "w-14 h-14 rounded-full flex items-center justify-center shadow-xl transition-all duration-200",
                  "bg-primary text-primary-foreground",
                  active && "ring-4 ring-primary/20 scale-105"
                )}
                  style={{ boxShadow: "0 6px 24px hsl(var(--primary) / 0.35)" }}
                >
                  <Icon className="w-6 h-6" strokeWidth={1.8} />
                </div>
              </PrefetchLink>
            );
          }

          return (
            <PrefetchLink
              key={item.path}
              to={item.path}
              className={cn(
                "flex flex-col items-center gap-0.5 py-1.5 px-2 min-w-[52px] transition-colors duration-200",
                active ? "text-primary" : "text-muted-foreground"
              )}
            >
              <Icon className="w-5 h-5" strokeWidth={active ? 2 : 1.5} />
              <span className={cn("text-[10px] font-semibold", active && "font-bold")}>
                {item.label}
              </span>
            </PrefetchLink>
          );
        })}
      </div>
    </nav>
  );
}
