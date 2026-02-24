import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Package, Zap, TrendingUp } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n";

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
  const [imgError, setImgError] = useState(false);

  const hasTiers = pricingTiers.length > 0;
  const lowestTier = hasTiers ? [...pricingTiers].sort((a, b) => a.unit_price - b.unit_price)[0] : null;
  const isOutOfStock = product.stock === 0;
  const isLowStock = product.stock > 0 && product.stock <= 5;
  const profitPerUnit = product.retail_price - product.wholesale_price;
  const showProfit = profitPerUnit > 0;
  const hasImage = product.image_url && !imgError;

  return (
    <div
      className="group relative flex flex-col rounded-2xl border border-border/60 bg-card opacity-0 animate-stagger-in shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition-all duration-200 hover:shadow-[0_4px_20px_rgba(0,0,0,0.07)] hover:border-primary/20 overflow-hidden"
      style={{ animationDelay: `${index * 0.04}s` }}
    >
      {/* Stock Badge — absolute top-right */}
      <div className="absolute top-3 right-3 z-10">
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold backdrop-blur-sm",
            isOutOfStock
              ? "bg-destructive/10 text-destructive border border-destructive/20"
              : isLowStock
              ? "bg-amber-50 text-amber-700 border border-amber-200/60 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-500/20"
              : "bg-emerald-50 text-emerald-700 border border-emerald-200/60 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-500/20"
          )}
        >
          <span
            className={cn(
              "h-1.5 w-1.5 rounded-full",
              isOutOfStock ? "bg-destructive" : isLowStock ? "bg-amber-500" : "bg-emerald-500"
            )}
          />
          {isOutOfStock
            ? t.products.outOfStock.mm
            : isLowStock
            ? `${product.stock} ${t.products.left.mm}`
            : `${product.stock} ${t.products.inStock.mm}`}
        </span>
      </div>

      {/* Product Image */}
      <Link to={`/dashboard/products/${product.id}`} className="block">
        <div className="relative w-full h-[160px] bg-muted/20 flex items-center justify-center overflow-hidden">
          {hasImage ? (
            <img
              src={product.image_url}
              alt={product.name}
              loading="lazy"
              onError={() => setImgError(true)}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="flex flex-col items-center gap-2 text-muted-foreground/30">
              <Package className="w-10 h-10" strokeWidth={1} />
              <span className="text-[10px] font-semibold uppercase tracking-widest">
                {product.category}
              </span>
            </div>
          )}
          {/* Bottom gradient overlay for readability */}
          {hasImage && (
            <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-card/60 to-transparent" />
          )}
        </div>
      </Link>

      {/* Content */}
      <div className="flex flex-1 flex-col p-5">
        {/* Header row */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="min-w-0 flex-1">
            <Link to={`/dashboard/products/${product.id}`}>
              <h3 className="text-[15px] font-semibold leading-snug text-foreground transition-colors hover:text-primary truncate">
                {product.name}
              </h3>
            </Link>
            <p className="mt-0.5 text-xs text-muted-foreground">{product.duration}</p>
          </div>
          <span className="shrink-0 rounded-lg border border-border bg-muted/40 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {product.category}
          </span>
        </div>

        {/* Pricing block */}
        <div className="mb-3">
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold tabular-nums tracking-tight text-foreground">
              {product.wholesale_price.toLocaleString()}
            </span>
            <span className="text-[11px] font-medium text-muted-foreground">MMK</span>
          </div>

          {hasTiers && lowestTier && lowestTier.unit_price < product.wholesale_price && (
            <div className="mt-1.5 flex items-center gap-1.5">
              <Zap className="h-3 w-3 text-primary" />
              <p className="text-[11px] text-muted-foreground">
                {t.products.from.mm}{" "}
                <span className="font-semibold tabular-nums text-primary">
                  {lowestTier.unit_price.toLocaleString()}
                </span>{" "}
                MMK ({lowestTier.min_qty}+ {t.products.qty.mm})
              </p>
            </div>
          )}
        </div>

        {/* Profit margin */}
        {showProfit && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-200/50 bg-emerald-50/40 px-3 py-2 dark:border-emerald-500/15 dark:bg-emerald-950/20">
            <TrendingUp className="h-3.5 w-3.5 flex-shrink-0 text-emerald-600 dark:text-emerald-400" />
            <p className="text-[11px] text-muted-foreground">
              {t.products.resellAt.mm}{" "}
              <span className="font-semibold tabular-nums text-foreground">
                {product.retail_price.toLocaleString()}
              </span>{" "}
              &middot; {t.products.profit.mm}{" "}
              <span className="font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                +{profitPerUnit.toLocaleString()}
              </span>{" "}
              {t.products.perUnit.mm}
            </p>
          </div>
        )}

        {/* Actions — pushed to bottom */}
        <div className="mt-auto space-y-2 pt-1">
          <Button
            className="w-full h-10 rounded-xl text-sm font-semibold"
            onClick={() => onBuyClick(product)}
            disabled={isOutOfStock || isPurchasing}
          >
            {isPurchasing ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                {t.products.processing.mm}
              </>
            ) : isOutOfStock ? (
              t.products.outOfStock.mm
            ) : (
              t.products.buyNow.mm
            )}
          </Button>
          <Link
            to={`/dashboard/products/${product.id}`}
            className="block text-center text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            {t.products.quickView.mm}{" "}
            <span className="text-[10px] text-muted-foreground/50">
              ({t.products.quickView.en})
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}
