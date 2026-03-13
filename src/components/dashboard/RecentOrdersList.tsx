import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Money } from "@/components/shared";
import { MmStatus } from "@/components/shared/MmLabel";
import { ArrowRight, PackageOpen } from "lucide-react";
import { format } from "date-fns";
import ProductIcon from "@/components/products/ProductIcon";

interface RecentOrdersListProps {
  orders: any[] | undefined;
  loading: boolean;
}

export default function RecentOrdersList({ orders, loading }: RecentOrdersListProps) {
  const navigate = useNavigate();

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-foreground">Order History</h2>
        <button
          onClick={() => navigate("/dashboard/orders")}
          className="text-xs font-bold text-primary flex items-center gap-1 hover:text-primary/80 transition-colors"
        >
          View all <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-2xl border border-border/30 bg-card p-4 animate-pulse">
              <div className="flex justify-between">
                <div className="h-4 w-40 bg-muted-foreground/10 rounded" />
                <div className="h-5 w-16 bg-muted-foreground/10 rounded-full" />
              </div>
              <div className="flex justify-between mt-3">
                <div className="h-3 w-24 bg-muted-foreground/10 rounded" />
                <div className="h-4 w-20 bg-muted-foreground/10 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : !orders || orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 rounded-2xl border border-border/30 bg-card" style={{ boxShadow: "var(--shadow-card)" }}>
          <div className="w-14 h-14 rounded-full bg-secondary flex items-center justify-center mb-3">
            <PackageOpen className="w-7 h-7 text-muted-foreground/30" />
          </div>
          <p className="text-sm font-semibold text-foreground/70 mb-1">No orders yet</p>
          <p className="text-xs text-muted-foreground">Place your first order to get started</p>
          <button
            onClick={() => navigate("/dashboard/place-order")}
            className="mt-4 rounded-pill bg-primary text-primary-foreground px-5 py-2.5 text-sm font-bold shadow-lg hover:bg-primary/90 transition-colors"
          >
            Place Order
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {orders.slice(0, 8).map((order: any) => (
            <button
              key={order.id}
              onClick={() => navigate(`/dashboard/orders/${order.id}`)}
              className={cn(
                "w-full text-left rounded-2xl border border-border/30 bg-card p-3.5",
                "active:scale-[0.99] transition-all duration-200",
                "hover:border-primary/20 group"
              )}
              style={{ boxShadow: "var(--shadow-card)" }}
            >
              <div className="flex items-center gap-3">
                <ProductIcon
                  imageUrl={order.products?.image_url}
                  name={order.product_name}
                  category={order.products?.category || "General"}
                  size="sm"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                        {order.product_name}
                      </p>
                      <p className="text-[11px] text-muted-foreground font-mono mt-0.5">
                        {order.order_code}
                      </p>
                    </div>
                    <MmStatus status={order.status} />
                  </div>
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/20">
                    <span className="text-[11px] text-muted-foreground">
                      {format(new Date(order.created_at), "MMM dd, HH:mm")}
                    </span>
                    <Money
                      amount={order.price}
                      className="text-sm font-bold font-mono tabular-nums text-foreground"
                    />
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
