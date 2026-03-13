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
  processing: "bg-warning",
  pending: "bg-primary/60",
  pending_creation: "bg-primary/60",
  pending_review: "bg-primary/60",
  api_pending: "bg-warning",
  failed: "bg-destructive",
  cancelled: "bg-muted-foreground/40",
  refunded: "bg-ice",
};

export default function RecentTimeline({ orders, loading }: RecentTimelineProps) {
  const navigate = useNavigate();

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-foreground">Recent Activity</h2>
        <button
          onClick={() => navigate("/dashboard/orders")}
          className="text-xs font-bold text-primary flex items-center gap-1 hover:text-primary/80 transition-colors"
        >
          All orders <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-2xl border border-border/30 bg-card p-4 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-muted/40 shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-4 w-40 bg-muted/20 rounded" />
                  <div className="h-3 w-24 bg-muted/15 rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : !orders || orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 rounded-2xl border border-border/30 bg-card" style={{ boxShadow: "var(--shadow-card)" }}>
          <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center mb-3">
            <Clock className="w-5 h-5 text-muted-foreground/40" />
          </div>
          <p className="text-sm font-semibold text-foreground/70">No orders yet</p>
          <p className="text-xs text-muted-foreground mt-0.5">Your recent orders will appear here</p>
        </div>
      ) : (
        <div className="space-y-2">
          {orders.slice(0, 5).map((order: any, i: number) => {
            const dotColor = STATUS_COLORS[order.status] || "bg-muted-foreground/30";
            return (
              <motion.button
                key={order.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: i * 0.05 }}
                onClick={() => navigate(`/dashboard/orders/${order.id}`)}
                className="w-full flex items-center gap-3 p-3.5 rounded-2xl border border-border/30 bg-card text-left transition-all duration-200 hover:border-primary/20 active:scale-[0.99] group"
                style={{ boxShadow: "var(--shadow-card)" }}
              >
                {/* Status dot */}
                <span className={cn("w-2.5 h-2.5 rounded-full shrink-0", dotColor)} />

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                    {order.product_name}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {order.order_code} · {ago(order.created_at)}
                  </p>
                </div>

                <span className="text-sm font-bold font-mono tabular-nums text-foreground shrink-0">
                  <Money amount={order.price} compact />
                </span>
              </motion.button>
            );
          })}
        </div>
      )}
    </div>
  );
}
