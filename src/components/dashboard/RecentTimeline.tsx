import { useNavigate } from "react-router-dom";
import { Money } from "@/components/shared";
import { ago } from "@/lib/helpers";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { ArrowRight, Clock } from "lucide-react";

interface RecentTimelineProps {
  orders: any[] | undefined;
  loading: boolean;
}

const STATUS_COLORS: Record<string, string> = {
  delivered: "bg-success",
  completed: "bg-success",
  processing: "bg-warning animate-pulse",
  pending: "bg-primary/60",
  pending_creation: "bg-primary/60",
  pending_review: "bg-primary/60",
  api_pending: "bg-warning animate-pulse",
  failed: "bg-destructive",
  cancelled: "bg-muted-foreground/40",
  refunded: "bg-ice",
};

const STATUS_GLOW: Record<string, string> = {
  delivered: "shadow-[0_0_6px_hsl(var(--success)/0.4)]",
  completed: "shadow-[0_0_6px_hsl(var(--success)/0.4)]",
  processing: "shadow-[0_0_6px_hsl(var(--warning)/0.4)]",
  api_pending: "shadow-[0_0_6px_hsl(var(--warning)/0.4)]",
  failed: "shadow-[0_0_6px_hsl(var(--destructive)/0.4)]",
};

const itemVariants = {
  hidden: { opacity: 0, x: -12 },
  visible: (i: number) => ({
    opacity: 1, x: 0,
    transition: { type: "spring", stiffness: 320, damping: 24, delay: i * 0.08 },
  }),
};

export default function RecentTimeline({ orders, loading }: RecentTimelineProps) {
  const navigate = useNavigate();

  return (
    <div className="cd-card cd-reveal">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-1.5 h-6 rounded-full bg-gradient-to-b from-success to-success/30" />
          <h2 className="text-sm lg:text-base font-extrabold text-foreground tracking-tight font-display">Recent Timeline</h2>
        </div>
        <button
          onClick={() => navigate("/dashboard/orders")}
          className="text-xs font-bold text-primary flex items-center gap-1 hover:text-primary/80 transition-colors group"
        >
          All orders <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-start gap-3 p-3 rounded-xl">
              <div className="w-2.5 h-2.5 rounded-full bg-muted/40 mt-1.5 shrink-0 animate-pulse" />
              <div className="flex-1 space-y-1.5">
                <div className="h-4 w-40 bg-muted/30 rounded-lg animate-pulse" />
                <div className="h-3 w-28 bg-muted/20 rounded-lg animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      ) : !orders || orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="w-12 h-12 rounded-2xl bg-muted/30 flex items-center justify-center mb-3">
            <Clock className="w-5 h-5 text-muted-foreground/50" />
          </div>
          <p className="text-sm text-muted-foreground font-medium">No orders yet</p>
          <p className="text-xs text-muted-foreground/60 mt-0.5">Your recent orders will appear here</p>
        </div>
      ) : (
        <div className="space-y-1">
          {orders.slice(0, 5).map((order: any, i: number) => {
            const dotColor = STATUS_COLORS[order.status] || "bg-muted-foreground/30";
            const dotGlow = STATUS_GLOW[order.status] || "";
            return (
              <motion.button
                key={order.id}
                custom={i}
                variants={itemVariants}
                initial="hidden"
                animate="visible"
                whileHover={{ x: 3, transition: { duration: 0.15 } }}
                onClick={() => navigate(`/dashboard/orders/${order.id}`)}
                className={cn(
                  "w-full flex items-start gap-3 p-3 rounded-xl text-left group relative",
                  "hover:bg-secondary/40 transition-all duration-200"
                )}
              >
                {/* Hover glow background */}
                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

                {/* Status dot with glow + line connector */}
                <div className="flex flex-col items-center pt-1 shrink-0 relative z-10">
                  <span className={cn("w-2.5 h-2.5 rounded-full ring-2 ring-card transition-shadow duration-300", dotColor, dotGlow)} />
                  {i < Math.min((orders?.length || 0), 5) - 1 && (
                    <div className="w-px h-8 bg-gradient-to-b from-border/50 to-transparent mt-1" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 relative z-10">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono font-bold text-primary/80">
                      {order.order_code || order.id.slice(0, 8)}
                    </span>
                    <span className="text-[10px] text-muted-foreground/60">·</span>
                    <span className="text-[10px] text-muted-foreground/70 font-medium">{ago(order.created_at)}</span>
                  </div>
                  <p className="text-xs font-bold text-foreground mt-0.5 line-clamp-1 group-hover:text-primary transition-colors duration-200">
                    {order.product_name}
                  </p>
                  <p className="text-[11px] text-muted-foreground font-mono mt-0.5">
                    <Money amount={order.price} compact />
                  </p>
                </div>

                <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/20 group-hover:text-primary/50 mt-1 shrink-0 transition-all duration-200 group-hover:translate-x-0.5 relative z-10" />
              </motion.button>
            );
          })}
        </div>
      )}
    </div>
  );
}
