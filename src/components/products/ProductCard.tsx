import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Package } from "lucide-react";

interface ProductCardProps {
  product: any;
  index: number;
  isPurchasing: boolean;
  onBuyClick: (product: any) => void;
}

export default function ProductCard({ product, index, isPurchasing, onBuyClick }: ProductCardProps) {
  return (
    <div
      className="glass-card p-6 flex flex-col animate-fade-in hover-lift hover:border-primary/30 transition-all duration-250"
      style={{ animationDelay: `${index * 0.05}s` }}
    >
      <Link to={`/dashboard/products/${product.id}`} className="flex items-start justify-between mb-4">
        <div className="text-3xl">{product.icon}</div>
        <span className="text-[10px] uppercase tracking-widest gold-text font-semibold px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20">
          {product.category}
        </span>
      </Link>

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
  );
}
