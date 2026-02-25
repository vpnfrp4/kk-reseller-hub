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
  const isOutOfStock = product.stock === 0;
  const isLowStock = product.stock > 0 && product.stock <= 5;
  const profitPerUnit = product.retail_price - product.wholesale_price;
  const hasTiers = pricingTiers.length > 0;
  const lowestTier = hasTiers ? [...pricingTiers].sort((a, b) => a.unit_price - b.unit_price)[0] : null;

  return (
    <div
      className="group relative rounded-xl border border-border bg-card opacity-0 animate-stagger-in transition-colors duration-150 hover:border-primary/30"
      style={{ animationDelay: `${index * 0.03}s` }}
    >
      <div className="p-5 sm:p-6">
        {/* Row 1: Service Identity */}
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="min-w-0 flex-1">
            <Link to={`/dashboard/products/${product.id}`}>
              <h3 className="text-sm font-semibold text-foreground leading-tight tracking-tight hover:text-primary transition-colors">
                {product.name}
              </h3>
            </Link>
            <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
              <span>{product.duration}</span>
              <span className="text-border">·</span>
              <span className="uppercase tracking-wider text-[10px] font-medium">{product.category}</span>
            </div>
          </div>
          {/* Status indicator */}
          <div
            className={cn(
              "shrink-0 flex items-center gap-1.5 rounded-md px-2 py-1 text-[10px] font-semibold tracking-wide",
              isOutOfStock
                ? "bg-destructive/8 text-destructive"
                : isLowStock
                ? "bg-warning/8 text-warning"
                : "bg-primary/8 text-primary"
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
              : isLowStock
              ? `${product.stock} ${l(t.products.left)}`
              : `${product.stock} ${l(t.products.inStock)}`}
          </div>
        </div>

        {/* Row 2: Pricing Data */}
        <div className="grid grid-cols-3 gap-3 mb-4 rounded-lg border border-border/60 bg-muted/20 p-3">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-0.5">
              Wholesale
            </p>
            <p className="text-base font-bold font-mono tabular-nums text-foreground leading-none">
              {product.wholesale_price.toLocaleString()}
              <span className="text-[10px] font-normal text-muted-foreground ml-1">MMK</span>
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-0.5">
              Retail
            </p>
            <p className="text-base font-bold font-mono tabular-nums text-foreground leading-none">
              {product.retail_price.toLocaleString()}
              <span className="text-[10px] font-normal text-muted-foreground ml-1">MMK</span>
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-0.5">
              Margin
            </p>
            <p className={cn(
              "text-base font-bold font-mono tabular-nums leading-none",
              profitPerUnit > 0 ? "text-primary" : "text-muted-foreground"
            )}>
              {profitPerUnit > 0 ? "+" : ""}{profitPerUnit.toLocaleString()}
              <span className="text-[10px] font-normal text-muted-foreground ml-1">MMK</span>
            </p>
          </div>
        </div>

        {/* Row 3: Volume note + Actions */}
        <div className="flex items-center justify-between gap-3">
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
              className="h-8 rounded-lg px-4 text-xs font-semibold"
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
              className="inline-flex items-center gap-1 h-8 px-3 rounded-lg text-xs font-medium text-muted-foreground border border-border bg-card hover:bg-muted/50 hover:text-foreground transition-colors"
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
