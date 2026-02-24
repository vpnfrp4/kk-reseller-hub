import { useParams, useNavigate } from "react-router-dom";
import Breadcrumb from "@/components/Breadcrumb";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Package,
  TrendingDown,
  Wallet,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Zap,
  Shield,
  Clock,
  RefreshCw,
  Lock,
} from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import PurchaseConfirmModal from "@/components/products/PurchaseConfirmModal";
import PurchaseSuccessModal from "@/components/products/PurchaseSuccessModal";
import ImportantNoticeModal from "@/components/products/ImportantNoticeModal";
import TopUpDialog from "@/components/wallet/TopUpDialog";
import { cn } from "@/lib/utils";
import { Money } from "@/components/shared";
import FulfillmentModeSelector from "@/components/products/FulfillmentModeSelector";

interface PurchaseResult {
  order_id: string;
  credentials: string;
  product_name: string;
  price: number;
  quantity?: number;
  unit_price?: number;
}

const WHAT_YOU_GET = [
  { icon: Zap, text: "Instant activation" },
  { icon: Shield, text: "Official account" },
  { icon: Clock, text: "24h warranty" },
  { icon: RefreshCw, text: "Replacement if failed" },
  { icon: Lock, text: "Secure delivery" },
];

const NOTICES = [
  "No refund after delivery",
  "Incorrect input voids warranty",
  "Double-check before confirming",
];

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user, profile, refreshProfile } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [purchasing, setPurchasing] = useState(false);
  const [result, setResult] = useState<PurchaseResult | null>(null);
  const [noticeOpen, setNoticeOpen] = useState(false);

  const [confirmProduct, setConfirmProduct] = useState<any | null>(null);
  const [noticeProduct, setNoticeProduct] = useState<any | null>(null);
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [lastSavings, setLastSavings] = useState(0);

  // Smart top-up state
  const [topUpOpen, setTopUpOpen] = useState(false);
  const [topUpDefaultAmount, setTopUpDefaultAmount] = useState<number | undefined>();

  // Fulfillment mode state
  const [selectedMode, setSelectedMode] = useState<string>("instant");
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, string>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

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

  const { data: customFields = [] } = useQuery({
    queryKey: ["product-custom-fields", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("product_custom_fields" as any)
        .select("*")
        .eq("product_id", id!)
        .order("sort_order", { ascending: true });
      return (data || []) as any[];
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

  const validateCustomFields = (): boolean => {
    // effectiveMode is computed later, but we need it here too
    const modes: string[] = product ? (Array.isArray(product.fulfillment_modes) ? (product.fulfillment_modes as any[]).map(String) : ["instant"]) : ["instant"];
    const currentMode = modes.includes(selectedMode) ? selectedMode : modes[0];
    const activeFields = customFields.filter((f: any) => f.linked_mode === currentMode);
    const errors: Record<string, string> = {};

    for (const field of activeFields) {
      const value = (customFieldValues[field.field_name] || "").trim();

      if (field.required && !value) {
        errors[field.field_name] = `${field.field_name} is required`;
        continue;
      }

      if (value) {
        if (field.min_length && value.length < field.min_length) {
          errors[field.field_name] = `Minimum ${field.min_length} characters`;
          continue;
        }
        if (field.max_length && value.length > field.max_length) {
          errors[field.field_name] = `Maximum ${field.max_length} characters`;
          continue;
        }
        if (field.field_type === "email") {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(value)) {
            errors[field.field_name] = "Invalid email address";
            continue;
          }
        }
        if (field.field_type === "number" && isNaN(Number(value))) {
          errors[field.field_name] = "Must be a number";
          continue;
        }
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleBuyClick = () => {
    if (!product) return;
    if (product.stock <= 0) {
      toast.error("လက်ကျန်မရှိသေးပါ။ ခေတ္တစောင့်ဆိုင်းပေးပါရန်။ (Out of Stock)");
      return;
    }
    if (!validateCustomFields()) {
      toast.error("Please fill in all required fields correctly");
      return;
    }
    setNoticeProduct(product);
  };

  const handleNoticeConfirm = () => {
    setConfirmProduct(noticeProduct);
    setNoticeProduct(null);
    setAgreedTerms(false);
  };

  const handleTopUp = (amount: number) => {
    setConfirmProduct(null);
    setTopUpDefaultAmount(amount);
    setTopUpOpen(true);
  };

  const handleBuy = async (prod: any, quantity: number = 1) => {
    const highestTierPrice = pricingTiers.length > 0 ? Math.max(...pricingTiers.map((t: any) => t.unit_price)) : prod.wholesale_price;
    const sortedTiers = [...pricingTiers].sort((a: any, b: any) => b.min_qty - a.min_qty);
    const activeTier = sortedTiers.find((t: any) => quantity >= t.min_qty && (t.max_qty === null || quantity <= t.max_qty));
    const unitPrice = activeTier ? (activeTier as any).unit_price : prod.wholesale_price;
    const savings = (highestTierPrice - unitPrice) * quantity;

    setConfirmProduct(null);
    setPurchasing(true);
    try {
      const { data, error } = await supabase.functions.invoke("purchase", {
        body: {
          product_id: prod.id,
          quantity,
          fulfillment_mode: effectiveMode,
          custom_fields: Object.keys(customFieldValues).length > 0 ? customFieldValues : undefined,
        },
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

  const isOutOfStock = product.stock === 0;
  const isLowStock = product.stock > 0 && product.stock <= 5;
  const hasTiers = pricingTiers.length > 0;
  const lowestTier = hasTiers
    ? [...pricingTiers].sort((a: any, b: any) => a.unit_price - b.unit_price)[0] as any
    : null;
  const profitPerUnit = product.retail_price - product.wholesale_price;
  const balance = profile?.balance || 0;
  const insufficientBalance = balance < product.wholesale_price;

  // Fulfillment modes
  const productModes: string[] = Array.isArray(product.fulfillment_modes) ? (product.fulfillment_modes as any[]).map(String) : ["instant"];
  const deliveryTimeConfig: Record<string, string> = product.delivery_time_config && typeof product.delivery_time_config === "object"
    ? product.delivery_time_config as Record<string, string>
    : {};

  // Set default mode to first available on load
  const effectiveMode = productModes.includes(selectedMode) ? selectedMode : productModes[0];
  const currentDeliveryBadge = deliveryTimeConfig[effectiveMode] || "⚡ Instant Delivery";

  return (
    <div className="space-y-default max-w-2xl mx-auto animate-fade-in">
      <Breadcrumb items={[
        { label: "Dashboard", path: "/dashboard" },
        { label: "Products", path: "/dashboard/products" },
        { label: product.name },
      ]} />

      {/* ═══ ABOVE THE FOLD — Hero Section ═══ */}
      <div className="glass-card p-card lg:p-section space-y-card">
        {/* Top row: Name + Category */}
        <div className="flex items-start justify-between gap-compact">
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold text-foreground leading-snug">{product.name}</h1>
            <p className="text-sm text-primary font-medium mt-0.5">{product.duration}</p>
          </div>
          <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground px-2.5 py-1 rounded-md bg-muted/50 border border-border shrink-0">
            {product.category}
          </span>
        </div>

        {/* Price — Dominant */}
        <div className="space-y-1">
          <p className="text-4xl font-extrabold font-mono tabular-nums text-foreground tracking-tighter leading-none">
            {product.wholesale_price.toLocaleString()}
            <span className="text-sm font-medium text-muted-foreground ml-2">MMK</span>
          </p>
          {hasTiers && lowestTier && lowestTier.unit_price < product.wholesale_price && (
            <p className="text-xs text-muted-foreground">
              From{" "}
              <span className="font-mono font-semibold text-primary">
                {lowestTier.unit_price.toLocaleString()}
              </span>{" "}
              MMK at {lowestTier.min_qty}+ qty
            </p>
          )}
        </div>

        {/* Stock + Delivery badges */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5">
            <span
              className={cn(
                "w-2 h-2 rounded-full",
                isOutOfStock ? "bg-destructive" : isLowStock ? "bg-warning animate-pulse" : "bg-success"
              )}
            />
            <span
              className={cn(
                "text-xs font-semibold",
                isOutOfStock ? "text-destructive" : isLowStock ? "text-warning" : "text-success"
              )}
            >
              {isOutOfStock ? "Out of stock" : isLowStock ? `Only ${product.stock} left` : `${product.stock} in stock`}
            </span>
          </div>
          <span className="text-border">·</span>
          <span className="text-[11px] text-muted-foreground flex items-center gap-1">
            {currentDeliveryBadge}
          </span>
        </div>

        {/* Fulfillment Mode Selector */}
        <FulfillmentModeSelector
          productId={product.id}
          fulfillmentModes={productModes}
          deliveryTimeConfig={deliveryTimeConfig}
          selectedMode={effectiveMode}
          onModeChange={setSelectedMode}
          customFieldValues={customFieldValues}
          onCustomFieldChange={(name, val) => {
            setCustomFieldValues(prev => ({ ...prev, [name]: val }));
            setFieldErrors(prev => { const n = { ...prev }; delete n[name]; return n; });
          }}
          fieldErrors={fieldErrors}
        />

        {/* Wallet awareness */}
        {insufficientBalance && !isOutOfStock && (
          <div className="rounded-[var(--radius-btn)] bg-warning/[0.06] border border-warning/20 p-compact flex items-center justify-between gap-compact">
            <div className="flex items-center gap-2 min-w-0">
              <AlertTriangle className="w-4 h-4 text-warning shrink-0" />
              <p className="text-xs text-foreground">
                Insufficient balance.{" "}
                <span className="text-muted-foreground">
                  Need {(product.wholesale_price - balance).toLocaleString()} more MMK.
                </span>
              </p>
            </div>
            <button
              onClick={() => handleTopUp(product.wholesale_price - balance)}
              className="btn-glow px-3 py-1 text-[11px] font-semibold shrink-0"
            >
              Top Up
            </button>
          </div>
        )}

        {/* Primary CTA */}
        <Button
          className="w-full h-12 rounded-[var(--radius-btn)] bg-primary text-primary-foreground font-semibold text-base hover:brightness-90 transition-all"
          onClick={handleBuyClick}
          disabled={isOutOfStock || purchasing}
        >
          {purchasing ? (
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

        {/* Balance indicator */}
        <p className="text-xs text-muted-foreground text-center">
          Wallet: <span className="font-mono font-semibold text-foreground">{balance.toLocaleString()} MMK</span>
        </p>
      </div>

      {/* ═══ PROFIT INDICATOR ═══ */}
      {profitPerUnit > 0 && (
        <div className="glass-card p-card flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Suggested resell price</p>
            <p className="text-lg font-bold font-mono tabular-nums text-foreground">
              {product.retail_price.toLocaleString()}
              <span className="text-[11px] font-medium text-muted-foreground ml-1">MMK</span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Profit per unit</p>
            <p className="text-lg font-bold font-mono tabular-nums text-success">
              +{profitPerUnit.toLocaleString()}
              <span className="text-[11px] font-medium text-success/70 ml-1">MMK</span>
            </p>
          </div>
        </div>
      )}

      {/* ═══ VOLUME PRICING ═══ */}
      {hasTiers && (
        <div className="glass-card p-card space-y-compact">
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
                  className={cn(
                    "rounded-[var(--radius-btn)] p-3 text-center border transition-all",
                    isLowest
                      ? "bg-primary/[0.04] border-primary/20"
                      : "bg-muted/20 border-border"
                  )}
                >
                  <p className="text-[11px] text-muted-foreground mb-0.5">{label} qty</p>
                  <p className={cn("text-lg font-bold font-mono tabular-nums", isLowest ? "text-primary" : "text-foreground")}>
                    {tier.unit_price.toLocaleString()}
                  </p>
                  <p className="text-[10px] text-muted-foreground">MMK / each</p>
                  {isLowest && (
                    <span className="text-[10px] font-semibold text-primary mt-0.5 inline-block">Best value</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══ WHAT YOU GET ═══ */}
      <div className="glass-card p-card space-y-compact">
        <p className="text-sm font-semibold text-foreground">What You Get</p>
        <div className="space-y-2">
          {WHAT_YOU_GET.map((item, i) => (
            <div key={i} className="flex items-center gap-2.5">
              <item.icon className="w-4 h-4 text-success shrink-0" />
              <span className="text-sm text-foreground">{item.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ═══ IMPORTANT NOTICE (Collapsible) ═══ */}
      <div className="glass-card overflow-hidden">
        <button
          onClick={() => setNoticeOpen(!noticeOpen)}
          className="w-full p-card flex items-center justify-between text-left"
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-warning" />
            <span className="text-sm font-semibold text-foreground">Important Notice</span>
          </div>
          <ChevronDown
            className={cn(
              "w-4 h-4 text-muted-foreground transition-transform duration-200",
              noticeOpen && "rotate-180"
            )}
          />
        </button>
        {noticeOpen && (
          <div className="px-card pb-card space-y-2 animate-fade-in">
            {NOTICES.map((notice, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-warning/60 mt-1.5 shrink-0" />
                <span className="text-sm text-muted-foreground">{notice}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ═══ DESCRIPTION ═══ */}
      {product.description && (
        <div className="glass-card p-card">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-compact">Description</p>
          <p className="text-sm text-muted-foreground leading-relaxed">{product.description}</p>
        </div>
      )}

      {/* Modals */}
      <PurchaseConfirmModal
        product={confirmProduct}
        agreedTerms={agreedTerms}
        onAgreedTermsChange={setAgreedTerms}
        onConfirm={handleBuy}
        onClose={() => setConfirmProduct(null)}
        pricingTiers={pricingTiers as any[]}
        userBalance={profile?.balance || 0}
        onTopUp={handleTopUp}
      />

      <ImportantNoticeModal
        open={!!noticeProduct}
        onContinue={handleNoticeConfirm}
        onCancel={() => setNoticeProduct(null)}
      />

      <PurchaseSuccessModal
        result={result}
        onClose={() => { setResult(null); setLastSavings(0); }}
        totalSavings={lastSavings}
      />

      <TopUpDialog
        userId={user?.id}
        defaultAmount={topUpDefaultAmount}
        open={topUpOpen}
        onOpenChange={setTopUpOpen}
        hideTrigger
        onSubmitted={(txId) => navigate(`/dashboard/wallet/topup-status?id=${txId}`)}
      />
    </div>
  );
}
