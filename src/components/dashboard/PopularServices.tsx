import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Money } from "@/components/shared";
import { ArrowRight, Clock, Flame } from "lucide-react";
import ProductIcon from "@/components/products/ProductIcon";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const cardVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.3, delay: i * 0.06 },
  }),
};

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
      <div className="rounded-2xl border border-border/30 bg-card p-5" style={{ boxShadow: "var(--shadow-card)" }}>
        <Skeleton className="h-5 w-36 mb-4" />
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-2xl border border-border/30 bg-card p-4 animate-pulse">
              <div className="flex items-center gap-3 mb-3">
                <Skeleton className="w-11 h-11 rounded-xl" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-28" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
              <Skeleton className="h-5 w-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!products || products.length === 0) {
    return (
      <div className="rounded-2xl border border-border/30 bg-card p-5" style={{ boxShadow: "var(--shadow-card)" }}>
        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-1.5 h-6 rounded-full bg-primary" />
          <h2 className="text-sm font-bold text-foreground">Popular Services</h2>
        </div>
        <p className="text-sm text-muted-foreground">No popular products configured.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border/30 bg-card p-5" style={{ boxShadow: "var(--shadow-card)" }}>
      {/* Section header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-1.5 h-6 rounded-full bg-primary" />
          <h2 className="text-sm lg:text-base font-bold text-foreground tracking-tight">Popular Services</h2>
          <span className="text-[10px] font-bold text-primary bg-primary/8 px-2 py-0.5 rounded-pill uppercase tracking-wider flex items-center gap-1 border border-primary/15">
            <Flame className="w-3 h-3" />
            Hot
          </span>
        </div>
        <button
          onClick={() => navigate("/dashboard/place-order")}
          className="text-xs font-bold text-primary flex items-center gap-1 hover:text-primary/80 transition-colors"
        >
          View all <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Services grid — clean BNPL cards */}
      <div className="grid grid-cols-2 gap-3">
        {products.slice(0, 6).map((product: any, i: number) => (
          <motion.button
            key={product.id}
            custom={i}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate("/dashboard/place-order")}
            className="text-left rounded-2xl border border-border/30 bg-card p-4 transition-all duration-200 hover:border-primary/20 group"
            style={{ boxShadow: "var(--shadow-card)" }}
          >
            <div className="flex items-center gap-3 mb-3">
              <ProductIcon
                imageUrl={product.image_url}
                name={product.name}
                category={product.category}
                size="md"
              />
              <div className="min-w-0 flex-1">
                <strong className="text-[13px] font-semibold text-foreground line-clamp-1 group-hover:text-primary transition-colors">{product.name}</strong>
                <p className="text-[10px] text-muted-foreground/50 mt-0.5">{product.category || "Service"}</p>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold font-mono tabular-nums text-foreground">
                <Money amount={product.wholesale_price} compact />
              </span>
              <span className="text-[10px] text-muted-foreground/40 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {product.processing_time || "Instant"}
              </span>
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
