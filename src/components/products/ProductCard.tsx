import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Package } from "lucide-react";
import { useState } from "react";

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
  const highestTier = hasTiers
    ? [...pricingTiers].sort((a, b) => b.unit_price - a.unit_price)[0]
    : null;
  const maxDiscountPct = hasTiers && highestTier && lowestTier && highestTier.unit_price > 0
    ? Math.round(((highestTier.unit_price - lowestTier.unit_price) / highestTier.unit_price) * 100)
    : 0;

  const isOutOfStock = product.stock === 0;

  return (
    <div
      className="bg-card border border-border rounded-2xl flex flex-col transition-all duration-200 hover:shadow-md overflow-hidden"
      style={{
        animationDelay: `${index * 0.04}s`,
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
      }}
    >
      {/* Image */}
      <Link to={`/dashboard/products/${product.id}`} className="block">
        {product.image_url && !imgError ? (
          <div className="relative w-full aspect-[16/9] bg-muted/20">
            <img
              src={product.image_url}
              alt={product.name}
              loading="lazy"
              onError={() => setImgError(true)}
              className="w-full h-full object-cover"
            />
            <span className="absolute top-3 right-3 text-[10px] uppercase tracking-wider font-semibold text-muted-foreground px-2.5 py-1 rounded-lg bg-card/90 backdrop-blur-sm border border-border">
              {product.category}
            </span>
          </div>
        ) : (
          <div className="flex items-start justify-between px-5 pt-5">
            <div className="text-3xl">{product.icon}</div>
            <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground px-2.5 py-1 rounded-lg bg-muted/50 border border-border">
              {product.category}
            </span>
          </div>
        )}
      </Link>

      <div className="p-5 flex flex-col flex-1">
        <Link to={`/dashboard/products/${product.id}`}>
          <h3 className="font-semibold text-foreground text-base hover:text-primary transition-colors duration-200">{product.name}</h3>
        </Link>
        <p className="text-sm text-muted-foreground mt-0.5">{product.duration}</p>

        <div className="mt-auto pt-5 space-y-4">
          {/* Price section */}
          <div className="flex items-end justify-between">
            <div>
              <p className="text-xs text-muted-foreground line-through">{product.retail_price.toLocaleString()} MMK</p>
              <p className="text-2xl font-bold font-mono text-foreground tracking-tight">
                {product.wholesale_price.toLocaleString()}
                <span className="text-xs font-normal text-muted-foreground ml-1.5">MMK</span>
              </p>
              {maxDiscountPct > 0 && (
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {maxDiscountPct}% below standard rate
                </p>
              )}
            </div>
            <span className={`text-xs ${isOutOfStock ? "text-destructive font-medium" : "text-muted-foreground"}`}>
              {isOutOfStock ? "Out of stock" : `${product.stock} available`}
            </span>
          </div>

          {/* Tier hint */}
          {hasTiers && lowestTier && (
            <p className="text-[11px] text-muted-foreground">
              From <span className="font-mono font-semibold text-foreground">{lowestTier.unit_price.toLocaleString()}</span> MMK at {lowestTier.min_qty}+ qty
            </p>
          )}

          <Button
            className="w-full h-11 rounded-xl bg-primary text-primary-foreground font-semibold hover:brightness-90 transition-all"
            onClick={() => onBuyClick(product)}
            disabled={isOutOfStock || isPurchasing}
          >
            {isPurchasing ? (
              <>
                <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-2" />
                Processing...
              </>
            ) : (
              "Purchase"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
