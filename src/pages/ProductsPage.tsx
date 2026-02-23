import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Package } from "lucide-react";
import { toast } from "sonner";

export default function ProductsPage() {
  const { profile } = useAuth();

  const { data: products } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("*")
        .order("category", { ascending: true });
      return data || [];
    },
  });

  const handleBuy = (product: any) => {
    if ((profile?.balance || 0) < product.wholesale_price) {
      toast.error("Insufficient balance. Please top up your wallet.");
      return;
    }
    if (product.stock <= 0) {
      toast.error("This product is currently out of stock.");
      return;
    }
    // In a real app, this would go through an edge function for atomic purchase
    toast.info("Purchase flow coming soon — connect product credentials in the database to enable instant delivery.");
  };

  return (
    <div className="space-y-8">
      <div className="animate-fade-in">
        <h1 className="text-2xl font-bold text-foreground">Products</h1>
        <p className="text-muted-foreground text-sm">Browse digital services at wholesale prices</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {(products || []).map((product: any, i: number) => (
          <div
            key={product.id}
            className="glass-card p-6 flex flex-col animate-fade-in hover:border-primary/30 transition-colors"
            style={{ animationDelay: `${i * 0.05}s` }}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="text-3xl">{product.icon}</div>
              <span className="text-[10px] uppercase tracking-wider bg-primary/10 text-primary px-2 py-1 rounded-full font-medium">
                {product.category}
              </span>
            </div>

            <h3 className="font-semibold text-foreground text-lg">{product.name}</h3>
            <p className="text-sm text-muted-foreground mb-4">{product.duration}</p>

            <div className="mt-auto space-y-3">
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-xs text-muted-foreground line-through">{product.retail_price.toLocaleString()} MMK</p>
                  <p className="text-xl font-bold font-mono text-primary">
                    {product.wholesale_price.toLocaleString()} <span className="text-xs text-muted-foreground">MMK</span>
                  </p>
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Package className="w-3 h-3" />
                  {product.stock} left
                </div>
              </div>

              <Button
                className="w-full btn-glow gap-2"
                onClick={() => handleBuy(product)}
                disabled={product.stock === 0}
              >
                <ShoppingCart className="w-4 h-4" />
                Buy Now
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
