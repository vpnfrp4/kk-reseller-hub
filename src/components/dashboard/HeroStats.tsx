import { Wallet, ShoppingCart, CheckCircle2, Server } from "lucide-react";
import { cn } from "@/lib/utils";
import { Money } from "@/components/shared";
import { Skeleton } from "@/components/ui/skeleton";

interface HeroStatsProps {
  balance: number;
  totalOrders: number;
  successRate: number;
  processingOrders: number;
  loading: boolean;
  onWalletClick: () => void;
}

const STATS_CONFIG = [
  {
    key: "balance",
    label: "Wallet Balance",
    icon: Wallet,
    gradient: "from-primary to-primary-glow",
    iconBg: "bg-primary/15",
    iconColor: "text-primary",
  },
  {
    key: "orders",
    label: "Total Orders",
    icon: ShoppingCart,
    gradient: "from-accent to-purple-500",
    iconBg: "bg-accent/15",
    iconColor: "text-accent",
  },
  {
    key: "success",
    label: "Success Rate",
    icon: CheckCircle2,
    gradient: "from-success to-emerald-400",
    iconBg: "bg-success/15",
    iconColor: "text-success",
  },
  {
    key: "processing",
    label: "Processing",
    icon: Server,
    gradient: "from-warning to-amber-400",
    iconBg: "bg-warning/15",
    iconColor: "text-warning",
  },
] as const;

export default function HeroStats({
  balance,
  totalOrders,
  successRate,
  processingOrders,
  loading,
  onWalletClick,
}: HeroStatsProps) {
  const values = {
    balance,
    orders: totalOrders,
    success: successRate,
    processing: processingOrders,
  };

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
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
              "relative overflow-hidden rounded-card border border-border/50 bg-card p-4 lg:p-5",
              "text-left transition-all duration-300",
              "hover:border-primary/20 hover:shadow-elevated hover:-translate-y-0.5",
              "active:scale-[0.98] group",
              "opacity-0 animate-stagger-in"
            )}
            style={{ animationDelay: `${i * 0.08}s` }}
          >
            {/* Top gradient line */}
            <div
              className={cn(
                "absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r opacity-60",
                stat.gradient
              )}
            />

            {/* Ambient glow */}
            <div
              className={cn(
                "absolute -top-8 -right-8 w-24 h-24 rounded-full opacity-[0.07] blur-2xl",
                `bg-gradient-to-br ${stat.gradient}`
              )}
            />

            <div className="relative z-10">
              <div className="flex items-center gap-2.5 mb-3">
                <div
                  className={cn(
                    "w-9 h-9 lg:w-10 lg:h-10 rounded-xl flex items-center justify-center shrink-0",
                    "transition-all duration-200 group-hover:scale-105",
                    stat.iconBg
                  )}
                >
                  <Icon className={cn("w-4 h-4 lg:w-5 lg:h-5", stat.iconColor)} strokeWidth={1.8} />
                </div>
                <span className="text-[10px] lg:text-[11px] font-bold text-muted-foreground uppercase tracking-[0.12em]">
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
            </div>
          </button>
        );
      })}
    </div>
  );
}
