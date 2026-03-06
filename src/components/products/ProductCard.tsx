import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useT, t } from "@/lib/i18n";
import { Clock, Zap, ShieldCheck } from "lucide-react";
import ProductIcon from "@/components/products/ProductIcon";

interface PricingTier {
  min_qty: number;
  max_qty: number | null;
  unit_price: number;
}

interface ProviderInfo {
  id: string;
  name: string;
  avg_rating: number | null;
  success_rate: number | null;
  total_completed: number | null;
  is_verified: boolean | null;
  fulfillment_type: string | null;
}

interface ProductCardProps {
  product: any;
  index: number;
  isPurchasing: boolean;
  onBuyClick: (product: any) => void;
  pricingTiers?: PricingTier[];
  lastRateUpdate?: string | null;
  usdRate?: number | null;
  provider?: ProviderInfo | null;
}

export default function ProductCard({
  product,
  index,
  isPurchasing,
  onBuyClick,
  pricingTiers = [],
  provider,
}: ProductCardProps) {
  const l = useT();
  const pt = product.product_type || "digital";
  const isDigital = pt === "digital";
  const isOutOfStock = isDigital ? product.stock === 0 : false;

  const hasTiers = pricingTiers.length > 0;
  const lowestTier = hasTiers
    ? [...pricingTiers].sort((a, b) => a.unit_price - b.unit_price)[0]
    : null;
  const displayPrice = product.wholesale_price;
  const hasVolumeDiscount = hasTiers && lowestTier && lowestTier.unit_price < displayPrice;

  const deliveryConfig =
    product.delivery_time_config && typeof product.delivery_time_config === "object"
      ? (product.delivery_time_config as Record<string, string>)
      : {};
  const deliveryTime =
    pt === "imei"
      ? product.processing_time || "1-3 Days"
      : deliveryConfig["instant"] || "Instant";

  const isInstant = pt === "digital" || pt === "api";
  const successRate = provider?.success_rate ?? null;

  return (
    <div
      className={cn(
        "group relative opacity-0 animate-stagger-in flex flex-col",
        "rounded-card bg-card/80 backdrop-blur-sm border border-border/30",
        "transition-all duration-300 ease-out",
        "hover:border-primary/25 hover:shadow-[0_8px_32px_-8px_hsl(var(--primary)/0.15)]",
        "hover:-translate-y-1",
      )}
      style={{ animationDelay: `${index * 0.04}s` }}
    >
      {/* Top gradient accent line */}
      <div className="absolute top-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

      <div className="p-6 flex flex-col flex-1 gap-4">
        {/* ─── Name + Type badge ─── */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <ProductIcon
              imageUrl={product.image_url}
              name={product.name}
              category={product.category}
              size="md"
              className="mt-0.5"
            />
            <div className="min-w-0 flex-1">
              <Link to={`/dashboard/products/${product.slug || product.id}`}>
                <h3 className="text-sm font-semibold text-foreground leading-snug line-clamp-2 group-hover:text-primary transition-colors duration-200">
                  {product.display_id && (
                    <span className="font-mono font-bold text-primary/70 mr-1">#{product.display_id}</span>
                  )}
                  {product.name}
                </h3>
              </Link>
              {product.duration && (
                <p className="text-[10px] text-muted-foreground/60 mt-1.5 tracking-wide uppercase">
                  {product.duration}
                </p>
              )}
            </div>
          </div>

          <span
            className={cn(
              "shrink-0 inline-flex items-center gap-1 px-3 py-1.5 text-[9px] font-bold uppercase tracking-wider rounded-pill",
              isInstant
                ? "bg-primary/8 text-primary border border-primary/15"
                : "bg-muted/15 text-muted-foreground border border-border/20"
            )}
          >
            {isInstant ? <Zap className="w-2.5 h-2.5" /> : <Clock className="w-2.5 h-2.5" />}
            {isInstant ? "Auto" : "Manual"}
          </span>
        </div>

        {/* ─── Meta chips ─── */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground/70">
            <Clock className="w-3 h-3" />
            {deliveryTime}
          </span>
          {successRate !== null && (
            <>
              <span className="w-px h-3 bg-border/30" />
              <span className="inline-flex items-center gap-1 text-[10px] text-primary/80">
                <ShieldCheck className="w-3 h-3" />
                {successRate}%
              </span>
            </>
          )}
          {provider?.is_verified && (
            <>
              <span className="w-px h-3 bg-border/30" />
              <span className="inline-flex items-center gap-1 text-[10px] text-success font-semibold">
                ✓ Verified
              </span>
            </>
          )}
        </div>

        {/* ─── Price + Action ─── */}
        <div className="mt-auto pt-4 border-t border-border/10 flex items-end justify-between gap-3">
          <div>
            <p className="text-xl font-bold font-mono tabular-nums text-primary leading-none">
              {displayPrice.toLocaleString()}
              <span className="text-[10px] font-medium text-muted-foreground/50 ml-1 tracking-normal font-sans">
                MMK
              </span>
            </p>
            {hasVolumeDiscount && lowestTier && (
              <p className="text-[10px] text-primary/50 mt-1.5 font-medium">
                {l(t.products.from)} {lowestTier.unit_price.toLocaleString()} ({lowestTier.min_qty}+)
              </p>
            )}
          </div>

          <Button
            size="sm"
            className={cn(
              "h-10 px-6 text-[11px] font-bold rounded-pill",
              "shadow-[0_2px_12px_-3px_hsl(var(--primary)/0.3)]",
              "hover:shadow-[0_6px_24px_-4px_hsl(var(--primary)/0.4)]",
              "hover:scale-[1.02] active:scale-[0.98]",
              "transition-all duration-200",
            )}
            onClick={() => onBuyClick(product)}
            disabled={isOutOfStock || isPurchasing}
          >
            {isPurchasing ? (
              <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
            ) : isOutOfStock ? (
              l(t.products.outOfStock)
            ) : (
              "Buy Now"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
