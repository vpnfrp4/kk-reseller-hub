import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useT, t } from "@/lib/i18n";
import { Clock, Zap, ChevronRight, ShieldCheck } from "lucide-react";

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
        "group relative opacity-0 animate-stagger-in overflow-hidden flex flex-col",
        "rounded-[var(--radius-card)] border border-border/40 bg-card",
        "transition-all duration-200 ease-out",
        "hover:-translate-y-1 hover:shadow-[var(--shadow-elevated)]",
        "hover:border-primary/20",
      )}
      style={{ animationDelay: `${index * 0.04}s` }}
    >
      <div className="p-4 flex flex-col flex-1 gap-3">
        {/* Top: Name + Badge */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <Link to={`/dashboard/products/${product.id}`}>
              <h3 className="text-[13px] font-semibold text-foreground leading-snug line-clamp-2 group-hover:text-primary transition-colors duration-200">
                {product.name}
              </h3>
            </Link>
            {product.duration && (
              <p className="text-[10px] text-muted-foreground mt-0.5">{product.duration}</p>
            )}
          </div>
          <span
            className={cn(
              "shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider rounded border",
              isInstant
                ? "bg-primary/[0.08] text-primary border-primary/20"
                : "bg-muted/30 text-muted-foreground border-border/30"
            )}
          >
            {isInstant ? <Zap className="w-2.5 h-2.5" /> : <Clock className="w-2.5 h-2.5" />}
            {isInstant ? "Auto" : "Manual"}
          </span>
        </div>

        {/* Meta row */}
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {deliveryTime}
          </span>
          {successRate !== null && (
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-primary" />
              {successRate}%
            </span>
          )}
          {provider?.is_verified && (
            <span className="text-primary font-bold text-[8px] bg-primary/10 px-1 rounded">✓ Verified</span>
          )}
        </div>

        {/* Price + Actions — pushed to bottom */}
        <div className="mt-auto pt-2 border-t border-border/20 flex items-end justify-between gap-2">
          <div>
            <p className="text-lg font-bold font-mono tabular-nums text-primary leading-none">
              {displayPrice.toLocaleString()}
              <span className="text-[9px] font-normal text-muted-foreground ml-1">MMK</span>
            </p>
            {hasVolumeDiscount && lowestTier && (
              <p className="text-[10px] text-primary/70 mt-0.5">
                {l(t.products.from)} {lowestTier.unit_price.toLocaleString()} ({lowestTier.min_qty}+)
              </p>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              size="sm"
              className="h-8 px-4 text-[11px] font-semibold rounded-[var(--radius-btn)] btn-glow"
              onClick={() => onBuyClick(product)}
              disabled={isOutOfStock || isPurchasing}
            >
              {isPurchasing ? (
                <div className="h-3 w-3 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
              ) : isOutOfStock ? (
                l(t.products.outOfStock)
              ) : (
                "Order"
              )}
            </Button>
            <Link
              to={`/dashboard/products/${product.id}`}
              className="h-8 w-8 inline-flex items-center justify-center rounded-[var(--radius-btn)] text-muted-foreground border border-border/30 hover:bg-primary/5 hover:text-primary hover:border-primary/30 transition-all duration-200"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
