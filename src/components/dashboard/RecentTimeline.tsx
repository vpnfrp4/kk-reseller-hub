import { useNavigate } from "react-router-dom";
import { Money } from "@/components/shared";
import { ago } from "@/lib/helpers";
import { Clock } from "lucide-react";

interface RecentTimelineProps {
  orders: any[] | undefined;
  loading: boolean;
}

export default function RecentTimeline({ orders, loading }: RecentTimelineProps) {
  const navigate = useNavigate();

  return (
    <div className="cd-card cd-reveal">
      <div className="cd-section-title">
        <h2>Recent Activity</h2>
        <span
          className="text-primary cursor-pointer hover:underline"
          onClick={() => navigate("/dashboard/orders")}
        >
          All orders →
        </span>
      </div>

      {loading ? (
        <div className="cd-timeline">
          {[1, 2, 3].map((i) => (
            <div key={i} className="cd-timeline-item animate-pulse">
              <div className="cd-dot opacity-30" />
              <div>
                <div className="h-4 w-40 rounded bg-muted mb-1" />
                <div className="h-3 w-24 rounded bg-muted" />
              </div>
            </div>
          ))}
        </div>
      ) : !orders || orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10">
          <Clock className="w-8 h-8 text-muted-foreground/30 mb-2" />
          <p className="text-sm text-muted-foreground">No orders yet</p>
        </div>
      ) : (
        <div className="cd-timeline">
          {orders.slice(0, 6).map((order: any) => (
            <button
              key={order.id}
              onClick={() => navigate(`/dashboard/orders/${order.id}`)}
              className="cd-timeline-item text-left hover:bg-secondary/30 -mx-1 px-1 rounded-lg transition-colors"
            >
              <div className="cd-dot" />
              <div className="min-w-0">
                <strong className="line-clamp-1">{order.product_name}</strong>
                <p>
                  <span style={{ fontFamily: "var(--font-display)" }}>
                    <Money amount={order.price} compact />
                  </span>
                  {" · "}
                  {order.order_code} · {ago(order.created_at)}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
