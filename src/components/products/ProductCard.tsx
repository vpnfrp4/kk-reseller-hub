import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Package, TrendingDown } from "lucide-react";
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

  return (
    <div
      className="glass-card flex flex-col animate-fade-in hover-lift hover:border-primary/30 transition-all duration-250 overflow-hidden"
      style={{ animationDelay: `${index * 0.05}s` }}
    >
      <Link to={`/dashboard/products/${product.id}`} className="block">
        {product.image_url && !imgError ? (
          <div className="relative w-full aspect-[16/9] bg-muted/30">
            <img
              src={product.image_url}
              alt={product.name}
              loading="lazy"
              onError={() => setImgError(true)}
              className="w-full h-full object-cover"
            />
            <span className="absolute top-2.5 right-2.5 text-[10px] uppercase tracking-widest gold-text font-semibold px-2.5 py-1 rounded-full bg-card/80 backdrop-blur-sm border border-primary/20">
              {product.category}
            </span>
            {maxDiscountPct > 0 && (
              <span
                className="absolute top-2.5 left-2.5 text-[10px] font-bold px-2 py-1 rounded-full bg-success text-success-foreground shadow-sm"
                style={{ animation: 'savings-pulse 2.5s ease-in-out infinite' }}
              >
                Save up to {maxDiscountPct}%
              </span>
            )}
          </div>
        ) : (
          <div className="flex items-start justify-between p-6 pb-0">
            <div className="flex items-center gap-2">
              <div className="text-3xl">{product.icon}</div>
              {maxDiscountPct > 0 && (
                <span
                  className="text-[10px] font-bold px-2 py-1 rounded-full bg-success text-success-foreground"
                  style={{ animation: 'savings-pulse 2.5s ease-in-out infinite' }}
                >
                  Save up to {maxDiscountPct}%
                </span>
              )}
            </div>
            <span className="text-[10px] uppercase tracking-widest gold-text font-semibold px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20">
              {product.category}
            </span>
          </div>
        )}
      </Link>

      <div className="p-6 flex flex-col flex-1">
        <Link to={`/dashboard/products/${product.id}`}>
          <h3 className="font-semibold text-foreground text-lg hover:text-primary transition-colors duration-200">{product.name}</h3>
        </Link>
        <p className="text-sm text-muted-foreground mb-4">{product.duration}</p>

        <div className="mt-auto space-y-3">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-xs text-muted-foreground line-through">{product.retail_price.toLocaleString()} MMK</p>
              <p className="text-xl font-bold font-mono gold-text">
                {product.wholesale_price.toLocaleString()} <span className="text-xs text-muted-foreground">MMK</span>
              </p>
            </div>
            <div className={`flex items-center gap-1 text-xs ${product.stock <= 5 ? "stock-low font-semibold" : "text-muted-foreground"}`}>
              <Package className="w-3 h-3" />
              {product.stock} left
            </div>
          </div>

          {/* Tier badge */}
          {hasTiers && lowestTier && (
            <div className="flex items-center gap-1.5 text-[11px] text-primary bg-primary/5 border border-primary/15 rounded-md px-2.5 py-1.5">
              <TrendingDown className="w-3 h-3" />
              <span>From <span className="font-mono font-semibold">{lowestTier.unit_price.toLocaleString()}</span> MMK at {lowestTier.min_qty}+ qty</span>
            </div>
          )}

          <Button
            className="w-full btn-glow gap-2"
            onClick={() => onBuyClick(product)}
            disabled={product.stock === 0 || isPurchasing}
          >
            {isPurchasing ? (
              <>
                <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <ShoppingCart className="w-4 h-4" />
                Buy Now
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
