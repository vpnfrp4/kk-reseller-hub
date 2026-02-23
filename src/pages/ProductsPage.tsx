import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Package, Copy, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface PurchaseResult {
  order_id: string;
  credentials: string;
  product_name: string;
  price: number;
}

const CATEGORIES = ["All", "VPN", "Editing Tools", "AI Accounts"] as const;

export default function ProductsPage() {
  const { profile, refreshProfile } = useAuth();
  const queryClient = useQueryClient();
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [result, setResult] = useState<PurchaseResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>("All");

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

  const handleBuy = async (product: any) => {
    if ((profile?.balance || 0) < product.wholesale_price) {
      toast.error("Insufficient balance. Please top up your wallet.");
      return;
    }
    if (product.stock <= 0) {
      toast.error("This product is currently out of stock.");
      return;
    }

    setPurchasing(product.id);

    try {
      const { data, error } = await supabase.functions.invoke("purchase", {
        body: { product_id: product.id },
      });

      if (error) throw new Error(error.message);
      if (data?.error) {
        toast.error(data.error);
        return;
      }

      setResult(data as PurchaseResult);
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["recent-orders"] });
      queryClient.invalidateQueries({ queryKey: ["wallet-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["recent-transactions"] });
      refreshProfile();
    } catch (err: any) {
      toast.error(err.message || "Purchase failed. Please try again.");
    } finally {
      setPurchasing(null);
    }
  };

  const copyCredentials = (creds: string) => {
    navigator.clipboard.writeText(creds);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-8">
      <div className="animate-fade-in">
        <h1 className="text-2xl font-bold text-foreground">Products</h1>
        <p className="text-muted-foreground text-sm">Browse digital services at wholesale prices</p>
      </div>

      <div className="flex gap-2 animate-fade-in">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-4 py-1.5 rounded-full text-xs font-medium transition-colors ${
              activeCategory === cat
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {(products || [])
          .filter((p: any) => activeCategory === "All" || p.category === activeCategory)
          .map((product: any, i: number) => (
          <div
            key={product.id}
            className="glass-card p-6 flex flex-col animate-fade-in hover:border-primary/30 transition-colors"
            style={{ animationDelay: `${i * 0.05}s` }}
          >
            <Link to={`/dashboard/products/${product.id}`} className="flex items-start justify-between mb-4">
              <div className="text-3xl">{product.icon}</div>
              <span className="text-[10px] uppercase tracking-wider bg-primary/10 text-primary px-2 py-1 rounded-full font-medium">
                {product.category}
              </span>
            </Link>

            <Link to={`/dashboard/products/${product.id}`}>
              <h3 className="font-semibold text-foreground text-lg hover:text-primary transition-colors">{product.name}</h3>
            </Link>
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
                disabled={product.stock === 0 || purchasing === product.id}
              >
                {purchasing === product.id ? (
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
        ))}
      </div>

      {/* Instant Delivery Dialog */}
      <Dialog open={!!result} onOpenChange={() => setResult(null)}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-success" />
              Purchase Successful!
            </DialogTitle>
          </DialogHeader>

          {result && (
            <div className="space-y-4">
              <div className="stat-card">
                <p className="text-sm text-muted-foreground mb-1">Product</p>
                <p className="text-foreground font-semibold">{result.product_name}</p>
              </div>

              <div className="stat-card">
                <p className="text-sm text-muted-foreground mb-2">Account Credentials</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-sm font-mono text-primary bg-primary/10 px-3 py-2 rounded-lg break-all">
                    {result.credentials}
                  </code>
                  <button
                    onClick={() => copyCredentials(result.credentials)}
                    className="p-2 rounded-lg bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {copied ? <CheckCircle2 className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Amount Charged</span>
                <span className="font-mono font-semibold text-foreground">{result.price.toLocaleString()} MMK</span>
              </div>

              <p className="text-xs text-muted-foreground text-center">
                These credentials are also saved in your Order History.
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
