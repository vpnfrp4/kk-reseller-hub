import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { TrendingUp, Star, Zap, Clock } from "lucide-react";

export default function PopularServices() {
  // Get most ordered products by counting orders per product
  const { data: popular = [], isLoading } = useQuery({
    queryKey: ["popular-services"],
    queryFn: async () => {
      // Get products with their order counts via a query
      const { data: orders } = await supabase
        .from("orders")
        .select("product_id, product_name")
        .not("product_id", "is", null)
        .order("created_at", { ascending: false })
        .limit(500);

      if (!orders || orders.length === 0) return [];

      // Count orders per product
      const countMap = new Map<string, { count: number; name: string }>();
      for (const o of orders) {
        if (!o.product_id) continue;
        const existing = countMap.get(o.product_id) || { count: 0, name: o.product_name };
        existing.count++;
        countMap.set(o.product_id, existing);
      }

      // Get top 6 product IDs
      const sorted = [...countMap.entries()]
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 6);

      const productIds = sorted.map(([id]) => id);

      // Fetch product details
      const { data: products } = await supabase
        .from("products")
        .select("id, name, slug, wholesale_price, product_type, category, processing_time, delivery_time_config")
        .in("id", productIds);

      if (!products) return [];

      return sorted.map(([id, { count }]) => {
        const product = products.find((p: any) => p.id === id);
        return product ? { ...product, orderCount: count } : null;
      }).filter(Boolean);
    },
    staleTime: 60_000,
  });

  if (isLoading || popular.length === 0) return null;

  return (
    <div className="glass-card overflow-hidden">
      <div className="px-5 py-4 border-b border-border/30 flex items-center gap-2">
        <TrendingUp className="w-4 h-4 text-primary" />
        <p className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground">
          Most Popular Services
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-border/20">
        {popular.map((item: any, i: number) => {
          const deliveryConfig = item.delivery_time_config && typeof item.delivery_time_config === "object"
            ? (item.delivery_time_config as Record<string, string>)
            : {};
          const speed = item.product_type === "imei"
            ? item.processing_time || "1-3 Days"
            : deliveryConfig["instant"] || "Instant";
          const isInstant = speed.toLowerCase().includes("instant");

          return (
            <Link
              key={item.id}
              to={`/dashboard/products/${item.slug || item.id}`}
              className="p-4 hover:bg-muted/20 transition-colors group"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                    {item.name}
                  </p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                    {item.category}
                  </p>
                </div>
                <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full shrink-0">
                  #{i + 1}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-lg font-bold font-mono tabular-nums text-foreground">
                  {item.wholesale_price.toLocaleString()}
                  <span className="text-[10px] font-normal text-muted-foreground ml-1">MMK</span>
                </p>
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  {isInstant ? (
                    <span className="flex items-center gap-0.5 text-primary">
                      <Zap className="w-3 h-3" /> Instant
                    </span>
                  ) : (
                    <span className="flex items-center gap-0.5">
                      <Clock className="w-3 h-3" /> {speed}
                    </span>
                  )}
                  <span className="text-muted-foreground/60">|</span>
                  <span>{item.orderCount} orders</span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
