import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { t, useT } from "@/lib/i18n";
import { ChevronRight, Smartphone, Clock, Cpu } from "lucide-react";

interface PricingTier {
  min_qty: number;
  max_qty: number | null;
  unit_price: number;
}

interface ProductCardProps {
  product: any;
  index: number;
  isPurchasing: boolean;
  onBuyClick: (product: any) => void;
  pricingTiers?: PricingTier[];
}

export default function ProductCard({ product, index, isPurchasing, onBuyClick, pricingTiers = [] }: ProductCardProps) {
  const l = useT();
  const pt = product.product_type || "digital";
  const isDigital = pt === "digital";
  const isImei = pt === "imei";
  const isManualType = pt === "manual";
  const isApiType = pt === "api";
  const hasStock = isDigital; // Only digital products track stock
  const isOutOfStock = hasStock ? product.stock === 0 : false;
  const isLowStock = hasStock ? product.stock > 0 && product.stock <= 5 : false;
  const profitPerUnit = product.retail_price - product.wholesale_price;
  const hasTiers = pricingTiers.length > 0;
  const lowestTier = hasTiers ? [...pricingTiers].sort((a, b) => a.unit_price - b.unit_price)[0] : null;

  const statusDisplay = () => {
    if (isOutOfStock) return { text: l(t.products.outOfStock), className: "bg-destructive/10 text-destructive", dot: "bg-destructive" };
    if (isLowStock) return { text: `${product.stock} ${l(t.products.left)}`, className: "bg-warning/10 text-warning", dot: "bg-warning" };
    if (isImei) return { text: product.processing_time || "1-3 Days", className: "bg-amber-500/10 text-amber-600 dark:text-amber-400", dot: "bg-amber-500" };
    if (isManualType) return { text: l(t.products.inStock), className: "bg-primary/10 text-primary", dot: "bg-primary" };
    if (isApiType) return { text: "Auto", className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400", dot: "bg-emerald-500" };
    return { text: `${product.stock} ${l(t.products.inStock)}`, className: "bg-primary/10 text-primary", dot: "bg-primary" };
  };

  const status = statusDisplay();

  const typeBadge = () => {
    if (isImei) return <Smartphone className="w-3 h-3 text-amber-500 shrink-0" />;
    if (isManualType) return <Clock className="w-3 h-3 text-muted-foreground shrink-0" />;
    if (isApiType) return <Cpu className="w-3 h-3 text-emerald-500 shrink-0" />;
    return null;
  };

  // Button label based on product type
  const buyLabel = () => {
    if (isPurchasing) return l(t.products.processing);
    if (isOutOfStock) return l(t.products.outOfStock);
    if (isImei) return "Order";
    return l(t.products.buyNow);
  };

  return (
    <div
      className={cn(
        "group relative glass-card opacity-0 animate-stagger-in",
        "transition-all duration-300 ease-out",
        "hover:border-primary/40 hover:shadow-[var(--shadow-elevated)] hover:-translate-y-0.5 hover:scale-[1.005]"
      )}
      style={{ animationDelay: `${index * 0.07}s` }}
    >
      <div className="p-5 md:p-6 space-y-5">
        {/* Row 1: Service Identity */}
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1 space-y-2">
            <Link to={`/dashboard/products/${product.id}`}>
              <h3 className="text-[18px] md:text-xl font-semibold text-foreground leading-tight tracking-wide hover:text-primary transition-colors flex items-center gap-2">
                {product.name}
                {typeBadge()}
              </h3>
            </Link>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-primary/10 text-primary rounded-md border border-primary/20">
                {product.category}
              </span>
              {product.duration && (
                <span className="text-xs text-muted-foreground">{product.duration}</span>
              )}
              {isImei && product.brand && (
                <span className="text-[10px] text-muted-foreground">{product.brand} · {product.country || "All"}</span>
              )}
            </div>
          </div>
          {/* Status indicator */}
          <div className={cn("shrink-0 flex items-center gap-1.5 rounded-[var(--radius-btn)] px-2.5 py-1 text-[11px] font-semibold tracking-wide", status.className)}>
            <span className={cn("h-1.5 w-1.5 rounded-full", status.dot)} />
            {status.text}
          </div>
        </div>

        {/* Row 2: Pricing Data */}
        <div className="grid grid-cols-3 gap-4 md:gap-6 pt-4 border-t border-border/30">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1.5">
              Wholesale
            </p>
            <p className="text-xl md:text-2xl font-bold font-mono tabular-nums text-foreground leading-none drop-shadow-[0_0_6px_hsl(var(--primary)/0.4)]">
              {product.wholesale_price.toLocaleString()}
              <span className="text-xs font-normal text-muted-foreground ml-1">MMK</span>
            </p>
            {product.base_currency === "USD" && product.base_price > 0 && (
              <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">${product.base_price} USD</p>
            )}
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1.5">
              Retail
            </p>
            <p className="text-base md:text-lg font-medium font-mono tabular-nums text-muted-foreground leading-none">
              {product.retail_price.toLocaleString()}
              <span className="text-xs font-normal text-muted-foreground/70 ml-1">MMK</span>
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1.5">
              Margin
            </p>
            <p className={cn(
              "text-base md:text-lg font-semibold font-mono tabular-nums leading-none",
              profitPerUnit > 0 ? "text-primary" : "text-muted-foreground"
            )}>
              {profitPerUnit > 0 ? "+" : ""}{profitPerUnit.toLocaleString()}
              <span className="text-xs font-normal text-muted-foreground/70 ml-1">MMK</span>
            </p>
          </div>
        </div>

        {/* Row 3: Volume note + Actions */}
        <div className="flex items-center justify-between gap-3 pt-1">
          <div className="min-w-0 flex-1">
            {hasTiers && lowestTier && lowestTier.unit_price < product.wholesale_price && (
              <p className="text-[11px] text-muted-foreground">
                Volume: {l(t.products.from)}{" "}
                <span className="font-mono font-semibold text-primary">
                  {lowestTier.unit_price.toLocaleString()}
                </span>{" "}
                MMK ({lowestTier.min_qty}+ {l(t.products.qty)})
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              className="h-9 rounded-[var(--radius-btn)] px-5 text-xs font-semibold btn-glow"
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
              className="inline-flex items-center gap-1 h-9 px-3 rounded-[var(--radius-btn)] text-xs font-medium text-muted-foreground border border-border/40 bg-muted/20 hover:bg-muted/40 hover:text-foreground transition-colors"
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
