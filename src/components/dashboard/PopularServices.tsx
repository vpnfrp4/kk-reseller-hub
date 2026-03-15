import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Money } from "@/components/shared";
import { ArrowRight, Clock } from "lucide-react";
import ProductIcon from "@/components/products/ProductIcon";
import { cn } from "@/lib/utils";
import { useEffect } from "react";
import { preloadImages } from "@/lib/image-preloader";

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

  // Preload above-fold product images as soon as data arrives
  useEffect(() => {
    if (products?.length) {
      preloadImages(products.slice(0, 6).map((p: any) => p.image_url), true);
    }
  }, [products]);

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-5 w-36" />
        <Skeleton className="h-36 w-full rounded-2xl" />
      </div>
    );
  }

  if (!products || products.length === 0) return null;

  const [featured, ...rest] = products;

  return (
    <div className="space-y-3">
      {/* Featured banner card — large, rounded, image-led like BNPL reference */}
      {featured && (
        <button
          onClick={() => navigate("/dashboard/place-order")}
          className="w-full rounded-2xl overflow-hidden bg-gradient-to-br from-primary/10 via-primary/5 to-secondary text-left transition-all duration-200 hover:shadow-md active:scale-[0.99] group"
        >
          <div className="p-5 flex items-center gap-4">
            <ProductIcon
              imageUrl={featured.image_url}
              name={featured.name}
              category={featured.category}
              size="lg"
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-foreground line-clamp-2 group-hover:text-primary transition-colors">
                {featured.name}
              </p>
              <p className="text-[11px] text-muted-foreground mt-1">{featured.category}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-base font-bold tabular-nums text-foreground" style={{ fontFamily: "'Space Grotesk', monospace" }}>
                  <Money amount={featured.wholesale_price} compact />
                </span>
                <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                  <Clock className="w-3 h-3" /> {featured.processing_time || "Instant"}
                </span>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-muted-foreground/30 group-hover:text-primary/50 transition-colors shrink-0" />
          </div>
        </button>
      )}

      {/* Remaining as compact list */}
      {rest.length > 0 && (
        <div className="space-y-1.5">
          {rest.slice(0, 4).map((product: any) => (
            <button
              key={product.id}
              onClick={() => navigate("/dashboard/place-order")}
              className="w-full flex items-center gap-3 p-3 rounded-2xl border border-border/15 bg-card text-left transition-all duration-150 hover:bg-secondary/30 active:scale-[0.99] group"
            >
              <ProductIcon
                imageUrl={product.image_url}
                name={product.name}
                category={product.category}
                size="sm"
              />
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-medium text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                  {product.name}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{product.category}</p>
              </div>
              <span className="text-sm font-semibold tabular-nums text-foreground shrink-0" style={{ fontFamily: "'Space Grotesk', monospace" }}>
                <Money amount={product.wholesale_price} compact />
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
