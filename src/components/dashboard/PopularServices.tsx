import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Money } from "@/components/shared";
import { ArrowRight, Clock } from "lucide-react";
import ProductIcon from "@/components/products/ProductIcon";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

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

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-5 w-36" />
        <div className="space-y-2.5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-2xl border border-border/30 bg-card p-4 animate-pulse">
              <div className="flex items-center gap-3">
                <Skeleton className="w-12 h-12 rounded-xl" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-20" />
                </div>
                <Skeleton className="h-5 w-16" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!products || products.length === 0) return null;

  // Show first product as a featured card, rest as list
  const [featured, ...rest] = products;

  return (
    <motion.div
      className="space-y-3"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.25 }}
    >
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-foreground">Popular Services</h2>
        <button
          onClick={() => navigate("/dashboard/place-order")}
          className="text-xs font-bold text-primary flex items-center gap-1 hover:text-primary/80 transition-colors"
        >
          See All <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Featured card — larger, like the Nike/Zara banner in BNPL reference */}
      {featured && (
        <button
          onClick={() => navigate("/dashboard/place-order")}
          className="w-full rounded-2xl overflow-hidden border border-border/30 bg-card text-left transition-all duration-200 hover:border-primary/20 active:scale-[0.99] group"
          style={{ boxShadow: "var(--shadow-card)" }}
        >
          <div className="relative bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-5">
            <div className="flex items-center gap-4">
              <ProductIcon
                imageUrl={featured.image_url}
                name={featured.name}
                category={featured.category}
                size="lg"
              />
              <div className="min-w-0 flex-1">
                <p className="text-base font-bold text-foreground line-clamp-2 group-hover:text-primary transition-colors">
                  {featured.name}
                </p>
                <p className="text-xs text-muted-foreground mt-1">{featured.category || "Service"}</p>
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-lg font-extrabold font-mono tabular-nums text-foreground">
                    <Money amount={featured.wholesale_price} compact />
                  </span>
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {featured.processing_time || "Instant"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </button>
      )}

      {/* Rest as clean list items */}
      {rest.length > 0 && (
        <div className="space-y-2">
          {rest.slice(0, 5).map((product: any) => (
            <button
              key={product.id}
              onClick={() => navigate("/dashboard/place-order")}
              className="w-full flex items-center gap-3 p-3.5 rounded-2xl border border-border/30 bg-card text-left transition-all duration-200 hover:border-primary/20 active:scale-[0.99] group"
              style={{ boxShadow: "var(--shadow-card)" }}
            >
              <ProductIcon
                imageUrl={product.image_url}
                name={product.name}
                category={product.category}
                size="sm"
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                  {product.name}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {product.category || "Service"} · {product.processing_time || "Instant"}
                </p>
              </div>
              <span className="text-sm font-bold font-mono tabular-nums text-foreground shrink-0">
                <Money amount={product.wholesale_price} compact />
              </span>
            </button>
          ))}
        </div>
      )}
    </motion.div>
  );
}
