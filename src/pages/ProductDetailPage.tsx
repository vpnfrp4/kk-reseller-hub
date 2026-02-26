import { useParams, useNavigate, Link } from "react-router-dom";
import PriceComparisonTable from "@/components/marketplace/PriceComparisonTable";
import Breadcrumb from "@/components/Breadcrumb";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  ChevronDown,
  Star,
  MessageSquare,
} from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import PurchaseConfirmModal from "@/components/products/PurchaseConfirmModal";
import PurchaseSuccessModal from "@/components/products/PurchaseSuccessModal";
import ImportantNoticeModal from "@/components/products/ImportantNoticeModal";
import StructuredDescription from "@/components/products/StructuredDescription";
import TopUpDialog from "@/components/wallet/TopUpDialog";
import { cn } from "@/lib/utils";
import FulfillmentModeSelector from "@/components/products/FulfillmentModeSelector";
import { t, useT } from "@/lib/i18n";
import ReviewModal from "@/components/marketplace/ReviewModal";

interface PurchaseResult {
  order_id: string;
  credentials: string;
  product_name: string;
  price: number;
  quantity?: number;
  unit_price?: number;
}

export default function ProductDetailPage() {
  const l = useT();
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
  const [reviewOpen, setReviewOpen] = useState(false);

  const SPEC_ITEMS = [
    { label: "Activation", value: t.detailExtra.activation },
    { label: "Account Type", value: t.detailExtra.accountType },
    { label: "Warranty", value: t.detailExtra.warranty },
    { label: "Replacement", value: t.detailExtra.replacement },
    { label: "Delivery", value: t.detailExtra.secureDelivery },
  ];

  const NOTICES = [
    { label: t.detailExtra.noticeNoRefund },
    { label: t.detailExtra.noticeIncorrect },
    { label: t.detailExtra.noticeVerify },
  ];

  const { data: product, isLoading } = useQuery({
    queryKey: ["product", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*, imei_providers(id, name, avg_rating, success_rate, total_completed, total_reviews, is_verified, fulfillment_type)")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const provider = (product as any)?.imei_providers || null;

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

  // Reviews for this product's provider
  const { data: reviews = [] } = useQuery({
    queryKey: ["order-reviews", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("order_reviews")
        .select("id, rating, comment, created_at, user_id")
        .in("order_id", 
          (await supabase.from("orders").select("id").eq("product_id", id!).in("status", ["completed", "delivered"])).data?.map((o: any) => o.id) || []
        )
        .order("created_at", { ascending: false })
        .limit(10);
      return (data || []) as any[];
    },
    enabled: !!id,
  });

  // Check if user has a completed order for this product (eligible to review)
  const { data: userCompletedOrder } = useQuery({
    queryKey: ["user-completed-order", id, user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("orders")
        .select("id")
        .eq("product_id", id!)
        .eq("user_id", user!.id)
        .in("status", ["completed", "delivered"])
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!id && !!user,
  });

  // Check if user already reviewed
  const { data: existingReview } = useQuery({
    queryKey: ["user-review-check", id, user?.id],
    queryFn: async () => {
      if (!userCompletedOrder) return null;
      const { data } = await supabase
        .from("order_reviews")
        .select("id")
        .eq("order_id", userCompletedOrder.id)
        .eq("user_id", user!.id)
        .maybeSingle();
      return data;
    },
    enabled: !!userCompletedOrder && !!user,
  });

  const mapErrorMessage = (msg: string): string => {
    const lower = msg.toLowerCase();
    if (lower.includes("out of stock") || lower.includes("no credentials available") || lower.includes("not enough stock")) {
      return l(t.detailExtra.outOfStockErr);
    }
    if (lower.includes("insufficient balance")) {
      return l(t.detailExtra.insufficientErr);
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
        errors[field.field_name] = `${field.field_name} ${l(t.detailExtra.fieldRequired)}`;
        continue;
      }
      if (value) {
        if (field.field_type === "select") {
          const opts = Array.isArray(field.options) ? field.options : [];
          if (opts.length > 0 && !opts.includes(value)) {
            errors[field.field_name] = l(t.detailExtra.validSelection);
            continue;
          }
        }
        if (field.min_length && value.length < field.min_length) {
          errors[field.field_name] = `${l(t.detailExtra.minChars)} ${field.min_length} ${l(t.detailExtra.chars)}`;
          continue;
        }
        if (field.max_length && value.length > field.max_length) {
          errors[field.field_name] = `${l(t.detailExtra.maxChars)} ${field.max_length} ${l(t.detailExtra.chars)}`;
          continue;
        }
        if (field.field_type === "email") {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(value)) {
            errors[field.field_name] = l(t.detailExtra.invalidEmail);
            continue;
          }
        }
        if (field.field_type === "number" && isNaN(Number(value))) {
          errors[field.field_name] = l(t.detailExtra.mustBeNumber);
          continue;
        }
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleBuyClick = () => {
    if (!product) return;
    const pt = (product as any).product_type || "digital";
    const hasStock = pt === "digital";
    if (hasStock && product.stock <= 0) {
      toast.error(l(t.detailExtra.outOfStockErr));
      return;
    }
    if (!validateCustomFields()) {
      toast.error(l(t.detailExtra.fillRequired));
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
      <div className="space-y-[var(--space-default)] text-center py-20">
        <p className="text-muted-foreground text-sm">{l(t.detailExtra.productNotFound)}</p>
        <Button variant="outline" onClick={() => navigate("/dashboard/products")}>{l(t.detailExtra.goBack)}</Button>
      </div>
    );
  }

  const productType = (product as any).product_type || "digital";
  const hasStockTracking = productType === "digital";
  const isOutOfStock = hasStockTracking ? product.stock === 0 : false;
  const isLowStock = hasStockTracking ? product.stock > 0 && product.stock <= 5 : false;
  const isImeiProduct = productType === "imei";
  const hasTiers = pricingTiers.length > 0;
  const lowestTier = hasTiers
    ? [...pricingTiers].sort((a: any, b: any) => a.unit_price - b.unit_price)[0] as any
    : null;
  const profitPerUnit = product.retail_price - product.wholesale_price;
  const balance = profile?.balance || 0;
  const insufficientBalance = balance < product.wholesale_price;
  const currentDeliveryBadge = deliveryTimeConfig[effectiveMode] || l(t.detailExtra.instantDelivery);

  return (
    <div className="space-y-[var(--space-card)] max-w-2xl mx-auto animate-fade-in">
      <Breadcrumb items={[
        { label: l(t.nav.dashboard), path: "/dashboard" },
        { label: l(t.nav.products), path: "/dashboard/products" },
        { label: product.name },
      ]} />

      {/* ═══ 1. SERVICE IDENTITY PANEL ═══ */}
      <section className="glass-card p-5 md:p-6 space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <p className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground">
              {l(t.detailExtra.serviceDetails)}
            </p>
            <h1 className="text-xl md:text-2xl font-semibold text-foreground tracking-wide leading-snug">{product.name}</h1>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-primary/10 text-primary rounded-md border border-primary/20">
                {product.category}
              </span>
              {product.duration && (
                <span className="text-xs text-muted-foreground">{product.duration}</span>
              )}
            </div>
          </div>
          <div
            className={cn(
              "flex items-center gap-1.5 rounded-[var(--radius-btn)] px-2.5 py-1 text-[11px] font-semibold tracking-wide",
              isOutOfStock
                ? "bg-destructive/10 text-destructive"
                : isLowStock
                ? "bg-warning/10 text-warning"
                : "bg-primary/10 text-primary"
            )}
          >
            <span className={cn("h-1.5 w-1.5 rounded-full", isOutOfStock ? "bg-destructive" : isLowStock ? "bg-warning" : "bg-primary")} />
            {isOutOfStock ? l(t.products.outOfStock) : !hasStockTracking ? (isImeiProduct ? (product.processing_time || "1-3 Days") : l(t.products.inStock)) : isLowStock ? `${product.stock} ${l(t.products.left)}` : `${product.stock} ${l(t.products.inStock)}`}
          </div>
        </div>

        {/* Key-value metadata */}
        <div className="grid grid-cols-2 gap-y-2 gap-x-6 text-sm border-t border-border/30 pt-4">
          <div className="flex justify-between">
            <span className="text-muted-foreground text-[11px]">{l(t.detailExtra.delivery)}</span>
            <span className="font-medium text-foreground text-[11px]">{currentDeliveryBadge}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground text-[11px]">{l(t.detailExtra.fulfillment)}</span>
            <span className="font-medium text-foreground text-[11px] capitalize">{effectiveMode}</span>
          </div>
        </div>
      </section>

      {/* ═══ 1b. PROVIDER INFO ═══ */}
      {provider && (
        <section className="glass-card p-5 md:p-6 space-y-3">
          <p className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground">
            Provider
          </p>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-muted/40 border border-border/40 flex items-center justify-center shrink-0">
              <span className="text-sm font-bold text-muted-foreground">{provider.name?.charAt(0)}</span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <Link to={`/dashboard/providers/${provider.id}`} className="text-sm font-semibold text-foreground hover:text-primary transition-colors underline-offset-2 hover:underline">
                  {provider.name}
                </Link>
                {provider.is_verified && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold bg-primary/10 text-primary rounded-md border border-primary/20">
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>
                    Verified
                  </span>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground capitalize">{provider.fulfillment_type === "api" ? "Automated" : "Manual"} fulfillment</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 pt-3 border-t border-border/30">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-0.5">Rating</p>
              <div className="flex items-center gap-1">
                <svg className="w-3.5 h-3.5 text-amber-400 fill-amber-400" viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                <span className="text-sm font-bold font-mono text-foreground">{provider.avg_rating || "—"}</span>
                {provider.total_reviews != null && (
                  <span className="text-[10px] text-muted-foreground">({provider.total_reviews})</span>
                )}
              </div>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-0.5">Success Rate</p>
              <span className={cn(
                "text-sm font-bold font-mono",
                (provider.success_rate || 0) >= 95 ? "text-primary" : (provider.success_rate || 0) >= 80 ? "text-amber-500" : "text-destructive"
              )}>
                {provider.success_rate ?? "—"}%
              </span>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-0.5">Completed</p>
              <span className="text-sm font-bold font-mono text-foreground">
                {(provider.total_completed || 0).toLocaleString()}
              </span>
            </div>
          </div>
        </section>
      )}

      {/* ═══ 2. PRICING MATRIX TABLE ═══ */}
      <section className="glass-card overflow-hidden">
        <div className="px-5 md:px-6 py-4 border-b border-border/30">
          <p className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground mb-1.5">
            {l(t.detailExtra.pricingStructure)}
          </p>
          <p className="text-2xl md:text-3xl font-bold font-mono tabular-nums text-foreground leading-none tracking-tight drop-shadow-[0_0_6px_hsl(var(--primary)/0.4)]">
            {product.wholesale_price.toLocaleString()}
            <span className="text-xs font-medium text-muted-foreground ml-1.5">MMK {l(t.detailExtra.perUnit)}</span>
          </p>
        </div>

        {/* Wholesale / Retail / Margin row */}
        <div className="grid grid-cols-3 divide-x divide-border/30 border-b border-border/30">
          <div className="px-4 py-3">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1.5">{l(t.detailExtra.wholesale)}</p>
            <p className="text-lg md:text-xl font-bold font-mono tabular-nums text-foreground leading-none drop-shadow-[0_0_6px_hsl(var(--primary)/0.4)]">
              {product.wholesale_price.toLocaleString()}
              <span className="text-[10px] font-normal text-muted-foreground ml-1">MMK</span>
            </p>
          </div>
          <div className="px-4 py-3">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1.5">{l(t.detailExtra.retail)}</p>
            <p className="text-base md:text-lg font-medium font-mono tabular-nums text-muted-foreground leading-none">
              {product.retail_price.toLocaleString()}
              <span className="text-[10px] font-normal text-muted-foreground/70 ml-1">MMK</span>
            </p>
          </div>
          <div className="px-4 py-3">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1.5">{l(t.detailExtra.margin)}</p>
            <p className={cn("text-base md:text-lg font-semibold font-mono tabular-nums leading-none", profitPerUnit > 0 ? "text-primary" : "text-muted-foreground")}>
              {profitPerUnit > 0 ? "+" : ""}{profitPerUnit.toLocaleString()}
              <span className="text-[10px] font-normal text-muted-foreground/70 ml-1">MMK</span>
            </p>
          </div>
        </div>

        {/* Volume tiers table */}
        {hasTiers && (
          <div>
            <div className="grid grid-cols-3 gap-0 px-[var(--space-default)] py-[var(--space-tight)] text-[10px] uppercase tracking-widest font-semibold text-muted-foreground border-b border-border/30 bg-muted/20">
              <span>{l(t.detailExtra.quantity)}</span>
              <span>{l(t.detailExtra.unitPrice)}</span>
              <span>{l(t.detailExtra.tier)}</span>
            </div>
            {[...pricingTiers].sort((a: any, b: any) => a.min_qty - b.min_qty).map((tier: any, i: number) => {
              const label = tier.max_qty ? `${tier.min_qty} – ${tier.max_qty}` : `${tier.min_qty}+`;
              const isLowest = lowestTier && tier.unit_price === lowestTier.unit_price;
              return (
                <div key={i} className={cn(
                  "grid grid-cols-3 gap-0 px-[var(--space-default)] py-[var(--space-compact)] text-sm border-b border-border/20 last:border-b-0 transition-colors",
                  isLowest ? "bg-primary/[0.04]" : "hover:bg-muted/20"
                )}>
                  <span className="font-mono tabular-nums text-foreground text-[11px]">{label}</span>
                  <span className={cn("font-mono tabular-nums font-semibold text-[11px]", isLowest ? "text-primary" : "text-foreground")}>
                    {tier.unit_price.toLocaleString()} MMK
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    {isLowest && <span className="font-semibold text-primary">{l(t.detail.bestValue)}</span>}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ═══ 3. SERVICE SPECIFICATION BLOCK ═══ */}
      <section className="glass-card p-[var(--space-card)]">
        <p className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground mb-[var(--space-compact)]">
          {l(t.detailExtra.serviceSpecs)}
        </p>
        <div className="space-y-0 divide-y divide-border/20">
          {SPEC_ITEMS.map((item, i) => (
            <div key={i} className="flex items-center justify-between py-[var(--space-compact)]">
              <span className="text-[11px] text-muted-foreground">{item.label}</span>
              <span className="text-[11px] font-medium text-foreground">{l(item.value)}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ 4. IMPORTANT NOTICE — left-accent professional alert ═══ */}
      <section className="glass-card overflow-hidden">
        <button
          onClick={() => setNoticeOpen(!noticeOpen)}
          className="w-full px-[var(--space-card)] py-[var(--space-default)] flex items-center justify-between text-left transition-colors hover:bg-muted/10"
        >
          <div className="flex items-center gap-[var(--space-compact)]">
            <div className="w-1 h-5 rounded-full bg-warning" />
            <span className="text-[11px] font-semibold text-foreground uppercase tracking-wider">{l(t.detailExtra.importantNotice)}</span>
          </div>
          <ChevronDown
            className={cn(
              "w-4 h-4 text-muted-foreground transition-transform duration-200",
              noticeOpen && "rotate-180"
            )}
          />
        </button>
        {noticeOpen && (
          <div className="px-[var(--space-card)] pb-[var(--space-card)] space-y-[var(--space-tight)] animate-fade-in">
            {NOTICES.map((notice, i) => (
              <div key={i} className="flex items-start gap-[var(--space-compact)] py-[var(--space-micro)]">
                <span className="w-1 h-1 rounded-full bg-warning/60 mt-1.5 shrink-0" />
                <span className="text-[11px] text-foreground/80">{l(notice.label)}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ═══ 5. STRUCTURED ORDER CONFIGURATION ═══ */}
      <section className="glass-card p-[var(--space-card)] space-y-[var(--space-default)]">
        <p className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground">
          {l(t.detailExtra.orderConfig)}
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
        <div className="flex items-center justify-between rounded-[var(--radius-btn)] border border-border/20 bg-muted/10 px-[var(--space-default)] py-[var(--space-compact)]">
          <span className="text-[11px] text-muted-foreground">{l(t.detailExtra.walletBalance)}</span>
          <span className="text-sm font-bold font-mono tabular-nums text-foreground">{balance.toLocaleString()} MMK</span>
        </div>

        {/* Insufficient balance warning */}
        {insufficientBalance && !isOutOfStock && (
          <div className="flex items-center justify-between gap-[var(--space-compact)] rounded-[var(--radius-btn)] border-l-2 border-warning bg-warning/[0.04] px-[var(--space-default)] py-[var(--space-compact)]">
            <div className="flex items-center gap-[var(--space-tight)] min-w-0">
              <AlertTriangle className="w-3.5 h-3.5 text-warning shrink-0" />
              <p className="text-[11px] text-foreground">
                {l(t.detail.insufficientBalance)}{" "}
                <span className="text-muted-foreground">
                  {l(t.detail.needMore)} {(product.wholesale_price - balance).toLocaleString()} MMK
                </span>
              </p>
            </div>
            <button
              onClick={() => handleTopUp(product.wholesale_price - balance)}
              className="btn-glow px-3 py-1.5 text-[11px] shrink-0"
            >
              {l(t.wallet.topUp)}
            </button>
          </div>
        )}

        {/* Primary action */}
        <Button
          className="w-full h-11 rounded-[var(--radius-btn)] font-semibold text-sm"
          onClick={handleBuyClick}
          disabled={isOutOfStock || purchasing}
        >
          {purchasing ? (
            <>
              <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-2" />
              {l(t.products.processing)}
            </>
          ) : isOutOfStock ? (
            l(t.products.outOfStock)
          ) : (
            <>{l(t.detailExtra.confirmOrder)} — {product.wholesale_price.toLocaleString()} MMK</>
          )}
        </Button>
      </section>

      {/* ═══ DESCRIPTION ═══ */}
      {product.description && (
        <StructuredDescription description={product.description} />
      )}

      {/* ═══ REVIEWS & RATINGS ═══ */}
      <section className="glass-card p-5 md:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground">
              Reviews & Ratings
            </p>
            {reviews.length > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                {reviews.length} review{reviews.length !== 1 ? "s" : ""}
              </p>
            )}
          </div>
          {user && userCompletedOrder && !existingReview && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setReviewOpen(true)}
              className="gap-1.5 text-xs"
            >
              <Star className="h-3.5 w-3.5" />
              Write Review
            </Button>
          )}
        </div>

        {reviews.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-6">
            <MessageSquare className="h-8 w-8 text-muted-foreground/30" strokeWidth={1.5} />
            <p className="text-sm text-muted-foreground">No reviews yet</p>
            {user && userCompletedOrder && !existingReview && (
              <p className="text-xs text-muted-foreground">Be the first to leave a review!</p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {reviews.map((review: any) => (
              <div key={review.id} className="rounded-xl border border-border/30 bg-muted/20 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={cn(
                          "h-3.5 w-3.5",
                          star <= review.rating
                            ? "text-amber-400 fill-amber-400"
                            : "text-muted-foreground/20"
                        )}
                      />
                    ))}
                  </div>
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(review.created_at).toLocaleDateString()}
                  </span>
                </div>
                {review.comment && (
                  <p className="text-sm text-foreground/80 leading-relaxed">{review.comment}</p>
                )}
              </div>
            ))}
          </div>
        )}

        {existingReview && (
          <p className="text-xs text-muted-foreground text-center pt-2">
            ✓ You've already reviewed this product
          </p>
        )}
      </section>

      {/* ═══ PRICE COMPARISON ═══ */}
      <PriceComparisonTable category={product.category} excludeProductId={product.id} />

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
        onSubmitted={(txId) => navigate(`/dashboard/topup-status/${txId}`)}
      />

      {userCompletedOrder && user && (
        <ReviewModal
          open={reviewOpen}
          onOpenChange={setReviewOpen}
          orderId={userCompletedOrder.id}
          productName={product.name}
          userId={user.id}
          providerId={provider?.id}
        />
      )}
    </div>
  );
}
