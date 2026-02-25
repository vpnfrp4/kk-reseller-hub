import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { t, useT } from "@/lib/i18n";
import { ChevronRight } from "lucide-react";

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
  const isManual = product.type === "manual";
  const isOutOfStock = isManual ? false : product.stock === 0;
  const isLowStock = isManual ? false : product.stock > 0 && product.stock <= 5;
  const profitPerUnit = product.retail_price - product.wholesale_price;
  const hasTiers = pricingTiers.length > 0;
  const lowestTier = hasTiers ? [...pricingTiers].sort((a, b) => a.unit_price - b.unit_price)[0] : null;

  return (
    <div
      className={cn(
        "group relative glass-card opacity-0 animate-stagger-in",
        "transition-all duration-300",
        "hover:border-primary/40 hover:shadow-[var(--shadow-elevated)]"
      )}
      style={{ animationDelay: `${index * 0.03}s` }}
    >
      <div className="p-5 md:p-6 space-y-5">
        {/* Row 1: Service Identity */}
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1 space-y-2">
            <Link to={`/dashboard/products/${product.id}`}>
              <h3 className="text-[18px] md:text-xl font-semibold text-foreground leading-tight tracking-wide hover:text-primary transition-colors">
                {product.name}
              </h3>
            </Link>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-primary/10 text-primary rounded-md border border-primary/20">
                {product.category}
              </span>
              {product.duration && (
                <span className="text-xs text-muted-foreground">{product.duration}</span>
              )}
            </div>
          </div>
          {/* Status indicator */}
          <div
            className={cn(
              "shrink-0 flex items-center gap-1.5 rounded-[var(--radius-btn)] px-2.5 py-1 text-[11px] font-semibold tracking-wide",
              isOutOfStock
                ? "bg-destructive/10 text-destructive"
                : isLowStock
                ? "bg-warning/10 text-warning"
                : "bg-primary/10 text-primary"
            )}
          >
            <span
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                isOutOfStock ? "bg-destructive" : isLowStock ? "bg-warning" : "bg-primary"
              )}
            />
            {isOutOfStock
              ? l(t.products.outOfStock)
              : isManual
              ? l(t.products.inStock)
              : isLowStock
              ? `${product.stock} ${l(t.products.left)}`
              : `${product.stock} ${l(t.products.inStock)}`}
          </div>
        </div>

        {/* Row 2: Pricing Data — separated by border */}
        <div className="grid grid-cols-3 gap-4 md:gap-6 pt-4 border-t border-border/30">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1.5">
              Wholesale
            </p>
            <p className="text-xl md:text-2xl font-bold font-mono tabular-nums text-foreground leading-none drop-shadow-[0_0_6px_hsl(var(--primary)/0.4)]">
              {product.wholesale_price.toLocaleString()}
              <span className="text-xs font-normal text-muted-foreground ml-1">MMK</span>
            </p>
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
              ) : isOutOfStock ? (
                l(t.products.outOfStock)
              ) : (
                l(t.products.buyNow)
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
