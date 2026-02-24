import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Package } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

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
  const lowestTier = hasTiers
    ? [...pricingTiers].sort((a, b) => a.unit_price - b.unit_price)[0]
    : null;

  const isOutOfStock = product.stock === 0;
  const isLowStock = product.stock > 0 && product.stock <= 5;

  // Profit indicator
  const profitPerUnit = product.retail_price - product.wholesale_price;
  const showProfit = profitPerUnit > 0;

  const hasImage = product.image_url && !imgError;

  return (
    <div
      className="glass-card flex flex-col opacity-0 animate-stagger-in overflow-hidden"
      style={{ animationDelay: `${index * 0.04}s` }}
    >
      {/* Product Image */}
      <Link to={`/dashboard/products/${product.id}`} className="block">
        <div className="w-full h-[150px] bg-muted/30 flex items-center justify-center overflow-hidden">
          {hasImage ? (
            <img
              src={product.image_url}
              alt={product.name}
              loading="lazy"
              onError={() => setImgError(true)}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="flex flex-col items-center gap-1.5 text-muted-foreground/40">
              <Package className="w-10 h-10" strokeWidth={1} />
              <span className="text-[10px] font-medium uppercase tracking-wider">{product.category}</span>
            </div>
          )}
        </div>
      </Link>

      {/* Info Section */}
      <div className="p-card space-y-compact">
        {/* Name + Duration + Category */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <Link to={`/dashboard/products/${product.id}`}>
              <h3 className="font-semibold text-foreground text-sm leading-snug hover:text-primary transition-colors truncate">
                {product.name}
              </h3>
            </Link>
            <p className="text-xs text-muted-foreground mt-0.5">{product.duration}</p>
          </div>
          <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground px-2 py-0.5 rounded-md bg-muted/50 border border-border shrink-0">
            {product.category}
          </span>
        </div>

        {/* Stock Indicator */}
        <div className="flex items-center gap-1.5">
          <span
            className={cn(
              "w-2 h-2 rounded-full shrink-0",
              isOutOfStock ? "bg-destructive" : isLowStock ? "bg-warning" : "bg-success"
            )}
          />
          <span
            className={cn(
              "text-xs font-medium",
              isOutOfStock ? "text-destructive" : isLowStock ? "text-warning" : "text-muted-foreground"
            )}
          >
            {isOutOfStock ? "Out of stock" : isLowStock ? `${product.stock} left` : `${product.stock} in stock`}
          </span>
        </div>
      </div>

      {/* Price Section */}
      <div className="p-card pt-compact flex-1 flex flex-col">
        <div className="space-y-1">
          <p className="text-2xl font-bold font-mono tabular-nums text-foreground tracking-tight leading-none">
            {product.wholesale_price.toLocaleString()}
            <span className="text-[11px] font-medium text-muted-foreground ml-1">MMK</span>
          </p>

          {hasTiers && lowestTier && lowestTier.unit_price < product.wholesale_price && (
            <p className="text-[11px] text-muted-foreground">
              From{" "}
              <span className="font-mono font-semibold text-primary">
                {lowestTier.unit_price.toLocaleString()}
              </span>{" "}
              MMK ({lowestTier.min_qty}+ qty)
            </p>
          )}
        </div>

        {/* Profit Indicator */}
        {showProfit && (
          <div className="mt-compact rounded-[var(--radius-btn)] bg-success/[0.06] border border-success/15 px-2.5 py-1.5">
            <p className="text-[11px] text-muted-foreground">
              Resell at{" "}
              <span className="font-mono font-semibold text-foreground">
                {product.retail_price.toLocaleString()}
              </span>{" "}
              · Profit{" "}
              <span className="font-mono font-semibold text-success">
                +{profitPerUnit.toLocaleString()}
              </span>{" "}
              / unit
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="mt-auto pt-card space-y-compact">
          <Button
            className="w-full h-10 rounded-[var(--radius-btn)] bg-primary text-primary-foreground font-semibold text-sm hover:brightness-90 transition-all"
            onClick={() => onBuyClick(product)}
            disabled={isOutOfStock || isPurchasing}
          >
            {isPurchasing ? (
              <>
                <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-2" />
                Processing...
              </>
            ) : isOutOfStock ? (
              "Out of Stock"
            ) : (
              "Buy Now"
            )}
          </Button>
          <Link
            to={`/dashboard/products/${product.id}`}
            className="block text-center text-xs text-muted-foreground hover:text-foreground transition-colors font-medium"
          >
            Quick View →
          </Link>
        </div>
      </div>
    </div>
  );
}
