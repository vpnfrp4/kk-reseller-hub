import { useNavigate } from "react-router-dom";
import { Money } from "@/components/shared";
import { ago } from "@/lib/helpers";
import { cn } from "@/lib/utils";
import { ArrowRight, Clock } from "lucide-react";

interface RecentTimelineProps {
  orders: any[] | undefined;
  loading: boolean;
}

const STATUS_DOT: Record<string, string> = {
  delivered: "bg-success",
  completed: "bg-success",
  processing: "bg-warning",
  pending: "bg-muted-foreground/40",
  pending_creation: "bg-muted-foreground/40",
  pending_review: "bg-muted-foreground/40",
  api_pending: "bg-warning",
  failed: "bg-destructive",
  cancelled: "bg-destructive",
  refunded: "bg-ice",
};

export default function RecentTimeline({ orders, loading }: RecentTimelineProps) {
  const navigate = useNavigate();

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-[15px] font-semibold text-foreground">Recent Activity</h2>
        <button
          onClick={() => navigate("/dashboard/orders")}
          className="text-xs font-medium text-primary flex items-center gap-1 hover:text-primary/80 transition-colors"
        >
          All orders
        </button>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-2xl border border-border/15 bg-card p-4 animate-pulse h-16" />
          ))}
        </div>
      ) : !orders || orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 rounded-2xl border border-border/15 bg-card">
          <Clock className="w-8 h-8 text-muted-foreground/20 mb-2" />
          <p className="text-sm font-medium text-muted-foreground/60">No orders yet</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {orders.slice(0, 5).map((order: any) => {
            const dot = STATUS_DOT[order.status] || "bg-muted-foreground/30";
            return (
              <button
                key={order.id}
                onClick={() => navigate(`/dashboard/orders/${order.id}`)}
                className="w-full flex items-center gap-3 p-3.5 rounded-2xl border border-border/15 bg-card text-left transition-all duration-150 hover:bg-secondary/30 active:scale-[0.99] group"
              >
                <span className={cn("w-2.5 h-2.5 rounded-full shrink-0", dot)} />
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                    {order.product_name}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {order.order_code} · {ago(order.created_at)}
                  </p>
                </div>
                <span className="text-sm font-semibold tabular-nums text-foreground shrink-0" style={{ fontFamily: "'Space Grotesk', monospace" }}>
                  <Money amount={order.price} compact />
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
