import { useParams, useNavigate } from "react-router-dom";
import Breadcrumb from "@/components/Breadcrumb";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Package, ShoppingCart, Copy, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
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

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { profile, refreshProfile } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [purchasing, setPurchasing] = useState(false);
  const [result, setResult] = useState<PurchaseResult | null>(null);
  const [copied, setCopied] = useState(false);

  const { data: product, isLoading } = useQuery({
    queryKey: ["product", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const mapErrorMessage = (msg: string): string => {
    const lower = msg.toLowerCase();
    if (lower.includes("out of stock") || lower.includes("no credentials available")) {
      return "လက်ကျန်မရှိသေးပါ။ ခေတ္တစောင့်ဆိုင်းပေးပါရန်။ (Out of Stock)";
    }
    if (lower.includes("insufficient balance")) {
      return "လက်ကျန်ငွေ မလုံလောက်ပါ။ ငွေအရင်ဖြည့်ပေးပါရန်။ (Insufficient Balance)";
    }
    return msg;
  };

  const handleBuy = async () => {
    if (!product) return;
    if ((profile?.balance || 0) < product.wholesale_price) {
      toast.error("လက်ကျန်ငွေ မလုံလောက်ပါ။ ငွေအရင်ဖြည့်ပေးပါရန်။ (Insufficient Balance)");
      return;
    }
    if (product.stock <= 0) {
      toast.error("လက်ကျန်မရှိသေးပါ။ ခေတ္တစောင့်ဆိုင်းပေးပါရန်။ (Out of Stock)");
      return;
    }

    setPurchasing(true);
    try {
      const { data, error } = await supabase.functions.invoke("purchase", {
        body: { product_id: product.id },
      });
      if (error) throw new Error(error.message);
      if (data && !data.success) {
        toast.error(mapErrorMessage(data.error as string));
        return;
      }
      setResult(data as PurchaseResult);
      queryClient.invalidateQueries({ queryKey: ["product", id] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["recent-orders"] });
      queryClient.invalidateQueries({ queryKey: ["wallet-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["recent-transactions"] });
      refreshProfile();
    } catch (err: any) {
      toast.error(mapErrorMessage(err.message || "Purchase failed. Please try again."));
    } finally {
      setPurchasing(false);
    }
  };

  const copyCredentials = (creds: string) => {
    navigator.clipboard.writeText(creds);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="space-y-4 text-center py-20">
        <p className="text-muted-foreground">Product not found</p>
        <Button variant="outline" onClick={() => navigate("/dashboard/products")}>Back to Products</Button>
      </div>
    );
  }

  const savings = product.retail_price - product.wholesale_price;
  const savingsPercent = Math.round((savings / product.retail_price) * 100);

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      <Breadcrumb items={[
        { label: "Dashboard", path: "/dashboard" },
        { label: "Products", path: "/dashboard/products" },
        { label: product.name },
      ]} />

      {/* Product Info Card */}
      <div className="glass-card p-6 lg:p-8 animate-fade-in" style={{ animationDelay: "0.05s" }}>
        <div className="flex flex-col sm:flex-row gap-6">
          <div className="flex flex-col items-center gap-3">
            <div className="w-20 h-20 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-4xl">
              {product.icon}
            </div>
            <span className="text-[10px] uppercase tracking-widest gold-text font-semibold px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20">
              {product.category}
            </span>
          </div>

          <div className="flex-1 space-y-3">
            <h1 className="text-2xl font-bold text-foreground">{product.name}</h1>
            <p className="text-sm text-primary font-medium">{product.duration}</p>
            {product.description && (
              <p className="text-sm text-muted-foreground leading-relaxed">{product.description}</p>
            )}
          </div>
        </div>
      </div>

      {/* Pricing Tiers */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-fade-in" style={{ animationDelay: "0.1s" }}>
        <div className="glass-card p-5 space-y-2 opacity-60">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Retail Price</p>
          <p className="text-2xl font-bold font-mono text-muted-foreground line-through">
            {product.retail_price.toLocaleString()} <span className="text-xs">MMK</span>
          </p>
          <p className="text-xs text-muted-foreground">Standard market price</p>
        </div>

        <div className="stat-card space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium gold-text uppercase tracking-wider font-semibold">Wholesale Price</p>
            {savingsPercent > 0 && (
              <span className="text-[10px] font-semibold bg-success/10 text-success px-2 py-0.5 rounded-full">
                Save {savingsPercent}%
              </span>
            )}
          </div>
          <p className="text-2xl font-bold font-mono gold-shimmer">
            {product.wholesale_price.toLocaleString()} <span className="text-xs text-muted-foreground">MMK</span>
          </p>
          <p className="text-xs text-muted-foreground">Your reseller price</p>
        </div>
      </div>

      {/* Purchase Section */}
      <div className="glass-card p-6 animate-fade-in space-y-4" style={{ animationDelay: "0.15s" }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <Package className="w-4 h-4 text-primary" />
            <span className={product.stock <= 5 ? "stock-low font-semibold" : "text-muted-foreground"}>
              {product.stock} in stock
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            Balance: <span className="font-mono font-semibold gold-text">{(profile?.balance || 0).toLocaleString()} MMK</span>
          </p>
        </div>

        <Button
          className="w-full btn-glow gap-2 h-12 text-base"
          onClick={handleBuy}
          disabled={product.stock === 0 || purchasing}
        >
          {purchasing ? (
            <>
              <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
              Processing...
            </>
          ) : product.stock === 0 ? (
            "Out of Stock"
          ) : (
            <>
              <ShoppingCart className="w-5 h-5" />
              Buy Now — {product.wholesale_price.toLocaleString()} MMK
            </>
          )}
        </Button>
      </div>

      {/* Purchase Success Dialog */}
      <Dialog open={!!result} onOpenChange={() => setResult(null)}>
        <DialogContent className="bg-card border-border/50 max-w-md">
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
                  <code className="flex-1 text-sm font-mono gold-text bg-primary/10 border border-primary/20 px-3 py-2 rounded-lg break-all">
                    {result.credentials}
                  </code>
                  <button
                    onClick={() => copyCredentials(result.credentials)}
                    className="p-2 rounded-lg bg-muted hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors duration-200"
                  >
                    {copied ? <CheckCircle2 className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Amount Charged</span>
                <span className="font-mono font-semibold gold-text">{result.price.toLocaleString()} MMK</span>
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
