import { ShoppingCart, CheckCircle2, Server, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";
import { Money } from "@/components/shared";
import { Skeleton } from "@/components/ui/skeleton";

interface HeroStatsProps {
  balance: number;
  totalOrders: number;
  todayOrders: number;
  successRate: number;
  processingOrders: number;
  loading: boolean;
  onWalletClick: () => void;
}

const STATS = [
  { key: "balance", label: "Balance", icon: Wallet },
  { key: "today", label: "Today", icon: ShoppingCart },
  { key: "success", label: "Success", icon: CheckCircle2 },
  { key: "processing", label: "Active", icon: Server },
] as const;

export default function HeroStats({
  balance, totalOrders, todayOrders, successRate, processingOrders, loading, onWalletClick,
}: HeroStatsProps) {
  const values: Record<string, string> = {
    balance: "",
    today: String(todayOrders),
    success: `${successRate}%`,
    processing: String(processingOrders),
  };

  return (
    <div className="cd-grid-stats cd-reveal">
      {STATS.map((stat) => {
        const Icon = stat.icon;
        const isBalance = stat.key === "balance";
        return (
          <button
            key={stat.key}
            onClick={isBalance ? onWalletClick : undefined}
            className={cn(
              "cd-card text-left",
              isBalance && "cursor-pointer"
            )}
          >
            <div className="cd-stat-label">{stat.label}</div>
            {loading ? (
              <Skeleton className="h-7 w-20 mt-1.5 rounded-lg" />
            ) : (
              <div className="cd-stat-value mt-1">
                {isBalance ? (
                  <Money amount={balance} raw className="!text-inherit" />
                ) : (
                  values[stat.key]
                )}
              </div>
            )}
            <div className="flex items-center gap-1.5 mt-2">
              <Icon className="w-3.5 h-3.5 text-primary" strokeWidth={1.5} />
              <span className="cd-stat-delta cd-delta-up">
                {isBalance ? "Wallet" : stat.label}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
