import { useNavigate } from "react-router-dom";
import { Money } from "@/components/shared";
import { ago } from "@/lib/helpers";

interface RecentTimelineProps {
  orders: any[] | undefined;
  loading: boolean;
}

export default function RecentTimeline({ orders, loading }: RecentTimelineProps) {
  const navigate = useNavigate();

  return (
    <div className="cd-card cd-reveal">
      <div className="cd-section-title">
        <h2>Recent Timeline</h2>
        <span>Latest activities</span>
      </div>

      {loading ? (
        <div className="cd-timeline">
          {[1, 2, 3].map((i) => (
            <div key={i} className="cd-timeline-item">
              <span className="cd-dot opacity-30" />
              <div>
                <div className="h-4 w-40 bg-muted/40 rounded animate-pulse" />
                <div className="h-3 w-28 bg-muted/30 rounded animate-pulse mt-2" />
              </div>
            </div>
          ))}
        </div>
      ) : !orders || orders.length === 0 ? (
        <p className="cd-stat-delta">No orders yet.</p>
      ) : (
        <div className="cd-timeline">
          {orders.slice(0, 5).map((order: any) => (
            <button
              key={order.id}
              onClick={() => navigate(`/dashboard/orders/${order.id}`)}
              className="cd-timeline-item text-left hover:bg-secondary/30 -mx-2 px-2 py-1 rounded-lg transition-colors"
            >
              <span className="cd-dot" />
              <div>
                <strong>{order.order_code || order.id.slice(0, 8)} · {order.product_name}</strong>
                <p>
                  <Money amount={order.price} compact /> · {formatDistanceToNow(new Date(order.created_at), { addSuffix: true })}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
