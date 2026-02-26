import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Star, ShieldCheck, Zap, Clock, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

interface PriceComparisonTableProps {
  /** Filter by category to compare similar services */
  category?: string;
  /** Exclude a specific product */
  excludeProductId?: string;
  /** Max rows to show */
  limit?: number;
}

export default function PriceComparisonTable({
  category,
  excludeProductId,
  limit = 5,
}: PriceComparisonTableProps) {
  const { data: products = [], isLoading } = useQuery({
    queryKey: ["compare-products", category],
    queryFn: async () => {
      let query = supabase
        .from("products")
        .select("id, name, wholesale_price, processing_time, product_type, category, provider_id, delivery_time_config")
        .order("wholesale_price", { ascending: true });

      if (category) query = query.eq("category", category);
      if (excludeProductId) query = query.neq("id", excludeProductId);

      const { data } = await query.limit(limit);
      return data || [];
    },
  });

  const { data: providers = [] } = useQuery({
    queryKey: ["providers-lookup"],
    queryFn: async () => {
      const { data } = await supabase
        .from("imei_providers")
        .select("id, name, avg_rating, success_rate, total_completed, is_verified, fulfillment_type");
      return data || [];
    },
  });

  if (isLoading || products.length === 0) return null;

  const getProvider = (providerId: string | null) =>
    providers.find((p: any) => p.id === providerId);

  return (
    <div className="glass-card overflow-hidden">
      <div className="px-5 py-4 border-b border-border/30">
        <p className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground">
          Price Comparison
        </p>
        {category && (
          <p className="text-xs text-muted-foreground mt-0.5">
            Compare {category} services by price and provider
          </p>
        )}
      </div>

      {/* Header */}
      <div className="grid grid-cols-[1fr_100px_80px_80px_80px] gap-2 px-5 py-3 text-[10px] uppercase tracking-widest font-semibold text-muted-foreground border-b border-border/20 bg-muted/10">
        <span>Service</span>
        <span className="text-right">Price</span>
        <span className="text-center">Rating</span>
        <span className="text-center">Success</span>
        <span className="text-center">Speed</span>
      </div>

      {/* Rows */}
      {products.map((product: any, i: number) => {
        const provider = getProvider(product.provider_id);
        const deliveryConfig = product.delivery_time_config && typeof product.delivery_time_config === "object"
          ? (product.delivery_time_config as Record<string, string>)
          : {};
        const speed = product.product_type === "imei"
          ? product.processing_time || "1-3 Days"
          : deliveryConfig["instant"] || "Instant";
        const isBestPrice = i === 0;

        return (
          <Link
            key={product.id}
            to={`/dashboard/products/${product.id}`}
            className={cn(
              "grid grid-cols-[1fr_100px_80px_80px_80px] gap-2 px-5 py-3 text-sm items-center border-b border-border/10 last:border-b-0 transition-colors hover:bg-muted/20",
              isBestPrice && "bg-primary/[0.03]"
            )}
          >
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{product.name}</p>
              <p className="text-[11px] text-muted-foreground truncate">
                {provider?.name || "KKTech"}
                {provider?.is_verified && (
                  <ShieldCheck className="inline w-3 h-3 text-primary ml-1" />
                )}
              </p>
            </div>
            <div className="text-right">
              <p className={cn(
                "font-bold font-mono tabular-nums text-sm",
                isBestPrice ? "text-primary" : "text-foreground"
              )}>
                {product.wholesale_price.toLocaleString()}
              </p>
              <p className="text-[10px] text-muted-foreground">MMK</p>
            </div>
            <div className="flex items-center justify-center gap-1">
              <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
              <span className="text-xs font-mono">{provider?.avg_rating || "—"}</span>
            </div>
            <div className="text-center">
              <span className={cn(
                "text-xs font-mono font-semibold",
                (provider?.success_rate || 0) >= 95 ? "text-primary" : "text-foreground"
              )}>
                {provider?.success_rate || "—"}%
              </span>
            </div>
            <div className="text-center">
              <span className="text-[11px] text-muted-foreground">{speed}</span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
