import { useParams, useNavigate } from "react-router-dom";
import Breadcrumb from "@/components/Breadcrumb";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Package, ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import PurchaseConfirmModal from "@/components/products/PurchaseConfirmModal";
import PurchaseSuccessModal from "@/components/products/PurchaseSuccessModal";

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
  
  const [confirmProduct, setConfirmProduct] = useState<any | null>(null);
  const [agreedTerms, setAgreedTerms] = useState(false);

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

  const handleBuyClick = () => {
    if (!product) return;
    if ((profile?.balance || 0) < product.wholesale_price) {
      toast.error("လက်ကျန်ငွေ မလုံလောက်ပါ။ ငွေအရင်ဖြည့်ပေးပါရန်။ (Insufficient Balance)");
      return;
    }
    if (product.stock <= 0) {
      toast.error("လက်ကျန်မရှိသေးပါ။ ခေတ္တစောင့်ဆိုင်းပေးပါရန်။ (Out of Stock)");
      return;
    }
    setConfirmProduct(product);
    setAgreedTerms(false);
  };

  const handleBuy = async (prod: any) => {
    setConfirmProduct(null);
    setPurchasing(true);
    try {
      const { data, error } = await supabase.functions.invoke("purchase", {
        body: { product_id: prod.id },
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
          onClick={handleBuyClick}
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

      <PurchaseConfirmModal
        product={confirmProduct}
        agreedTerms={agreedTerms}
        onAgreedTermsChange={setAgreedTerms}
        onConfirm={handleBuy}
        onClose={() => setConfirmProduct(null)}
      />

      <PurchaseSuccessModal
        result={result}
        onClose={() => setResult(null)}
      />
    </div>
  );
}
