import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Money } from "@/components/shared";
import { ArrowRight, Clock, Zap } from "lucide-react";
import ProductIcon from "@/components/products/ProductIcon";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const cardVariants = {
  hidden: { opacity: 0, y: 12, scale: 0.97 },
  visible: (i: number) => ({
    opacity: 1, y: 0, scale: 1,
    transition: { type: "spring", stiffness: 380, damping: 26, delay: i * 0.06 },
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
      <div className="cd-card">
        <Skeleton className="h-5 w-36 mb-4" />
        <div className="cd-services-grid">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-[var(--radius-card)] border border-border/40 bg-card/60 p-4 animate-pulse">
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
      <div className="cd-card">
        <div className="cd-section-title">
          <h2>Popular Services</h2>
          <span>Top picks</span>
        </div>
        <p className="cd-stat-delta text-muted-foreground text-sm">No popular products configured.</p>
      </div>
    );
  }

  return (
    <div className="cd-card cd-reveal">
      {/* Section header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-1.5 h-6 rounded-full bg-gradient-to-b from-primary to-primary-glow" />
          <h2 className="text-sm lg:text-base font-extrabold text-foreground tracking-tight">Popular Services</h2>
          <span className="text-[10px] font-bold text-primary bg-primary/8 px-2 py-0.5 rounded-full uppercase tracking-wider">Hot</span>
        </div>
        <button
          onClick={() => navigate("/dashboard/place-order")}
          className="text-xs font-bold text-primary flex items-center gap-1 hover:text-primary/80 transition-colors group"
        >
          View all <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>

      {/* Services grid */}
      <div className="cd-services-grid">
        {products.slice(0, 6).map((product: any, i: number) => (
          <motion.button
            key={product.id}
            custom={i}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            whileHover={{ y: -3, transition: { duration: 0.2 } }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate("/dashboard/place-order")}
            className={cn(
              "cd-service-card text-left cursor-pointer relative group",
              "hover:border-primary/20 hover:shadow-[0_8px_30px_-12px_hsl(var(--primary)/0.15)]",
            )}
          >
            {/* Hover glow effect */}
            <div className="absolute inset-0 rounded-[inherit] bg-gradient-to-br from-primary/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

            <div className="cd-service-head relative z-10">
              <ProductIcon
                imageUrl={product.image_url}
                name={product.name}
                category={product.category}
                size="md"
              />
              <div className="cd-service-meta">
                <strong className="line-clamp-1 text-[13px]">{product.name}</strong>
                <p className="flex items-center gap-1">
                  <span className="truncate">{product.category || "Service"}</span>
                </p>
              </div>
            </div>
            <div className="cd-service-foot relative z-10">
              <span className="font-extrabold"><Money amount={product.wholesale_price} compact /></span>
              <small className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {product.processing_time || "normal"}
              </small>
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
