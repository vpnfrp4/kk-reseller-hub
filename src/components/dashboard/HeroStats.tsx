import { Wallet, ShoppingCart, CheckCircle2, Server, Plus, TrendingUp, ArrowUpRight } from "lucide-react";
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
  { key: "today", label: "Today", icon: ShoppingCart, color: "primary", bg: "primary" },
  { key: "success", label: "Success", icon: CheckCircle2, color: "success", bg: "success" },
  { key: "processing", label: "Processing", icon: Server, color: "warning", bg: "warning" },
] as const;

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16, scale: 0.97 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 400, damping: 28 } },
};

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
    <motion.div className="space-y-4" variants={containerVariants} initial="hidden" animate="visible">
      {/* ═══ BALANCE HERO CARD ═══ */}
      <motion.button
        variants={itemVariants}
        onClick={onWalletClick}
        whileHover={{ y: -2 }}
        whileTap={{ scale: 0.995 }}
        className={cn(
          "relative w-full overflow-hidden rounded-[var(--radius-card)] text-left",
          "border border-primary/20 backdrop-blur-xl",
          "hover:border-primary/35",
          "transition-shadow duration-400 group"
        )}
      >
        {/* Multi-layer gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-primary/8 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-transparent to-primary-glow/5" />
        
        {/* Animated decorative orbs */}
        <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-primary/10 blur-3xl group-hover:bg-primary/15 group-hover:scale-110 transition-all duration-700 pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-36 h-36 rounded-full bg-primary-glow/6 blur-2xl group-hover:bg-primary-glow/10 transition-all duration-700 pointer-events-none" />
        
        {/* Bottom accent line */}
        <div className="absolute bottom-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-primary/40 to-transparent opacity-60 group-hover:opacity-100 transition-opacity" />

        {/* Content */}
        <div className="relative z-10 p-5 lg:p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-3 flex-1">
              {/* Label row */}
              <div className="flex items-center gap-2.5">
                <div className="w-11 h-11 lg:w-12 lg:h-12 rounded-2xl bg-primary/12 border border-primary/15 flex items-center justify-center group-hover:scale-105 group-hover:bg-primary/18 transition-all duration-300">
                  <Wallet className="w-5 h-5 lg:w-[22px] lg:h-[22px] text-primary" strokeWidth={1.8} />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.12em]">
                    Wallet Balance
                  </span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <TrendingUp className="w-3 h-3 text-success" />
                    <span className="text-[10px] text-muted-foreground font-medium">
                      {totalOrders} orders placed
                    </span>
                  </div>
                </div>
              </div>

              {/* Amount */}
              {loading ? (
                <Skeleton className="h-11 w-40 rounded-xl" />
              ) : (
                <p className="text-3xl lg:text-[2.5rem] font-extrabold font-mono tabular-nums tracking-tight text-foreground leading-none">
                  <Money amount={balance} raw className="text-3xl lg:text-[2.5rem]" />
                </p>
              )}
            </div>

            <Button
              size="sm"
              onClick={(e) => { e.stopPropagation(); navigate("/dashboard/wallet"); }}
              className="gap-1.5 shrink-0 shadow-lg shadow-primary/25 rounded-xl h-10 px-4 font-bold"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline text-xs">Add Funds</span>
            </Button>
          </div>
        </div>
      </motion.button>

      {/* ═══ MINI STAT CARDS ═══ */}
      <div className="grid grid-cols-3 gap-3">
        {MINI_STATS.map((stat) => {
          const Icon = stat.icon;
          const value = values[stat.key];
          const isSuccess = stat.key === "success";

          return (
            <motion.div
              key={stat.key}
              variants={itemVariants}
              whileHover={{ y: -3, transition: { duration: 0.2 } }}
              className={cn(
                "relative overflow-hidden rounded-[var(--radius-card)] border border-border/50 bg-card/90 backdrop-blur-sm",
                "p-3.5 lg:p-4 transition-shadow duration-300 cursor-default",
                "hover:border-primary/15 hover:shadow-[var(--shadow-elevated)]",
              )}
            >
              {/* Top accent line */}
              <div
                className="absolute top-0 inset-x-4 h-[2px] rounded-b-full opacity-50"
                style={{ background: `hsl(var(--${stat.color}))` }}
              />

              <div className="flex items-center gap-2.5">
                <div
                  className="w-9 h-9 lg:w-10 lg:h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-200"
                  style={{ background: `hsl(var(--${stat.color}) / 0.1)` }}
                >
                  <Icon className={cn("w-4 h-4 lg:w-[18px] lg:h-[18px]", `text-${stat.color}`)} strokeWidth={1.8} />
                </div>
                <div className="min-w-0">
                  <p className="text-xl lg:text-2xl font-extrabold font-mono tabular-nums text-foreground leading-none">
                    {loading ? <Skeleton className="h-7 w-10" /> : isSuccess ? `${value}%` : value.toLocaleString()}
                  </p>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.1em] mt-0.5 truncate">
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
