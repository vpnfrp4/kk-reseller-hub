import { Wallet, ShoppingCart, CheckCircle2, Server, Plus, TrendingUp } from "lucide-react";
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

const MINI_STATS = [
  { key: "today", label: "Today", icon: ShoppingCart, color: "primary" },
  { key: "success", label: "Success", icon: CheckCircle2, color: "success" },
  { key: "processing", label: "Processing", icon: Server, color: "warning" },
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
    today: todayOrders,
    success: successRate,
    processing: processingOrders,
  };

  return (
    <div className="space-y-4">
      {/* ═══ BALANCE HERO CARD ═══ */}
      <button
        onClick={onWalletClick}
        className={cn(
          "relative w-full overflow-hidden rounded-[var(--radius-card)] p-5 lg:p-6 text-left",
          "bg-gradient-to-br from-primary/15 via-primary/8 to-primary/3",
          "border border-primary/20 backdrop-blur-md",
          "hover:border-primary/35 hover:shadow-[0_8px_40px_-12px_hsl(var(--primary)/0.25)]",
          "transition-all duration-400 group active:scale-[0.995]",
          "opacity-0 animate-stagger-in"
        )}
      >
        {/* Decorative gradient orb */}
        <div className="absolute -top-20 -right-20 w-56 h-56 rounded-full bg-primary/8 blur-3xl group-hover:bg-primary/12 transition-all duration-700 pointer-events-none" />
        <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

        <div className="relative z-10 flex items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 lg:w-11 lg:h-11 rounded-xl bg-primary/15 border border-primary/20 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Wallet className="w-5 h-5 text-primary" strokeWidth={1.8} />
              </div>
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Wallet Balance
              </span>
            </div>
            {loading ? (
              <Skeleton className="h-10 w-36 rounded-lg" />
            ) : (
              <p className="text-3xl lg:text-4xl font-extrabold font-mono tabular-nums tracking-tight text-foreground">
                <Money amount={balance} raw className="text-3xl lg:text-4xl" />
              </p>
            )}
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-success" />
              {totalOrders} total orders placed
            </p>
          </div>

          <Button
            size="sm"
            onClick={(e) => { e.stopPropagation(); navigate("/dashboard/wallet"); }}
            className="gap-1.5 shrink-0 shadow-lg shadow-primary/20"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Add Funds</span>
          </Button>
        </div>
      </button>

      {/* ═══ MINI STAT CARDS ═══ */}
      <div className="grid grid-cols-3 gap-3">
        {MINI_STATS.map((stat, i) => {
          const Icon = stat.icon;
          const value = values[stat.key];
          const isSuccess = stat.key === "success";

          return (
            <div
              key={stat.key}
              className={cn(
                "relative overflow-hidden rounded-[var(--radius-card)] border border-border/50 bg-card/90 backdrop-blur-sm",
                "p-3.5 lg:p-4 transition-all duration-300",
                "hover:border-primary/20 hover:shadow-[var(--shadow-elevated)] hover:-translate-y-0.5",
                "opacity-0 animate-stagger-in"
              )}
              style={{ animationDelay: `${(i + 1) * 0.08}s` }}
            >
              <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-border/60 to-transparent" />
              <div className="flex items-center gap-2.5">
                <div
                  className={cn("w-8 h-8 lg:w-9 lg:h-9 rounded-lg flex items-center justify-center shrink-0")}
                  style={{ background: `hsl(var(--${stat.color}) / 0.1)` }}
                >
                  <Icon className={cn("w-4 h-4", `text-${stat.color}`)} strokeWidth={1.8} />
                </div>
                <div className="min-w-0">
                  <p className="text-lg lg:text-xl font-bold font-mono tabular-nums text-foreground leading-tight">
                    {loading ? <Skeleton className="h-6 w-10" /> : isSuccess ? `${value}%` : value.toLocaleString()}
                  </p>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider truncate">
                    {stat.label}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
