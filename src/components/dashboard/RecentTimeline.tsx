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

const itemVariants = {
  hidden: { opacity: 0, x: -8 },
  visible: (i: number) => ({
    opacity: 1, x: 0,
    transition: { duration: 0.25, delay: i * 0.06 },
  }),
};

export default function RecentTimeline({ orders, loading }: RecentTimelineProps) {
  const navigate = useNavigate();

  return (
    <div className="rounded-2xl border border-border/30 bg-card p-5" style={{ boxShadow: "var(--shadow-card)" }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-1.5 h-6 rounded-full bg-success" />
          <h2 className="text-sm lg:text-base font-bold text-foreground tracking-tight">Recent Timeline</h2>
        </div>
        <button
          onClick={() => navigate("/dashboard/orders")}
          className="text-xs font-bold text-primary flex items-center gap-1 hover:text-primary/80 transition-colors"
        >
          All orders <ArrowRight className="w-3.5 h-3.5" />
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
          <div className="w-12 h-12 rounded-2xl bg-muted/20 flex items-center justify-center mb-3">
            <Clock className="w-5 h-5 text-muted-foreground/40" />
          </div>
          <p className="text-sm text-muted-foreground font-medium">No orders yet</p>
          <p className="text-xs text-muted-foreground/50 mt-0.5">Your recent orders will appear here</p>
        </div>
      ) : (
        <div className="space-y-1">
          {orders.slice(0, 5).map((order: any, i: number) => {
            const dotColor = STATUS_COLORS[order.status] || "bg-muted-foreground/30";
            return (
              <motion.button
                key={order.id}
                custom={i}
                variants={itemVariants}
                initial="hidden"
                animate="visible"
                onClick={() => navigate(`/dashboard/orders/${order.id}`)}
                className="w-full flex items-start gap-3 p-3 rounded-xl text-left group hover:bg-secondary/30 transition-colors duration-200"
              >
                {/* Status dot + line connector */}
                <div className="flex flex-col items-center pt-1 shrink-0">
                  <span className={cn("w-2.5 h-2.5 rounded-full ring-2 ring-card", dotColor)} />
                  {i < Math.min((orders?.length || 0), 5) - 1 && (
                    <div className="w-px h-8 bg-border/30 mt-1" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono font-bold text-primary/70">
                      {order.order_code || order.id.slice(0, 8)}
                    </span>
                    <span className="text-[10px] text-muted-foreground/50">·</span>
                    <span className="text-[10px] text-muted-foreground/60">{ago(order.created_at)}</span>
                  </div>
                  <p className="text-xs font-bold text-foreground mt-0.5 line-clamp-1 group-hover:text-primary transition-colors">
                    {order.product_name}
                  </p>
                  <p className="text-[11px] text-muted-foreground font-mono mt-0.5">
                    <Money amount={order.price} compact />
                  </p>
                </div>

                <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/20 group-hover:text-primary/40 mt-1 shrink-0 transition-colors" />
              </motion.button>
            );
          })}
        </div>
      )}
    </div>
  );
}
