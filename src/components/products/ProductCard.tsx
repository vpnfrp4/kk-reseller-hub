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
        "rounded-2xl bg-card/70 backdrop-blur-sm",
        "border border-border/30",
        "transition-all duration-300 ease-out",
        "hover:-translate-y-1",
        "hover:border-primary/40 hover:shadow-[0_8px_32px_-8px_hsl(var(--primary)/0.15)]",
      )}
      style={{ animationDelay: `${index * 0.04}s` }}
    >
      {/* Gold accent line at top */}
      <div className="h-[2px] bg-gradient-to-r from-transparent via-primary/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      <div className="p-5 flex flex-col flex-1 gap-3.5">
        {/* ─── Name + Badge ─── */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <Link to={`/dashboard/products/${product.slug || product.id}`}>
              <h3 className="text-[13px] font-semibold text-foreground leading-snug line-clamp-2 group-hover:text-primary transition-colors duration-200">
                {product.name}
              </h3>
            </Link>
            {product.duration && (
              <p className="text-[10px] text-muted-foreground/70 mt-1">{product.duration}</p>
            )}
          </div>

          {/* Auto/Manual badge */}
          <span
            className={cn(
              "shrink-0 inline-flex items-center gap-1 px-2 py-1 text-[9px] font-bold uppercase tracking-wider rounded-lg",
              isInstant
                ? "bg-success/10 text-success border border-success/20"
                : "bg-muted/20 text-muted-foreground border border-border/30"
            )}
          >
            {isInstant ? <Zap className="w-2.5 h-2.5" /> : <Clock className="w-2.5 h-2.5" />}
            {isInstant ? "Auto" : "Manual"}
          </span>
        </div>

        {/* ─── Meta row ─── */}
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground/80">
          <span className="inline-flex items-center gap-1 bg-muted/10 px-2 py-0.5 rounded-md border border-border/10">
            <Clock className="w-3 h-3" />
            {deliveryTime}
          </span>
          {successRate !== null && (
            <span className="inline-flex items-center gap-1 bg-primary/5 px-2 py-0.5 rounded-md border border-primary/10 text-primary">
              <ShieldCheck className="w-3 h-3" />
              {successRate}%
            </span>
          )}
          {provider?.is_verified && (
            <span className="inline-flex items-center gap-1 bg-success/10 px-1.5 py-0.5 rounded-md text-success text-[9px] font-semibold border border-success/15">
              ✓ Verified
            </span>
          )}
        </div>

        {/* ─── Price + Action ─── */}
        <div className="mt-auto pt-3 border-t border-border/15 flex items-end justify-between gap-2">
          <div>
            <p className="text-xl font-bold font-mono tabular-nums text-primary leading-none tracking-tight">
              {displayPrice.toLocaleString()}
              <span className="text-[10px] font-medium text-muted-foreground/60 ml-1 tracking-normal">MMK</span>
            </p>
            {hasVolumeDiscount && lowestTier && (
              <p className="text-[10px] text-primary/60 mt-1 font-medium">
                {l(t.products.from)} {lowestTier.unit_price.toLocaleString()} ({lowestTier.min_qty}+)
              </p>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              size="sm"
              className={cn(
                "h-9 px-5 text-[11px] font-bold rounded-xl",
                "bg-gradient-to-r from-primary to-primary/80",
                "hover:from-primary hover:to-primary/90",
                "shadow-[0_2px_12px_-3px_hsl(var(--primary)/0.4)]",
                "hover:shadow-[0_4px_20px_-4px_hsl(var(--primary)/0.5)]",
                "hover:scale-[1.03] active:scale-[0.98]",
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
                "Order"
              )}
            </Button>
            <Link
              to={`/dashboard/products/${product.slug || product.id}`}
              className={cn(
                "h-9 w-9 inline-flex items-center justify-center rounded-xl",
                "text-muted-foreground border border-border/30",
                "hover:bg-primary/10 hover:text-primary hover:border-primary/30",
                "transition-all duration-200"
              )}
            >
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
