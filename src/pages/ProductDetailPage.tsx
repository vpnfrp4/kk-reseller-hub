import { useParams, useNavigate } from "react-router-dom";
import Breadcrumb from "@/components/Breadcrumb";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Package, TrendingDown } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import PurchaseConfirmModal from "@/components/products/PurchaseConfirmModal";
import PurchaseSuccessModal from "@/components/products/PurchaseSuccessModal";

interface PurchaseResult {
  order_id: string;
  credentials: string;
  product_name: string;
  price: number;
  quantity?: number;
  unit_price?: number;
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
  const [lastSavings, setLastSavings] = useState(0);

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

  const { data: pricingTiers = [] } = useQuery({
    queryKey: ["pricing-tiers", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("pricing_tiers")
        .select("*")
        .eq("product_id", id!)
        .order("min_qty", { ascending: true });
      return data || [];
    },
    enabled: !!id,
  });

  const mapErrorMessage = (msg: string): string => {
    const lower = msg.toLowerCase();
    if (lower.includes("out of stock") || lower.includes("no credentials available") || lower.includes("not enough stock")) {
      return "လက်ကျန်မရှိသေးပါ။ ခေတ္တစောင့်ဆိုင်းပေးပါရန်။ (Out of Stock)";
    }
    if (lower.includes("insufficient balance")) {
      return "လက်ကျန်ငွေ မလုံလောက်ပါ။ ငွေအရင်ဖြည့်ပေးပါရန်။ (Insufficient Balance)";
    }
    return msg;
  };

  const handleBuyClick = () => {
    if (!product) return;
    if (product.stock <= 0) {
      toast.error("လက်ကျန်မရှိသေးပါ။ ခေတ္တစောင့်ဆိုင်းပေးပါရန်။ (Out of Stock)");
      return;
    }
    setConfirmProduct(product);
    setAgreedTerms(false);
  };

  const handleBuy = async (prod: any, quantity: number = 1) => {
    // Calculate savings
    const highestTierPrice = pricingTiers.length > 0 ? Math.max(...pricingTiers.map((t: any) => t.unit_price)) : prod.wholesale_price;
    const sortedTiers = [...pricingTiers].sort((a: any, b: any) => b.min_qty - a.min_qty);
    const activeTier = sortedTiers.find((t: any) => quantity >= t.min_qty && (t.max_qty === null || quantity <= t.max_qty));
    const unitPrice = activeTier ? (activeTier as any).unit_price : prod.wholesale_price;
    const savings = (highestTierPrice - unitPrice) * quantity;

    setConfirmProduct(null);
    setPurchasing(true);
    try {
      const { data, error } = await supabase.functions.invoke("purchase", {
        body: { product_id: prod.id, quantity },
      });
      if (error) throw new Error(error.message);
      if (data && !data.success) {
        toast.error(mapErrorMessage(data.error as string));
        return;
      }
      setLastSavings(savings);
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

  const hasTiers = pricingTiers.length > 0;
  const lowestTier = hasTiers
    ? [...pricingTiers].sort((a: any, b: any) => a.unit_price - b.unit_price)[0] as any
    : null;
  const highestTier = hasTiers
    ? [...pricingTiers].sort((a: any, b: any) => b.unit_price - a.unit_price)[0] as any
    : null;
  const maxBulkDiscountPct = hasTiers && highestTier && lowestTier && highestTier.unit_price > 0
    ? Math.round(((highestTier.unit_price - lowestTier.unit_price) / highestTier.unit_price) * 100)
    : 0;

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      <Breadcrumb items={[
        { label: "Dashboard", path: "/dashboard" },
        { label: "Products", path: "/dashboard/products" },
        { label: product.name },
      ]} />

      {/* Product Info Card */}
      <div className="bg-card border border-border rounded-2xl p-6 lg:p-8" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        <div className="flex flex-col sm:flex-row gap-6">
          <div className="flex flex-col items-center gap-3">
            <div className="w-20 h-20 rounded-2xl bg-primary/8 border border-primary/15 flex items-center justify-center text-4xl">
              {product.icon}
            </div>
            <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground px-2.5 py-1 rounded-lg bg-muted/50 border border-border">
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

      {/* Pricing */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-2xl p-5 space-y-2" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Retail Price</p>
          <p className="text-2xl font-bold font-mono text-muted-foreground line-through">
            {product.retail_price.toLocaleString()} <span className="text-xs">MMK</span>
          </p>
          <p className="text-xs text-muted-foreground">Standard market price</p>
        </div>

        <div className="bg-card border border-primary/20 rounded-2xl p-5 space-y-2 relative" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <div className="absolute inset-x-0 top-0 h-[2px] bg-primary rounded-t-2xl" />
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-primary uppercase tracking-wider font-semibold">Wholesale Price</p>
            {savingsPercent > 0 && (
              <span className="text-[10px] text-muted-foreground">
                {savingsPercent}% below retail
              </span>
            )}
          </div>
          <p className="text-2xl font-bold font-mono text-foreground">
            {product.wholesale_price.toLocaleString()} <span className="text-xs text-muted-foreground">MMK</span>
          </p>
          <p className="text-xs text-muted-foreground">Your reseller price</p>
        </div>
      </div>

      {/* Tier Pricing Table */}
      {hasTiers && (
        <div className="bg-card border border-border rounded-2xl p-5 space-y-3" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <div className="flex items-center gap-2">
            <TrendingDown className="w-4 h-4 text-primary" />
            <p className="text-sm font-semibold text-foreground">Volume Pricing</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {[...pricingTiers].sort((a: any, b: any) => a.min_qty - b.min_qty).map((tier: any, i: number) => {
              const label = tier.max_qty
                ? `${tier.min_qty}–${tier.max_qty}`
                : `${tier.min_qty}+`;
              const isLowest = lowestTier && tier.unit_price === lowestTier.unit_price;
              return (
                <div
                  key={i}
                  className={`rounded-xl p-3 text-center border transition-all ${
                    isLowest
                      ? "bg-primary/5 border-primary/20"
                      : "bg-muted/20 border-border"
                  }`}
                >
                  <p className="text-xs text-muted-foreground mb-1">{label} accounts</p>
                  <p className={`text-lg font-bold font-mono ${isLowest ? "text-primary" : "text-foreground"}`}>
                    {tier.unit_price.toLocaleString()}
                  </p>
                  <p className="text-[10px] text-muted-foreground">MMK / each</p>
                  {isLowest && (
                    <span className="text-[10px] font-semibold text-primary mt-1 inline-block">Best value</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Purchase Section */}
      <div className="bg-card border border-border rounded-2xl p-6 space-y-4" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <Package className="w-4 h-4 text-muted-foreground" />
            <span className={product.stock === 0 ? "text-destructive font-medium" : "text-muted-foreground"}>
              {product.stock === 0 ? "Out of stock" : `${product.stock} available`}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            Balance: <span className="font-mono font-semibold text-foreground">{(profile?.balance || 0).toLocaleString()} MMK</span>
          </p>
        </div>

        <Button
          className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-semibold text-base hover:brightness-90 transition-all"
          onClick={handleBuyClick}
          disabled={product.stock === 0 || purchasing}
        >
          {purchasing ? (
            <>
              <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-2" />
              Processing...
            </>
          ) : product.stock === 0 ? (
            "Out of Stock"
          ) : (
            "Purchase"
          )}
        </Button>
      </div>

      <PurchaseConfirmModal
        product={confirmProduct}
        agreedTerms={agreedTerms}
        onAgreedTermsChange={setAgreedTerms}
        onConfirm={handleBuy}
        onClose={() => setConfirmProduct(null)}
        pricingTiers={pricingTiers as any[]}
      />

      <PurchaseSuccessModal
        result={result}
        onClose={() => { setResult(null); setLastSavings(0); }}
        totalSavings={lastSavings}
      />
    </div>
  );
}
