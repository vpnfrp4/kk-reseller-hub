import { Wallet, ShoppingCart, CheckCircle2, Server, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Money } from "@/components/shared";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

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
  { key: "processing", label: "Active", icon: Server, color: "warning" },
] as const;

export default function HeroStats({
  balance, totalOrders, todayOrders, successRate, processingOrders, loading, onWalletClick,
}: HeroStatsProps) {
  const navigate = useNavigate();
  const values: Record<string, number> = { today: todayOrders, success: successRate, processing: processingOrders };

  return (
    <div className="space-y-3">
      {/* ═══ BNPL HERO BALANCE — red-to-dark gradient ═══ */}
      <div className="relative w-full overflow-hidden rounded-3xl">
        <div className="absolute inset-0 bnpl-hero-gradient" />
        <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-white/[0.05] blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-60 h-60 rounded-full bg-black/15 blur-3xl pointer-events-none" />

        <div className="relative z-10 px-6 pt-10 pb-8 lg:px-8 lg:pt-12 lg:pb-10">
          <p className="text-[11px] font-medium text-white/45 uppercase tracking-[0.18em]">
            Current credit limit
          </p>

          {loading ? (
            <Skeleton className="h-16 w-56 rounded-2xl bg-white/10 mt-2" />
          ) : (
            <div className="mt-1.5" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              <Money
                amount={balance}
                raw
                className="text-[3rem] lg:text-[3.8rem] font-extrabold !text-white [&_*]:!text-white leading-none tracking-tight"
              />
            </div>
          )}

          <div className="mt-6">
            <button
              onClick={(e) => { e.stopPropagation(); navigate("/dashboard/wallet"); }}
              className="inline-flex items-center gap-2 h-12 px-7 rounded-full bg-foreground text-background font-bold text-sm shadow-xl hover:opacity-90 transition-opacity active:scale-[0.97]"
            >
              Add fund <ArrowUpRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ═══ MINI STAT CARDS ═══ */}
      <div className="grid grid-cols-3 gap-2.5">
        {MINI_STATS.map((stat) => {
          const Icon = stat.icon;
          const value = values[stat.key];
          const isSuccess = stat.key === "success";

          return (
            <div
              key={stat.key}
              className="rounded-2xl border border-border/20 bg-card p-3.5"
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: `hsl(var(--${stat.color}) / 0.08)` }}
                >
                  <Icon className={cn("w-4 h-4", `text-${stat.color}`)} strokeWidth={1.5} />
                </div>
                <div className="min-w-0">
                  <p className="text-lg font-bold tabular-nums text-foreground leading-none" style={{ fontFamily: "'Space Grotesk', monospace" }}>
                    {loading ? <Skeleton className="h-5 w-8" /> : isSuccess ? `${value}%` : value.toLocaleString()}
                  </p>
                  <p className="text-[9px] font-medium text-muted-foreground uppercase tracking-wider mt-0.5 truncate">
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
