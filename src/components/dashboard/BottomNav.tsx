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
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-50 bg-card pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-end justify-around px-3 pt-2 pb-2 max-w-md mx-auto">
        {navItems.map((item) => {
          const active = isActive(item.path);
          const Icon = item.icon;

          if (item.center) {
            return (
              <PrefetchLink
                key={item.path}
                to={item.path}
                className="relative -mt-6 flex flex-col items-center"
              >
                <div
                  className={cn(
                    "w-[52px] h-[52px] rounded-full flex items-center justify-center transition-all duration-200",
                    "bg-foreground text-background",
                    active && "scale-110"
                  )}
                  style={{ boxShadow: "0 4px 20px hsl(var(--foreground) / 0.2)" }}
                >
                  <Icon className="w-5 h-5" strokeWidth={1.8} />
                </div>
              </PrefetchLink>
            );
          }

          return (
            <PrefetchLink
              key={item.path}
              to={item.path}
              className={cn(
                "flex flex-col items-center gap-0.5 py-1 px-3 min-w-[48px] transition-colors duration-200",
                active ? "text-foreground" : "text-muted-foreground/60"
              )}
            >
              <Icon className="w-[22px] h-[22px]" strokeWidth={active ? 1.8 : 1.3} />
              <span className={cn("text-[10px]", active ? "font-semibold" : "font-normal")}>
                {item.label}
              </span>
            </PrefetchLink>
          );
        })}
      </div>
    </nav>
  );
}
