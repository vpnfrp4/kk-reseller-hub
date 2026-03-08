import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Money } from "@/components/shared";
import { ArrowRight, Zap, Clock } from "lucide-react";
import ProductIcon from "@/components/products/ProductIcon";

export default function PopularServices() {
  const navigate = useNavigate();

  const { data: config } = useQuery({
    queryKey: ["popular-services-config-display"],
    queryFn: async () => {
      const { data } = await supabase
        .from("system_settings")
        .select("value")
        .eq("key", "popular_services_config")
        .single();
      return (data?.value as any)?.max_display ?? 6;
    },
    staleTime: 300000,
  });

  const maxDisplay = config ?? 6;

  const { data: products, isLoading } = useQuery({
    queryKey: ["popular-services-dashboard"],
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("id, name, category, wholesale_price, processing_time, image_url, fulfillment_modes, product_type, slug, is_popular, popular_sort_order")
        .eq("is_popular", true)
        .order("popular_sort_order")
        .limit(maxDisplay);
      // Fallback: if no popular services flagged, show top by sort_order
      if (!data || data.length === 0) {
        const { data: fallback } = await supabase
          .from("products")
          .select("id, name, category, wholesale_price, processing_time, image_url, fulfillment_modes, product_type, slug")
          .neq("type", "disabled")
          .order("sort_order")
          .limit(maxDisplay);
        return fallback || [];
      }
      return data;
    },
    staleTime: 60000,
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-5 w-36" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-card border border-border/50 bg-card p-4 animate-pulse">
              <div className="flex items-center gap-3 mb-3">
                <Skeleton className="w-11 h-11 rounded-xl" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-32 mb-1" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
              <Skeleton className="h-9 w-full rounded-btn" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!products || products.length === 0) return null;

  const isInstant = (p: any) => {
    try {
      const modes = typeof p.fulfillment_modes === "string" ? JSON.parse(p.fulfillment_modes) : p.fulfillment_modes;
      return Array.isArray(modes) && modes.includes("instant");
    } catch {
      return false;
    }
  };

  return (
    <div className="space-y-3">
      <div className="cd-section-title">
        <div className="flex items-center gap-2">
          <div className="w-1 h-5 rounded-full bg-gradient-to-b from-primary to-accent" />
          <h2>Popular Services</h2>
        </div>
        <button
          onClick={() => navigate("/dashboard/place-order")}
          className="text-xs font-semibold text-primary flex items-center gap-1 hover:text-primary/80 transition-colors"
        >
          View all <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {products.map((product: any, i: number) => (
          <button
            key={product.id}
            onClick={() => navigate(`/dashboard/place-order`)}
            className={cn(
              "relative overflow-hidden rounded-card border border-border/50 bg-card p-4",
              "text-left transition-all duration-300 group",
              "hover:border-primary/25 hover:shadow-elevated hover:-translate-y-0.5",
              "active:scale-[0.98]",
              "opacity-0 animate-stagger-in"
            )}
            style={{ animationDelay: `${0.1 + i * 0.06}s` }}
          >
            <div className="flex items-center gap-3 mb-3">
              <ProductIcon
                imageUrl={product.image_url}
                name={product.name}
                category={product.category}
                size="lg"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                  {product.name}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  {isInstant(product) ? (
                    <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-success">
                      <Zap className="w-3 h-3" /> Instant
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-muted-foreground">
                      <Clock className="w-3 h-3" /> {product.processing_time || "5-30 min"}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Money
                amount={product.wholesale_price}
                className="text-base font-extrabold font-mono tabular-nums text-foreground"
              />
              <span className="text-[10px] font-bold text-primary bg-primary/8 px-2.5 py-1 rounded-pill group-hover:bg-primary/15 transition-colors">
                Order →
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
