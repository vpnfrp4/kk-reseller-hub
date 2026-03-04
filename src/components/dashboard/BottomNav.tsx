import { useLocation } from "react-router-dom";
import PrefetchLink from "@/components/PrefetchLink";
import { Home, ShoppingCart, Receipt, User } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Home", icon: Home, path: "/dashboard" },
  { label: "Order", icon: ShoppingCart, path: "/dashboard/place-order" },
  { label: "Orders", icon: Receipt, path: "/dashboard/orders" },
  { label: "Account", icon: User, path: "/dashboard/settings" },
];

export default function BottomNav() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 lg:hidden bg-card/90 backdrop-blur-xl border-t border-border/50" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="flex items-stretch justify-around h-14">
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
                "flex flex-col items-center justify-center flex-1 gap-0.5 text-[10px] font-medium transition-all duration-200 active:scale-90 active:opacity-70",
                active
                  ? "text-primary"
                  : "text-muted-foreground"
              )}
            >
              <div className="relative">
                <item.icon
                  className={cn(
                    "w-5 h-5 transition-all duration-200",
                    active && "drop-shadow-[0_0_6px_hsl(var(--primary)/0.5)]"
                  )}
                  strokeWidth={active ? 2 : 1.5}
                />
                {active && (
                  <span className="absolute -top-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
                )}
              </div>
              <span>{item.label}</span>
            </PrefetchLink>
          );
        })}
      </div>
    </nav>
  );
}
