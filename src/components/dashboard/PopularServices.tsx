import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Money } from "@/components/shared";
import { ArrowRight } from "lucide-react";
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
            <div key={i} className="cd-service-card animate-pulse">
              <div className="cd-service-head">
                <Skeleton className="w-[42px] h-[42px] rounded-xl" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-28 mb-1" />
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
        <p className="cd-stat-delta">No popular products configured.</p>
      </div>
    );
  }

  return (
    <div className="cd-card cd-reveal">
      <div className="cd-section-title">
        <h2>Popular Services</h2>
        <button
          onClick={() => navigate("/dashboard/place-order")}
          className="text-xs font-semibold text-primary flex items-center gap-1 hover:text-primary/80 transition-colors"
        >
          View all <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="cd-services-grid">
        {products.slice(0, 6).map((product: any) => (
          <button
            key={product.id}
            onClick={() => navigate("/dashboard/place-order")}
            className="cd-service-card text-left cursor-pointer"
          >
            <div className="cd-service-head">
              <ProductIcon
                imageUrl={product.image_url}
                name={product.name}
                category={product.category}
                size="md"
              />
              <div className="cd-service-meta">
                <strong>{product.name}</strong>
                <p>{product.category || "Service"}</p>
              </div>
            </div>
            <div className="cd-service-foot">
              <span><Money amount={product.wholesale_price} compact /></span>
              <small>{product.processing_time || "normal queue"}</small>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
