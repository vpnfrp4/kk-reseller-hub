import { Wallet, ShoppingCart, CheckCircle2, Server, Plus, TrendingUp } from "lucide-react";
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
  { key: "today", label: "Today", icon: ShoppingCart, color: "primary", gradient: "from-primary/15 to-primary-glow/5" },
  { key: "success", label: "Success", icon: CheckCircle2, color: "success", gradient: "from-success/12 to-success/3" },
  { key: "processing", label: "Processing", icon: Server, color: "warning", gradient: "from-warning/12 to-warning/3" },
] as const;

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1, delayChildren: 0.05 } },
};

const cardVariant = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: {
    opacity: 1, y: 0, scale: 1,
    transition: { type: "spring", stiffness: 350, damping: 25 },
  },
};

export default function HeroStats({
  balance, totalOrders, todayOrders, successRate, processingOrders, loading, onWalletClick,
}: HeroStatsProps) {
  const navigate = useNavigate();
  const values: Record<string, number> = { today: todayOrders, success: successRate, processing: processingOrders };

  return (
    <motion.div className="space-y-4" variants={containerVariants} initial="hidden" animate="visible">
      {/* ═══ BALANCE HERO CARD ═══ */}
      <motion.button
        variants={cardVariant}
        onClick={onWalletClick}
        whileHover={{ y: -3, transition: { duration: 0.25 } }}
        whileTap={{ scale: 0.995 }}
        className={cn(
          "relative w-full overflow-hidden rounded-[var(--radius-card)] text-left",
          "border border-primary/20 backdrop-blur-xl",
          "hover:border-primary/35 hover:shadow-glow",
          "transition-all duration-500 group"
        )}
      >
        {/* Layered gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-primary/6 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-tl from-primary-glow/5 via-transparent to-transparent" />
        
        {/* Animated glow orbs */}
        <div className="absolute -top-20 -right-20 w-56 h-56 rounded-full bg-primary/10 blur-3xl group-hover:bg-primary/18 group-hover:scale-110 transition-all duration-1000 pointer-events-none animate-ambient-drift" />
        <div className="absolute -bottom-16 -left-16 w-44 h-44 rounded-full bg-primary-glow/6 blur-2xl group-hover:bg-primary-glow/12 transition-all duration-1000 pointer-events-none" style={{ animationDelay: '4s' }} />
        
        {/* Shimmer sweep on hover */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent" style={{ animation: 'shimmer-sweep 2s ease-in-out infinite' }} />
        </div>

        {/* Bottom accent line */}
        <div className="absolute bottom-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-40 group-hover:opacity-100 transition-opacity duration-500" />

        {/* Content */}
        <div className="relative z-10 p-5 lg:p-7">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-3.5 flex-1">
              <div className="flex items-center gap-3">
                <motion.div
                  className="w-12 h-12 lg:w-14 lg:h-14 rounded-2xl bg-primary/12 border border-primary/15 flex items-center justify-center group-hover:bg-primary/20 transition-all duration-400"
                  whileHover={{ rotate: [0, -5, 5, 0], transition: { duration: 0.4 } }}
                >
                  <Wallet className="w-6 h-6 lg:w-7 lg:h-7 text-primary" strokeWidth={1.6} />
                </motion.div>
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.14em] font-display">
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

              {loading ? (
                <Skeleton className="h-12 w-44 rounded-xl" />
              ) : (
                <motion.p
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.3 }}
                  className="text-[2rem] lg:text-[2.8rem] font-extrabold font-mono tabular-nums tracking-tight text-foreground leading-none"
                >
                  <Money amount={balance} raw className="text-[2rem] lg:text-[2.8rem]" />
                </motion.p>
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
              variants={cardVariant}
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
              className={cn(
                "relative overflow-hidden rounded-[var(--radius-card)] border border-border/50",
                "bg-card/90 backdrop-blur-xl",
                "p-3.5 lg:p-4 transition-all duration-400 cursor-default group",
                "hover:border-primary/15 hover:shadow-[var(--shadow-elevated)]",
              )}
            >
              {/* Gradient overlay */}
              <div className={cn("absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none", stat.gradient)} />

              {/* Top accent line with glow */}
              <div
                className="absolute top-0 inset-x-4 h-[2px] rounded-b-full opacity-40 group-hover:opacity-80 transition-opacity duration-300"
                style={{ background: `hsl(var(--${stat.color}))`, boxShadow: `0 0 8px hsl(var(--${stat.color}) / 0.3)` }}
              />

              <div className="relative z-10 flex items-center gap-2.5">
                <motion.div
                  className="w-9 h-9 lg:w-10 lg:h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: `hsl(var(--${stat.color}) / 0.1)` }}
                  whileHover={{ scale: 1.1, rotate: 5 }}
                >
                  <Icon className={cn("w-4 h-4 lg:w-[18px] lg:h-[18px]", `text-${stat.color}`)} strokeWidth={1.8} />
                </motion.div>
                <div className="min-w-0">
                  <p className="text-xl lg:text-2xl font-extrabold font-mono tabular-nums text-foreground leading-none">
                    {loading ? <Skeleton className="h-7 w-10" /> : isSuccess ? `${value}%` : value.toLocaleString()}
                  </p>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.1em] mt-0.5 truncate font-display">
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
