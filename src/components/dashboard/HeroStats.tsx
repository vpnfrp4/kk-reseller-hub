import { Wallet, ShoppingCart, CheckCircle2, Server, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Money } from "@/components/shared";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
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

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};

const cardVariant = {
  hidden: { opacity: 0, y: 20, scale: 0.96 },
  visible: {
    opacity: 1, y: 0, scale: 1,
    transition: { type: "spring", stiffness: 380, damping: 26 },
  },
};

export default function HeroStats({
  balance, totalOrders, todayOrders, successRate, processingOrders, loading, onWalletClick,
}: HeroStatsProps) {
  const navigate = useNavigate();
  const values: Record<string, number> = { today: todayOrders, success: successRate, processing: processingOrders };

  return (
    <motion.div className="space-y-3" variants={containerVariants} initial="hidden" animate="visible">
      {/* ═══ BNPL HERO BALANCE CARD ═══ */}
      <motion.div
        variants={cardVariant}
        className="relative w-full overflow-hidden rounded-3xl"
      >
        {/* Red-to-dark gradient background */}
        <div className="absolute inset-0 bnpl-hero-gradient" />
        
        {/* Soft radial glow */}
        <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-white/[0.06] blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-52 h-52 rounded-full bg-black/20 blur-3xl pointer-events-none" />
        
        {/* Content */}
        <div className="relative z-10 px-6 pt-8 pb-7 lg:px-8 lg:pt-10 lg:pb-8">
          <p className="text-[11px] font-medium text-white/50 uppercase tracking-[0.16em]">
            Current credit limit
          </p>

          {loading ? (
            <Skeleton className="h-14 w-52 rounded-2xl bg-white/10 mt-2" />
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.2 }}
              className="mt-1"
            >
              <Money amount={balance} raw className="text-[2.8rem] lg:text-[3.6rem] font-extrabold !text-white [&_*]:!text-white leading-none tracking-tight font-display" />
            </motion.div>
          )}

          <div className="flex items-center gap-3 mt-5">
            <Button
              size="sm"
              onClick={(e) => { e.stopPropagation(); navigate("/dashboard/wallet"); }}
              className="gap-1.5 rounded-pill h-11 px-6 font-bold bg-foreground text-background hover:bg-foreground/90 shadow-xl text-sm"
            >
              Enhance <ArrowUpRight className="w-4 h-4" />
            </Button>
            <span className="text-xs text-white/35 font-medium">
              {totalOrders} orders placed
            </span>
          </div>
        </div>
      </motion.div>

      {/* ═══ MINI STAT CARDS ═══ */}
      <div className="grid grid-cols-3 gap-2.5">
        {MINI_STATS.map((stat) => {
          const Icon = stat.icon;
          const value = values[stat.key];
          const isSuccess = stat.key === "success";

          return (
            <motion.div
              key={stat.key}
              variants={cardVariant}
              className="rounded-2xl border border-border/30 bg-card p-3.5"
              style={{ boxShadow: "var(--shadow-card)" }}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: `hsl(var(--${stat.color}) / 0.08)` }}
                >
                  <Icon className={cn("w-4 h-4", `text-${stat.color}`)} strokeWidth={1.8} />
                </div>
                <div className="min-w-0">
                  <p className="text-lg font-extrabold font-mono tabular-nums text-foreground leading-none">
                    {loading ? <Skeleton className="h-6 w-8" /> : isSuccess ? `${value}%` : value.toLocaleString()}
                  </p>
                  <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-[0.1em] mt-0.5 truncate">
                    {stat.label}
                  </p>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
