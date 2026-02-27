import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useT, t } from "@/lib/i18n";
import {
  ChevronRight,
  Clock,
  ShieldCheck,
  Star,
  Zap,
  User,
  TrendingUp,
} from "lucide-react";

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
  const hasStock = isDigital;
  const isOutOfStock = hasStock ? product.stock === 0 : false;

  const hasTiers = pricingTiers.length > 0;
  const lowestTier = hasTiers
    ? [...pricingTiers].sort((a, b) => a.unit_price - b.unit_price)[0]
    : null;
  const displayPrice = product.wholesale_price;
  const hasVolumeDiscount =
    hasTiers && lowestTier && lowestTier.unit_price < displayPrice;

  // Delivery time from config or processing_time
  const deliveryConfig =
    product.delivery_time_config &&
    typeof product.delivery_time_config === "object"
      ? (product.delivery_time_config as Record<string, string>)
      : {};
  const deliveryTime =
    pt === "imei"
      ? product.processing_time || "1-3 Days"
      : deliveryConfig["instant"] || "Instant Delivery";

  // Fulfillment type badge
  const fulfillmentLabel =
    pt === "api"
      ? "Auto"
      : pt === "imei" || pt === "manual"
      ? "Manual"
      : "Instant";

  const providerName = provider?.name || product.brand || product.category || "—";
  const successRate = provider?.success_rate ?? null;
  const providerRating = provider?.avg_rating ?? null;
  const completedOrders = provider?.total_completed ?? null;

  const buyLabel = () => {
    if (isPurchasing) return l(t.products.processing);
    if (isOutOfStock) return l(t.products.outOfStock);
    return "Order Now";
  };

  return (
    <div
      className={cn(
        "group relative glass-card opacity-0 animate-stagger-in",
        "transition-all duration-300 ease-out",
        "border-primary/[0.06]",
        "hover:border-primary/30 hover:shadow-[0_4px_30px_-4px_rgba(212,175,55,0.12)] hover:-translate-y-1"
      )}
      style={{ animationDelay: `${index * 0.06}s` }}
    >
      <div className="p-5 md:p-6 space-y-4">
        {/* Row 1: Service Name + Status */}
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1 space-y-2">
            <Link to={`/dashboard/products/${product.id}`}>
              <h3 className="text-lg md:text-xl font-semibold text-foreground leading-tight tracking-wide hover:text-primary transition-colors">
                {product.name}
              </h3>
            </Link>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-primary/10 text-primary rounded-md border border-primary/20">
                {product.category}
              </span>
              {product.duration && (
                <span className="text-xs text-muted-foreground">
                  {product.duration}
                </span>
              )}
            </div>
          </div>

          {/* Fulfillment type badge */}
          <div
            className={cn(
              "shrink-0 flex items-center gap-1.5 rounded-[var(--radius-btn)] px-2.5 py-1 text-[11px] font-semibold tracking-wide",
              fulfillmentLabel === "Instant"
                ? "bg-primary/10 text-primary"
                : fulfillmentLabel === "Auto"
                ? "bg-primary/10 text-primary"
                : "bg-muted/40 text-muted-foreground"
            )}
          >
            {fulfillmentLabel === "Instant" ? (
              <Zap className="w-3 h-3" />
            ) : (
              <Clock className="w-3 h-3" />
            )}
            {fulfillmentLabel}
          </div>
        </div>

        {/* Row 2: Provider + Delivery + Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-border/30">
          {/* Provider */}
          <div className="flex items-center gap-2">
            <div className={cn(
              "w-7 h-7 rounded-full border flex items-center justify-center shrink-0",
              provider?.is_verified
                ? "bg-primary/10 border-primary/25"
                : "bg-muted/40 border-border/40"
            )}>
              {provider?.is_verified ? (
                <ShieldCheck className="w-3.5 h-3.5 text-primary" />
              ) : (
                <User className="w-3.5 h-3.5 text-muted-foreground" />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                Provider
              </p>
              <div className="flex items-center gap-1.5">
                <p className="text-xs font-semibold text-foreground truncate">
                  {providerName}
                </p>
                {provider?.is_verified && (
                  <span className="shrink-0 text-[9px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-1.5 py-px rounded">
                    Verified
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Rating */}
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-0.5">
              Rating
            </p>
            <div className="flex items-center gap-1">
              <Star className="w-3.5 h-3.5 text-primary fill-primary" />
              <span className="text-sm font-semibold text-foreground font-mono">
                {providerRating !== null ? providerRating : "—"}
              </span>
            </div>
          </div>

          {/* Success Rate */}
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-0.5">
              Success
            </p>
            <div className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-primary" />
              <span className="text-sm font-semibold text-primary font-mono">
                {successRate !== null ? `${successRate}%` : "—"}
              </span>
            </div>
          </div>

          {/* Completed */}
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-0.5">
              Completed
            </p>
            <div className="flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-sm font-semibold text-foreground font-mono">
                {completedOrders !== null ? completedOrders.toLocaleString() : "—"}
              </span>
            </div>
          </div>
        </div>

        {/* Row 3: Price + Delivery + Actions */}
        <div className="flex items-end justify-between gap-4 pt-3 border-t border-border/30">
          {/* Price block */}
          <div className="space-y-1">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
              Price
            </p>
            <p className="text-2xl md:text-3xl font-bold font-mono tabular-nums text-primary leading-none">
              {displayPrice.toLocaleString()}
              <span className="text-xs font-normal text-muted-foreground ml-1">
                MMK
              </span>
            </p>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {deliveryTime}
              </span>
              {hasVolumeDiscount && lowestTier && (
                <span className="text-[11px] text-primary font-medium">
                  {l(t.products.from)} {lowestTier.unit_price.toLocaleString()}{" "}
                  MMK ({lowestTier.min_qty}+)
                </span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              className="h-10 rounded-[var(--radius-btn)] px-6 text-xs font-semibold btn-glow"
              onClick={() => onBuyClick(product)}
              disabled={isOutOfStock || isPurchasing}
            >
              {isPurchasing ? (
                <>
                  <div className="mr-1.5 h-3 w-3 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                  {l(t.products.processing)}
                </>
              ) : (
                buyLabel()
              )}
            </Button>
            <Link
              to={`/dashboard/products/${product.id}`}
              className="inline-flex items-center gap-1 h-10 px-3 rounded-[var(--radius-btn)] text-xs font-medium text-muted-foreground border border-primary/20 bg-transparent hover:bg-primary/5 hover:text-primary hover:border-primary/40 transition-all"
            >
              Details
              <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
