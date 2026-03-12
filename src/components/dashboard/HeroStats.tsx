import { Wallet, ShoppingCart, CheckCircle2, Server, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Money } from "@/components/shared";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface HeroStatsProps {
  balance: number;
  totalOrders: number;
  todayOrders: number;
  successRate: number;
  processingOrders: number;
  loading: boolean;
  onWalletClick: () => void;
}

const STATS_CONFIG = [
  {
    key: "balance",
    label: "Current Balance",
    icon: Wallet,
    iconBg: "bg-primary/10",
    iconColor: "text-primary",
  },
  {
    key: "today",
    label: "Today's Orders",
    icon: ShoppingCart,
    iconBg: "bg-primary/10",
    iconColor: "text-primary",
  },
  {
    key: "success",
    label: "Success Rate",
    icon: CheckCircle2,
    iconBg: "bg-success/10",
    iconColor: "text-success",
  },
  {
    key: "processing",
    label: "Processing",
    icon: Server,
    iconBg: "bg-warning/10",
    iconColor: "text-warning",
  },
] as const;

export default function HeroStats({
  balance,
  totalOrders,
  todayOrders,
  successRate,
  processingOrders,
  loading,
  onWalletClick,
}: HeroStatsProps) {
  const navigate = useNavigate();
  const values: Record<string, number> = {
    balance,
    today: todayOrders,
    success: successRate,
    processing: processingOrders,
  };

  return (
    <div className="cd-grid-stats">
      {STATS_CONFIG.map((stat, i) => {
        const Icon = stat.icon;
        const value = values[stat.key];
        const isBalance = stat.key === "balance";
        const isSuccess = stat.key === "success";

        return (
          <button
            key={stat.key}
            onClick={isBalance ? onWalletClick : undefined}
            className={cn(
              "relative overflow-hidden rounded-card border border-border bg-card/92 backdrop-blur-md p-4 lg:p-5",
              "text-left transition-all duration-300",
              "hover:border-primary/20 hover:shadow-[var(--shadow-elevated),0_0_20px_-8px_hsl(var(--primary)/0.12)] hover:-translate-y-1",
              "active:scale-[0.98] group",
              "opacity-0 animate-stagger-in"
            )}
            style={{ animationDelay: `${i * 0.08}s` }}
          >
            {/* Top accent line */}
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
            <div className="relative z-10">
              <div className="flex items-center gap-2.5 mb-3">
                <div className={cn("w-9 h-9 lg:w-10 lg:h-10 rounded-xl flex items-center justify-center shrink-0 transition-all duration-200 group-hover:scale-105", stat.iconBg)}>
                  <Icon className={cn("w-4 h-4 lg:w-5 lg:h-5", stat.iconColor)} strokeWidth={1.8} />
                </div>
                <span className="cd-stat-label">
                  {stat.label}
                </span>
              </div>

              {loading ? (
                <Skeleton className="h-8 w-20 rounded-lg" />
              ) : (
                <p className="text-xl lg:text-2xl font-extrabold font-mono tabular-nums tracking-tight text-foreground">
                  {isBalance ? (
                    <Money amount={value} raw className="text-xl lg:text-2xl" />
                  ) : isSuccess ? (
                    `${value}%`
                  ) : (
                    value.toLocaleString()
                  )}
                </p>
              )}

              {/* Add Funds button on balance card */}
              {isBalance && !loading && (
                <Button
                  size="sm"
                  onClick={(e) => { e.stopPropagation(); navigate("/dashboard/wallet"); }}
                  className="mt-3 h-8 gap-1.5 text-xs w-full"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Funds
                </Button>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
