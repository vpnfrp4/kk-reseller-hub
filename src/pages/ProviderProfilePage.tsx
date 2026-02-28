import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import Breadcrumb from "@/components/Breadcrumb";
import { useT, t } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import {
  Star,
  ShieldCheck,
  TrendingUp,
  User,
  ChevronRight,
  Clock,
  Zap,
  Package,
} from "lucide-react";

export default function ProviderProfilePage() {
  const l = useT();
  const { id } = useParams<{ id: string }>();

  const { data: provider, isLoading: providerLoading } = useQuery({
    queryKey: ["provider-profile", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("imei_providers_public" as any)
        .select("*")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: ["provider-products", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("*")
        .eq("provider_id", id!)
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true });
      return data || [];
    },
    enabled: !!id,
  });

  const isLoading = providerLoading || productsLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!provider) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground text-sm">Provider not found</p>
      </div>
    );
  }

  const rating = provider.avg_rating || 0;
  const successRate = provider.success_rate || 0;
  const completed = provider.total_completed || 0;
  const reviews = provider.total_reviews || 0;

  return (
    <div className="space-y-[var(--space-section)] max-w-3xl mx-auto animate-fade-in">
      <Breadcrumb
        items={[
          { label: l(t.nav.dashboard), path: "/dashboard" },
          { label: l(t.nav.products), path: "/dashboard/products" },
          { label: provider.name },
        ]}
      />

      {/* Provider header */}
      <section className="glass-card p-5 md:p-6 space-y-5">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-muted/40 border border-border/40 flex items-center justify-center shrink-0">
            <span className="text-xl font-bold text-muted-foreground">
              {provider.name?.charAt(0)}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-xl md:text-2xl font-semibold text-foreground tracking-wide">
                {provider.name}
              </h1>
              {provider.is_verified && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold bg-primary/10 text-primary rounded-md border border-primary/20">
                  <ShieldCheck className="w-3 h-3" />
                  Verified
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground capitalize">
              {provider.fulfillment_type === "api" ? "Automated" : "Manual"}{" "}
              Provider
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-border/30">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1">
              Rating
            </p>
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
              <span className="text-lg font-bold font-mono text-foreground">
                {rating > 0 ? rating : "—"}
              </span>
              <span className="text-[11px] text-muted-foreground">
                ({reviews})
              </span>
            </div>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1">
              Success Rate
            </p>
            <span
              className={cn(
                "text-lg font-bold font-mono",
                successRate >= 95
                  ? "text-primary"
                  : successRate >= 80
                  ? "text-amber-500"
                  : "text-destructive"
              )}
            >
              {successRate}%
            </span>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1">
              Completed
            </p>
            <div className="flex items-center gap-1">
              <TrendingUp className="w-4 h-4 text-muted-foreground" />
              <span className="text-lg font-bold font-mono text-foreground">
                {completed.toLocaleString()}
              </span>
            </div>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1">
              Products
            </p>
            <div className="flex items-center gap-1">
              <Package className="w-4 h-4 text-muted-foreground" />
              <span className="text-lg font-bold font-mono text-foreground">
                {products.length}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Products list */}
      <section className="space-y-3">
        <p className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground">
          Products by {provider.name}
        </p>
        {products.length === 0 ? (
          <div className="glass-card p-8 text-center">
            <Package className="mx-auto mb-3 h-8 w-8 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">
              No products available
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-[var(--space-compact)]">
            {products.map((product: any) => {
              const pt = product.product_type || "digital";
              const fulfillmentLabel =
                pt === "api"
                  ? "Auto"
                  : pt === "imei" || pt === "manual"
                  ? "Manual"
                  : "Instant";
              const deliveryConfig =
                product.delivery_time_config &&
                typeof product.delivery_time_config === "object"
                  ? (product.delivery_time_config as Record<string, string>)
                  : {};
              const deliveryTime =
                pt === "imei"
                  ? product.processing_time || "1-3 Days"
                  : deliveryConfig["instant"] || "Instant Delivery";

              return (
                <Link
                  key={product.id}
                  to={`/dashboard/products/${product.id}`}
                  className="glass-card p-4 md:p-5 flex items-center justify-between gap-4 group hover:border-primary/40 hover:shadow-[var(--shadow-elevated)] transition-all duration-300"
                >
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                      {product.name}
                    </h3>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-primary/10 text-primary rounded-md border border-primary/20">
                        {product.category}
                      </span>
                      {product.duration && (
                        <span className="text-[11px] text-muted-foreground">
                          {product.duration}
                        </span>
                      )}
                      <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                        {fulfillmentLabel === "Instant" ? (
                          <Zap className="w-3 h-3" />
                        ) : (
                          <Clock className="w-3 h-3" />
                        )}
                        {deliveryTime}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <p className="text-lg font-bold font-mono tabular-nums text-foreground">
                        {product.wholesale_price.toLocaleString()}
                      </p>
                      <p className="text-[10px] text-muted-foreground">MMK</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
