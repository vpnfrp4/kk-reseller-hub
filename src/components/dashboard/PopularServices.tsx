import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Money } from "@/components/shared";
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
      <div className="cd-card cd-reveal">
        <Skeleton className="h-5 w-36 mb-3" />
        <div className="cd-services-grid">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28 rounded-[0.92rem]" />
          ))}
        </div>
      </div>
    );
  }

  if (!products || products.length === 0) return null;

  return (
    <div className="cd-card cd-reveal">
      <div className="cd-section-title">
        <h2>Popular Services</h2>
        <span
          className="text-primary cursor-pointer hover:underline"
          onClick={() => navigate("/dashboard/place-order")}
        >
          View all →
        </span>
      </div>

      <div className="cd-services-grid">
        {products.slice(0, 6).map((product: any) => (
          <button
            key={product.id}
            onClick={() => navigate("/dashboard/place-order")}
            className="cd-service-card text-left"
          >
            <div className="cd-service-head">
              <div className="cd-service-thumb">
                <ProductIcon
                  imageUrl={product.image_url}
                  name={product.name}
                  category={product.category}
                  size="sm"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="cd-service-meta">
                <strong>{product.name}</strong>
                <p>{product.category}</p>
              </div>
            </div>
            <div className="cd-service-foot">
              <span style={{ fontFamily: "var(--font-display)" }}>
                <Money amount={product.wholesale_price} compact />
              </span>
              <small>{product.processing_time || "Instant"}</small>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
