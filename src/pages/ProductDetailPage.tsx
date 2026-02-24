import { useParams, useNavigate } from "react-router-dom";
import Breadcrumb from "@/components/Breadcrumb";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import PurchaseConfirmModal from "@/components/products/PurchaseConfirmModal";
import PurchaseSuccessModal from "@/components/products/PurchaseSuccessModal";
import ImportantNoticeModal from "@/components/products/ImportantNoticeModal";
import TopUpDialog from "@/components/wallet/TopUpDialog";
import { cn } from "@/lib/utils";
import FulfillmentModeSelector from "@/components/products/FulfillmentModeSelector";
import { t } from "@/lib/i18n";

interface PurchaseResult {
  order_id: string;
  credentials: string;
  product_name: string;
  price: number;
  quantity?: number;
  unit_price?: number;
}

const SPEC_ITEMS = [
  { label: "Activation", mm: "ချက်ချင်းအသက်ဝင်" },
  { label: "Account Type", mm: "တရားဝင်အကောင့်" },
  { label: "Warranty", mm: "၂၄ နာရီအာမခံ" },
  { label: "Replacement", mm: "ပျက်ပါက အစားထိုးပေး" },
  { label: "Delivery", mm: "လုံခြုံစွာပေးပို့" },
];

const NOTICES = [
  { mm: "ပို့ပြီးနောက် ပြန်မအမ်းပါ", en: "Non-refundable after delivery" },
  { mm: "မှားရိုက်ပါက အာမခံပျက်", en: "Incorrect input voids warranty" },
  { mm: "အတည်မပြုမီ ပြန်စစ်ပါ", en: "Verify all details before confirming" },
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

  const [topUpOpen, setTopUpOpen] = useState(false);
  const [topUpDefaultAmount, setTopUpDefaultAmount] = useState<number | undefined>();

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
    const modes: string[] = product ? (Array.isArray(product.fulfillment_modes) ? (product.fulfillment_modes as any[]).map(String) : ["instant"]) : ["instant"];
    const currentMode = modes.includes(selectedMode) ? selectedMode : modes[0];
    const activeFields = customFields.filter((f: any) => f.linked_mode === currentMode);
    const errors: Record<string, string> = {};

    for (const field of activeFields) {
      const value = (customFieldValues[field.field_name] || "").trim();
      if (field.required && !value) {
        errors[field.field_name] = `${field.field_name} လိုအပ်ပါသည်`;
        continue;
      }
      if (value) {
        if (field.field_type === "select") {
          const opts = Array.isArray(field.options) ? field.options : [];
          if (opts.length > 0 && !opts.includes(value)) {
            errors[field.field_name] = "မှန်ကန်သောရွေးချယ်မှု ရွေးပါ";
            continue;
          }
        }
        if (field.min_length && value.length < field.min_length) {
          errors[field.field_name] = `အနည်းဆုံး ${field.min_length} လုံး`;
          continue;
        }
        if (field.max_length && value.length > field.max_length) {
          errors[field.field_name] = `အများဆုံး ${field.max_length} လုံး`;
          continue;
        }
        if (field.field_type === "email") {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(value)) {
            errors[field.field_name] = "အီးမေးလ် မမှန်ကန်ပါ";
            continue;
          }
        }
        if (field.field_type === "number" && isNaN(Number(value))) {
          errors[field.field_name] = "ဂဏန်းဖြစ်ရမည်";
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
      toast.error("လိုအပ်သောအကွက်များ ဖြည့်ပေးပါ");
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

  const productModes: string[] = product ? (Array.isArray(product.fulfillment_modes) ? (product.fulfillment_modes as any[]).map(String) : ["instant"]) : ["instant"];
  const deliveryTimeConfig: Record<string, string> = product?.delivery_time_config && typeof product.delivery_time_config === "object"
    ? product.delivery_time_config as Record<string, string>
    : {};
  const effectiveMode = productModes.includes(selectedMode) ? selectedMode : productModes[0];

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
        <p className="text-muted-foreground text-sm">ထုတ်ကုန်မတွေ့ပါ</p>
        <Button variant="outline" onClick={() => navigate("/dashboard/products")}>{t.nav.products.mm}သို့ ပြန်သွားမည်</Button>
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
  const currentDeliveryBadge = deliveryTimeConfig[effectiveMode] || "ချက်ချင်းပေးပို့";

  return (
    <div className="space-y-6 max-w-2xl mx-auto animate-fade-in">
      <Breadcrumb items={[
        { label: t.nav.dashboard.mm, path: "/dashboard" },
        { label: t.nav.products.mm, path: "/dashboard/products" },
        { label: product.name },
      ]} />

      {/* ═══ 1. SERVICE IDENTITY PANEL ═══ */}
      <section className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <p className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground mb-1">
              Service Details
            </p>
            <h1 className="text-lg font-bold text-foreground tracking-tight leading-snug">{product.name}</h1>
          </div>
          <div
            className={cn(
              "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[10px] font-semibold tracking-wide",
              isOutOfStock
                ? "bg-destructive/8 text-destructive"
                : isLowStock
                ? "bg-warning/8 text-warning"
                : "bg-primary/8 text-primary"
            )}
          >
            <span className={cn("h-1.5 w-1.5 rounded-full", isOutOfStock ? "bg-destructive" : isLowStock ? "bg-warning" : "bg-primary")} />
            {isOutOfStock ? t.products.outOfStock.mm : isLowStock ? `${product.stock} ${t.products.left.mm}` : `${product.stock} ${t.products.inStock.mm}`}
          </div>
        </div>

        {/* Key-value metadata */}
        <div className="grid grid-cols-2 gap-y-2 gap-x-6 text-sm border-t border-border pt-4">
          <div className="flex justify-between">
            <span className="text-muted-foreground text-xs">Category</span>
            <span className="font-medium text-foreground text-xs uppercase tracking-wider">{product.category}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground text-xs">Duration</span>
            <span className="font-medium text-foreground text-xs">{product.duration}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground text-xs">Delivery</span>
            <span className="font-medium text-foreground text-xs">{currentDeliveryBadge}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground text-xs">Fulfillment</span>
            <span className="font-medium text-foreground text-xs capitalize">{effectiveMode}</span>
          </div>
        </div>
      </section>

      {/* ═══ 2. PRICING MATRIX TABLE ═══ */}
      <section className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <p className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground mb-0.5">
            Pricing Structure
          </p>
          <p className="text-2xl font-bold font-mono tabular-nums text-foreground leading-none tracking-tight">
            {product.wholesale_price.toLocaleString()}
            <span className="text-xs font-medium text-muted-foreground ml-1.5">MMK / unit</span>
          </p>
        </div>

        {/* Wholesale / Retail / Margin row */}
        <div className="grid grid-cols-3 divide-x divide-border border-b border-border">
          <div className="px-4 py-3">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Wholesale</p>
            <p className="text-sm font-bold font-mono tabular-nums text-foreground mt-0.5">
              {product.wholesale_price.toLocaleString()} <span className="text-[10px] font-normal text-muted-foreground">MMK</span>
            </p>
          </div>
          <div className="px-4 py-3">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Retail</p>
            <p className="text-sm font-bold font-mono tabular-nums text-foreground mt-0.5">
              {product.retail_price.toLocaleString()} <span className="text-[10px] font-normal text-muted-foreground">MMK</span>
            </p>
          </div>
          <div className="px-4 py-3">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Margin</p>
            <p className={cn("text-sm font-bold font-mono tabular-nums mt-0.5", profitPerUnit > 0 ? "text-primary" : "text-muted-foreground")}>
              {profitPerUnit > 0 ? "+" : ""}{profitPerUnit.toLocaleString()} <span className="text-[10px] font-normal text-muted-foreground">MMK</span>
            </p>
          </div>
        </div>

        {/* Volume tiers table */}
        {hasTiers && (
          <div>
            <div className="grid grid-cols-3 gap-0 px-4 py-2 text-[10px] uppercase tracking-widest font-semibold text-muted-foreground border-b border-border bg-muted/30">
              <span>Quantity</span>
              <span>Unit Price</span>
              <span>Tier</span>
            </div>
            {[...pricingTiers].sort((a: any, b: any) => a.min_qty - b.min_qty).map((tier: any, i: number) => {
              const label = tier.max_qty ? `${tier.min_qty} – ${tier.max_qty}` : `${tier.min_qty}+`;
              const isLowest = lowestTier && tier.unit_price === lowestTier.unit_price;
              return (
                <div key={i} className={cn(
                  "grid grid-cols-3 gap-0 px-4 py-2.5 text-sm border-b border-border last:border-b-0",
                  isLowest ? "bg-primary/[0.03]" : ""
                )}>
                  <span className="font-mono tabular-nums text-foreground text-xs">{label}</span>
                  <span className={cn("font-mono tabular-nums font-semibold text-xs", isLowest ? "text-primary" : "text-foreground")}>
                    {tier.unit_price.toLocaleString()} MMK
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {isLowest && <span className="font-semibold text-primary">Best value</span>}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ═══ 3. SERVICE SPECIFICATION BLOCK ═══ */}
      <section className="rounded-xl border border-border bg-card p-6">
        <p className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground mb-3">
          Service Specifications
        </p>
        <div className="space-y-0 divide-y divide-border">
          {SPEC_ITEMS.map((item, i) => (
            <div key={i} className="flex items-center justify-between py-2.5">
              <span className="text-xs text-muted-foreground">{item.label}</span>
              <span className="text-xs font-medium text-foreground">{item.mm}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ 4. IMPORTANT NOTICE — left-accent professional alert ═══ */}
      <section className="rounded-xl border border-border bg-card overflow-hidden">
        <button
          onClick={() => setNoticeOpen(!noticeOpen)}
          className="w-full px-6 py-4 flex items-center justify-between text-left"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-1 h-5 rounded-full bg-warning" />
            <span className="text-xs font-semibold text-foreground uppercase tracking-wide">Important Notice</span>
          </div>
          <ChevronDown
            className={cn(
              "w-4 h-4 text-muted-foreground transition-transform duration-200",
              noticeOpen && "rotate-180"
            )}
          />
        </button>
        {noticeOpen && (
          <div className="px-6 pb-5 space-y-2 animate-fade-in">
            {NOTICES.map((notice, i) => (
              <div key={i} className="flex items-start gap-3 py-1.5">
                <span className="w-1 h-1 rounded-full bg-warning/60 mt-1.5 shrink-0" />
                <div>
                  <span className="text-xs text-foreground">{notice.mm}</span>
                  <span className="text-[10px] text-muted-foreground ml-2">({notice.en})</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ═══ 5. STRUCTURED ORDER CONFIGURATION ═══ */}
      <section className="rounded-xl border border-border bg-card p-6 space-y-5">
        <p className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground">
          Order Configuration
        </p>

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

        {/* Wallet balance row */}
        <div className="flex items-center justify-between rounded-lg border border-border bg-muted/20 px-4 py-3">
          <span className="text-xs text-muted-foreground">{t.detail.walletLabel.mm} Balance</span>
          <span className="text-sm font-bold font-mono tabular-nums text-foreground">{balance.toLocaleString()} MMK</span>
        </div>

        {/* Insufficient balance warning */}
        {insufficientBalance && !isOutOfStock && (
          <div className="flex items-center justify-between gap-3 rounded-lg border-l-2 border-warning bg-warning/[0.04] px-4 py-3">
            <div className="flex items-center gap-2 min-w-0">
              <AlertTriangle className="w-3.5 h-3.5 text-warning shrink-0" />
              <p className="text-xs text-foreground">
                {t.detail.insufficientBalance.mm}{" "}
                <span className="text-muted-foreground">
                  {t.detail.needMore.mm} {(product.wholesale_price - balance).toLocaleString()} MMK
                </span>
              </p>
            </div>
            <button
              onClick={() => handleTopUp(product.wholesale_price - balance)}
              className="px-3 py-1.5 text-[11px] font-semibold rounded-md bg-primary text-primary-foreground hover:brightness-90 transition-all shrink-0"
            >
              {t.wallet.topUp.mm}
            </button>
          </div>
        )}

        {/* Primary action */}
        <Button
          className="w-full h-11 rounded-lg font-semibold text-sm"
          onClick={handleBuyClick}
          disabled={isOutOfStock || purchasing}
        >
          {purchasing ? (
            <>
              <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-2" />
              {t.products.processing.mm}
            </>
          ) : isOutOfStock ? (
            t.products.outOfStock.mm
          ) : (
            <>Confirm Order — {product.wholesale_price.toLocaleString()} MMK</>
          )}
        </Button>
      </section>

      {/* ═══ DESCRIPTION ═══ */}
      {product.description && (
        <section className="rounded-xl border border-border bg-card p-6">
          <p className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground mb-2">Description</p>
          <p className="text-sm text-muted-foreground leading-relaxed">{product.description}</p>
        </section>
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
