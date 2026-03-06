import { useParams, useNavigate } from "react-router-dom";
import { sanitizeName } from "@/lib/sanitize-name";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Eye,
  ShoppingCart,
  AlertTriangle,
  Wallet,
  Zap,
  User,
  Smartphone,
} from "lucide-react";
import { toast } from "sonner";
import { useState, useMemo } from "react";

import { cn } from "@/lib/utils";
import { Money, QuantitySelector } from "@/components/shared";
import { t, useT } from "@/lib/i18n";
import Confetti from "@/components/Confetti";
import { useCountUp } from "@/hooks/use-count-up";

const MODE_ICONS: Record<string, any> = {
  instant: Zap,
  custom_username: User,
  imei: Smartphone,
  manual: Clock,
};

interface PurchaseResult {
  order_id: string;
  credentials: string;
  product_name: string;
  price: number;
  quantity?: number;
  unit_price?: number;
}

const STEPS = [
  { key: "configure", label: "Configure" },
  { key: "details", label: "Details" },
  { key: "review", label: "Review" },
  { key: "confirm", label: "Done" },
] as const;

type StepKey = typeof STEPS[number]["key"];

/* ════════════════════════════════════════════
   STEP PROGRESS BAR
   ════════════════════════════════════════════ */
function StepBar({ current, steps }: { current: number; steps: readonly { key: string; label: string }[] }) {
  return (
    <div className="flex items-center gap-0 w-full">
      {steps.map((step, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <div key={step.key} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 border",
                  done
                    ? "bg-primary border-primary text-primary-foreground"
                    : active
                    ? "bg-primary/15 border-primary text-primary"
                    : "bg-muted/30 border-border/40 text-muted-foreground"
                )}
              >
                {done ? <Check className="w-4 h-4" /> : i + 1}
              </div>
              <span
                className={cn(
                  "text-[9px] uppercase tracking-[0.1em] font-semibold whitespace-nowrap",
                  done || active ? "text-foreground" : "text-muted-foreground/50"
                )}
              >
                {step.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={cn(
                  "flex-1 h-px mx-2 transition-colors duration-300",
                  done ? "bg-primary" : "bg-border/30"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ════════════════════════════════════════════
   ORDER FLOW PAGE
   ════════════════════════════════════════════ */
export default function OrderFlowPage() {
  const l = useT();
  const { id } = useParams<{ id: string }>();
  const { user, profile, refreshProfile } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [step, setStep] = useState(0);
  const [selectedMode, setSelectedMode] = useState<string>("instant");
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, string>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [quantity, setQuantity] = useState(1);
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const [result, setResult] = useState<PurchaseResult | null>(null);
  const [lastSavings, setLastSavings] = useState(0);
  const [copied, setCopied] = useState(false);
  const [lastOrderTime, setLastOrderTime] = useState(0);
  const [lastOrderKey, setLastOrderKey] = useState("");

  // ── Data fetching ──
  const isUUID = id ? /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id) : false;

  const { data: product, isLoading } = useQuery({
    queryKey: ["product", id],
    queryFn: async () => {
      let query = supabase.from("products").select("*");
      if (isUUID) {
        query = query.eq("id", id!);
      } else {
        query = query.ilike("slug", id!);
      }
      const { data, error } = await query.maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const productId = product?.id;

  const { data: provider } = useQuery({
    queryKey: ["product-provider", (product as any)?.provider_id],
    queryFn: async () => {
      const { data } = await supabase
        .from("imei_providers_public")
        .select("id, name, avg_rating, success_rate, total_completed, total_reviews, is_verified, fulfillment_type")
        .eq("id", (product as any).provider_id)
        .single();
      return data;
    },
    enabled: !!(product as any)?.provider_id,
  });

  const { data: pricingTiers = [] } = useQuery({
    queryKey: ["pricing-tiers", productId],
    queryFn: async () => {
      const { data } = await supabase
        .from("pricing_tiers")
        .select("*")
        .eq("product_id", productId!)
        .order("min_qty", { ascending: true });
      return data || [];
    },
    enabled: !!productId,
  });

  const { data: customFields = [] } = useQuery({
    queryKey: ["product-custom-fields", productId],
    queryFn: async () => {
      const { data } = await supabase
        .from("product_custom_fields" as any)
        .select("*")
        .eq("product_id", productId!)
        .order("sort_order", { ascending: true });
      return (data || []) as any[];
    },
    enabled: !!productId,
  });

  // ── Derived values ──
  const productModes: string[] = product
    ? Array.isArray(product.fulfillment_modes) ? (product.fulfillment_modes as any[]).map(String) : ["instant"]
    : ["instant"];
  const deliveryTimeConfig: Record<string, string> = product?.delivery_time_config && typeof product.delivery_time_config === "object"
    ? product.delivery_time_config as Record<string, string>
    : {};
  const effectiveMode = productModes.includes(selectedMode) ? selectedMode : productModes[0];
  const activeFields = customFields.filter((f: any) => f.linked_mode === effectiveMode);
  const productType = (product as any)?.product_type || "digital";
  const isApiProduct = productType === "api";
  const hasStockTracking = productType === "digital";
  const allowQuantity = hasStockTracking;
  const maxQty = product ? (hasStockTracking ? Math.min(product.stock, 100) : 1) : 1;

  // For API products: find quantity field for real-time price calc
  const apiQuantityField = isApiProduct ? activeFields.find((f: any) => f.field_type === "quantity") : null;
  const apiQuantity = apiQuantityField ? (parseInt(customFieldValues[apiQuantityField.field_name]) || 0) : 0;
  const apiMinQty = apiQuantityField ? (apiQuantityField.min_length || (product as any)?.api_min_quantity || 1) : 1;
  const apiMaxQty = apiQuantityField ? (apiQuantityField.max_length || (product as any)?.api_max_quantity || 100000) : 100000;

  const currentTier = useMemo(() => {
    if (!pricingTiers.length) return null;
    const sorted = [...pricingTiers].sort((a: any, b: any) => b.min_qty - a.min_qty);
    return sorted.find((t: any) => quantity >= t.min_qty && (t.max_qty === null || quantity <= t.max_qty)) || null;
  }, [pricingTiers, quantity]);

  const unitPrice = currentTier ? (currentTier as any).unit_price : (product?.wholesale_price || 0);

  // Fetch exchange rate for API per-1000 pricing
  const { data: usdRate } = useQuery({
    queryKey: ["usd-rate-order"],
    queryFn: async () => {
      const { data } = await supabase
        .from("system_settings")
        .select("value")
        .eq("key", "usd_mmk_rate")
        .single();
      return Number((data?.value as any)?.rate) || 0;
    },
    enabled: isApiProduct,
  });

  const { data: marginConfig } = useQuery({
    queryKey: ["margin-config-order"],
    queryFn: async () => {
      const { data } = await supabase
        .from("system_settings")
        .select("value")
        .eq("key", "margin_config")
        .single();
      return (data?.value || { global_margin: 20, category_margins: {} }) as any;
    },
    enabled: isApiProduct,
  });

  // API per-1000 pricing calculation (mirrors server-side logic)
  const apiMargin = useMemo(() => {
    if (!isApiProduct || !product) return 20;
    const svcMargin = (product as any).margin_percent;
    if (svcMargin && svcMargin > 0) return svcMargin;
    const catMargin = marginConfig?.category_margins?.[(product as any).category] as number;
    if (catMargin && catMargin > 0) return catMargin;
    return marginConfig?.global_margin || 20;
  }, [isApiProduct, product, marginConfig]);

  const apiPricing = useMemo(() => {
    if (!isApiProduct || !product?.api_rate || !usdRate) return null;
    const costPer1000 = Math.ceil(product.api_rate * usdRate);
    const sellPer1000 = Math.ceil(costPer1000 * (1 + apiMargin / 100));
    const perUnit = sellPer1000 / 1000;
    return { costPer1000, sellPer1000, perUnit };
  }, [isApiProduct, product, usdRate, apiMargin]);

  const apiUnitPrice = apiPricing ? apiPricing.perUnit : unitPrice;

  const effectiveUnitPrice = isApiProduct ? apiUnitPrice : unitPrice;
  const apiTotalPrice = isApiProduct && apiQuantity > 0 ? apiUnitPrice * apiQuantity : 0;
  const totalPrice = isApiProduct ? apiTotalPrice : effectiveUnitPrice * quantity;
  const balance = profile?.balance || 0;
  const deficit = totalPrice - balance;
  const hasInsufficientBalance = deficit > 0;
  const suggestedTopUp = Math.ceil(deficit / 5000) * 5000;
  const currentBalance = profile?.balance ?? 0;
  const previousBalance = currentBalance + (result?.price ?? 0);
  const animatedBalance = useCountUp(result ? currentBalance : 0, 700);
  const showConfetti = lastSavings >= 10000;

  const baseTierPrice = pricingTiers.length > 0
    ? Math.max(...pricingTiers.map((t: any) => t.unit_price))
    : (product?.wholesale_price || 0);
  const totalSavingsCalc = (baseTierPrice - unitPrice) * quantity;

  const hasCustomFields = activeFields.length > 0;
  const needsDetailsStep = hasCustomFields || productModes.length > 1 || isApiProduct;

  // Skip details step if not needed
  const activeSteps = needsDetailsStep ? STEPS : STEPS.filter(s => s.key !== "details");
  const currentStepKey = activeSteps[step]?.key;

  // ── Validation ──
  const validateCustomFields = (): boolean => {
    const errors: Record<string, string> = {};
    for (const field of activeFields) {
      const value = (customFieldValues[field.field_name] || "").trim();
      if (field.required && !value) {
        errors[field.field_name] = `${field.field_name} is required`;
        continue;
      }
      if (value) {
        if (field.field_type === "select") {
          const opts = Array.isArray(field.options) ? field.options : [];
          if (opts.length > 0 && !opts.includes(value)) {
            errors[field.field_name] = "Please select a valid option";
            continue;
          }
        }
        if (field.field_type === "url") {
          try {
            const url = new URL(value);
            if (!["http:", "https:"].includes(url.protocol)) {
              errors[field.field_name] = "URL must start with http:// or https://";
              continue;
            }
          } catch {
            errors[field.field_name] = "Please enter a valid URL";
            continue;
          }
          // Regex validation rule
          if (field.validation_rule) {
            try {
              const regex = new RegExp(field.validation_rule);
              if (!regex.test(value)) {
                errors[field.field_name] = "URL format does not match the required pattern";
                continue;
              }
            } catch { /* invalid regex, skip */ }
          }
        }
        if (field.field_type === "quantity" || field.field_type === "number") {
          const num = Number(value);
          if (isNaN(num)) {
            errors[field.field_name] = "Must be a number";
            continue;
          }
          if (field.min_length && num < field.min_length) {
            errors[field.field_name] = `Minimum: ${field.min_length}`;
            continue;
          }
          if (field.max_length && num > field.max_length) {
            errors[field.field_name] = `Maximum: ${field.max_length}`;
            continue;
          }
        }
        if (field.min_length && field.field_type !== "number" && field.field_type !== "quantity" && value.length < field.min_length) {
          errors[field.field_name] = `Minimum ${field.min_length} characters`;
          continue;
        }
        if (field.max_length && field.field_type !== "number" && field.field_type !== "quantity" && value.length > field.max_length) {
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
        // Text field validation rule
        if (field.field_type === "text" && field.validation_rule) {
          try {
            const regex = new RegExp(field.validation_rule);
            if (!regex.test(value)) {
              errors[field.field_name] = "Input does not match the required format";
              continue;
            }
          } catch { /* invalid regex, skip */ }
        }
      }
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

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

  // ── Step navigation ──
  const canProceed = (): boolean => {
    if (currentStepKey === "configure") return true;
    if (currentStepKey === "details") return validateCustomFields();
    if (currentStepKey === "review") return agreedTerms && !hasInsufficientBalance;
    return false;
  };

  const handleNext = () => {
    if (currentStepKey === "details" && !validateCustomFields()) {
      toast.error("Please fill in all required fields");
      return;
    }
    if (currentStepKey === "review") {
      handlePurchase();
      return;
    }
    setStep(prev => Math.min(prev + 1, activeSteps.length - 1));
  };

  const handleBack = () => {
    if (step === 0) {
      navigate("/dashboard/products");
      return;
    }
    setStep(prev => Math.max(prev - 1, 0));
  };

  // ── Sanitize link input ──
  const sanitizeLink = (raw: string): string => {
    const trimmed = raw.trim();
    try {
      const url = new URL(trimmed);
      if (!["http:", "https:"].includes(url.protocol)) return "";
      // Remove dangerous chars, keep only valid URL
      return url.toString().slice(0, 2048);
    } catch {
      return "";
    }
  };

  // ── Purchase ──
  const handlePurchase = async () => {
    if (!product || purchasing) return;

    // 5-second cooldown for same service + link
    const urlField = isApiProduct ? activeFields.find((f: any) => f.field_type === "url") : null;
    const linkValue = urlField ? (customFieldValues[urlField.field_name] || "") : "";
    const orderKey = `${product.id}:${linkValue}`;
    const now = Date.now();
    if (orderKey === lastOrderKey && now - lastOrderTime < 5000) {
      const remaining = Math.ceil((5000 - (now - lastOrderTime)) / 1000);
      toast.error(`Please wait ${remaining}s before reordering the same service`);
      return;
    }

    // Validate quantity min/max for API products
    if (isApiProduct && apiQuantityField) {
      if (apiQuantity < apiMinQty) {
        toast.error(`Minimum quantity is ${apiMinQty}`);
        return;
      }
      if (apiQuantity > apiMaxQty) {
        toast.error(`Maximum quantity is ${apiMaxQty}`);
        return;
      }
    }

    const savings = totalSavingsCalc;
    setPurchasing(true);
    try {
      // Build purchase body
      const purchaseBody: any = {
        product_id: product.id,
        quantity: isApiProduct ? (apiQuantity || 1) : quantity,
        fulfillment_mode: effectiveMode,
        custom_fields: Object.keys(customFieldValues).length > 0 ? customFieldValues : undefined,
      };

      // For API products, extract link from URL fields and include service_id
      if (isApiProduct) {
        if (urlField) {
          const sanitized = sanitizeLink(customFieldValues[urlField.field_name] || "");
          if (!sanitized && customFieldValues[urlField.field_name]?.trim()) {
            toast.error("Invalid link URL");
            return;
          }
          purchaseBody.link = sanitized;
        }
        purchaseBody.service_id = (product as any).api_service_id || "";
      }

      const { data, error } = await supabase.functions.invoke("purchase", {
        body: purchaseBody,
      });
      if (error) throw new Error(error.message);
      if (data && !data.success) {
        toast.error(mapErrorMessage(data.error as string));
        return;
      }

      // Record cooldown
      setLastOrderTime(Date.now());
      setLastOrderKey(orderKey);

      setLastSavings(savings);
      setResult(data as PurchaseResult);
      setStep(activeSteps.length - 1); // Go to confirmation step
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

  // ── Loading / Not Found ──
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="text-center py-20 space-y-4">
        <p className="text-muted-foreground text-sm">{l(t.detailExtra.productNotFound)}</p>
        <Button variant="outline" onClick={() => navigate("/dashboard/products")}>{l(t.detailExtra.goBack)}</Button>
      </div>
    );
  }

  const credentialsList = result?.credentials?.split("\n").filter(Boolean) || [];

  return (
    <div className="max-w-lg mx-auto animate-fade-in">
      {/* ── Header ── */}
      <div className="flex items-center gap-3 mb-6">
        {currentStepKey !== "confirm" && (
          <button
            onClick={handleBack}
            className="w-8 h-8 rounded-full border border-border/40 flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-border transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted-foreground truncate">
            {(product as any).display_id && <span className="font-mono font-bold text-primary/70 mr-1">#{(product as any).display_id}</span>}
            {product.name}
          </p>
          <p className="text-[9px] uppercase tracking-[0.1em] text-muted-foreground/50 font-medium">
            {currentStepKey === "confirm" ? "Order Complete" : "New Order"}
          </p>
        </div>
      </div>

      {/* ── Step Bar ── */}
      <div className="mb-8">
        <StepBar current={step} steps={activeSteps} />
      </div>

      {/* ════════════════════════════════════════
           STEP: CONFIGURE
         ════════════════════════════════════════ */}
      {currentStepKey === "configure" && (
        <div className="space-y-6 animate-fade-in">
          {/* API product info card */}
          {isApiProduct && (
             <div
              className="rounded-[var(--radius-card)] border border-border/40 p-5 space-y-3"
              style={{ background: "linear-gradient(145deg, #15151C 0%, #111116 100%)" }}
            >
              <p className="text-[9px] uppercase tracking-[0.1em] text-muted-foreground font-medium">Service Pricing</p>
              <div className="space-y-2">
                {apiPricing && (
                  <>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Cost / 1000</span>
                      <span className="font-mono tabular-nums text-muted-foreground">{apiPricing.costPer1000.toLocaleString()} MMK</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Sell / 1000</span>
                      <span className="font-mono tabular-nums text-foreground">{apiPricing.sellPer1000.toLocaleString()} MMK</span>
                    </div>
                    <div className="h-px bg-border/20" />
                  </>
                )}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Unit Price</span>
                  <Money amount={effectiveUnitPrice} className="text-foreground" />
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Delivery</span>
                  <span className="text-foreground">{deliveryTimeConfig[effectiveMode] || product?.processing_time || "Pending"}</span>
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground">Quantity and details are configured in the next step.</p>
            </div>
          )}
          {/* Quantity selector for digital products */}
          {allowQuantity && (
            <div
              className="rounded-[var(--radius-card)] border border-border/40 p-5 space-y-4"
              style={{ background: "linear-gradient(145deg, #15151C 0%, #111116 100%)" }}
            >
              <p className="text-[9px] uppercase tracking-[0.1em] text-muted-foreground font-medium">Quantity</p>
              <div className="flex items-center justify-between">
                <QuantitySelector value={quantity} onChange={setQuantity} min={1} max={maxQty} />
                <p className="text-xs text-muted-foreground">{product.stock} {l(t.products.available)}</p>
              </div>

              {/* Quick select */}
              <div className="flex items-center gap-2">
                {[5, 10, 20].filter(q => q <= maxQty).map(q => (
                  <button
                    key={q}
                    onClick={() => setQuantity(q)}
                    className={cn(
                      "flex-1 py-2 rounded-[var(--radius-btn)] text-sm font-medium transition-all border",
                      quantity === q
                        ? "bg-primary/10 border-primary/30 text-primary"
                        : "bg-muted/20 border-border/30 text-muted-foreground hover:text-foreground"
                    )}
                  >
                    ×{q}
                  </button>
                ))}
              </div>

              {/* Volume pricing */}
              {pricingTiers.length > 0 && (
                <div className="space-y-1.5 border-t border-border/20 pt-3">
                  <p className="text-[9px] uppercase tracking-[0.1em] text-muted-foreground font-medium">Volume Pricing</p>
                  {[...pricingTiers].sort((a: any, b: any) => a.min_qty - b.min_qty).map((tier: any, i: number) => {
                    const label = tier.max_qty ? `${tier.min_qty}–${tier.max_qty}` : `${tier.min_qty}+`;
                    const isActive = currentTier && (currentTier as any).min_qty === tier.min_qty;
                    return (
                      <div
                        key={i}
                        className={cn(
                          "flex items-center justify-between py-1.5 px-3 text-[11px] rounded-lg transition-colors",
                          isActive ? "bg-primary/[0.06] text-foreground" : "text-muted-foreground"
                        )}
                      >
                        <span className="font-mono tabular-nums">{label}</span>
                        <span className={cn("font-mono tabular-nums font-semibold", isActive && "text-primary")}>
                          {tier.unit_price.toLocaleString()} MMK
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Price summary */}
          <div
            className="rounded-[var(--radius-card)] border border-border/40 p-5 space-y-3"
            style={{ background: "linear-gradient(145deg, #15151C 0%, #111116 100%)" }}
          >
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{l(t.products.unitPrice)}</span>
              <Money amount={effectiveUnitPrice} className="text-foreground" />
            </div>
            {quantity > 1 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{l(t.products.quantity)}</span>
                <span className="font-mono tabular-nums text-foreground">×{quantity}</span>
              </div>
            )}
            {totalSavingsCalc > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{l(t.products.savings)}</span>
                <span className="font-mono tabular-nums text-primary font-medium">-{totalSavingsCalc.toLocaleString()} MMK</span>
              </div>
            )}
            <div className="h-px bg-border/20" />
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">{l(t.products.total)}</span>
              <p className="text-2xl font-bold font-mono tabular-nums text-primary drop-shadow-[0_0_6px_rgba(212,175,55,0.12)]">
                {totalPrice.toLocaleString()}
                <span className="text-xs font-normal text-muted-foreground ml-1">MMK</span>
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1">
              <Clock className="w-3 h-3" />
              {deliveryTimeConfig[effectiveMode] || l(t.detailExtra.instantDelivery)}
            </div>
          </div>

          <Button
            onClick={handleNext}
            className={cn(
              "w-full h-12 rounded-[var(--radius-btn)] font-semibold text-sm gap-2",
              "transition-all duration-200 ease-in-out",
              "hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(212,175,55,0.15)]",
              "active:scale-[0.97] active:translate-y-0"
            )}
          >
            {needsDetailsStep ? "Continue" : "Review Order"}
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* ════════════════════════════════════════
           STEP: DETAILS (conditional)
         ════════════════════════════════════════ */}
      {currentStepKey === "details" && (
        <div className="space-y-6 animate-fade-in">
          {/* Mode selector */}
          {productModes.length > 1 && (
            <div
              className="rounded-[var(--radius-card)] border border-border/40 p-5 space-y-3"
              style={{ background: "linear-gradient(145deg, #15151C 0%, #111116 100%)" }}
            >
              <p className="text-[9px] uppercase tracking-[0.1em] text-muted-foreground font-medium">
                Service Type
              </p>
              <div className="space-y-1.5">
                {productModes.map(mode => {
                  const Icon = MODE_ICONS[mode] || Zap;
                  const isSelected = selectedMode === mode;
                  return (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setSelectedMode(mode)}
                      className={cn(
                        "w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-all",
                        isSelected
                          ? "bg-primary/5 border-primary/25 ring-1 ring-primary/10"
                          : "bg-muted/10 border-border hover:border-primary/15"
                      )}
                    >
                      <div className={cn(
                        "w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0",
                        isSelected ? "border-primary" : "border-muted-foreground/30"
                      )}>
                        {isSelected && <div className="w-2 h-2 rounded-full bg-primary" />}
                      </div>
                      <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground capitalize">{mode.replace(/_/g, " ")}</p>
                        <p className="text-[11px] text-muted-foreground">{deliveryTimeConfig[mode] || ""}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Custom fields */}
          {activeFields.length > 0 && (
            <div
              className="rounded-[var(--radius-card)] border border-border/40 p-5 space-y-4"
              style={{ background: "linear-gradient(145deg, #15151C 0%, #111116 100%)" }}
            >
              <p className="text-[9px] uppercase tracking-[0.1em] text-muted-foreground font-medium">
                {isApiProduct ? "Order Details" : "Required Information"}
              </p>
              {activeFields.map((field: any) => (
                <div key={field.id} className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">
                    {field.field_name}
                    {field.required && <span className="text-destructive ml-0.5">*</span>}
                  </Label>
                  {field.field_type === "select" && Array.isArray(field.options) && field.options.length > 0 ? (
                    <Select
                      value={customFieldValues[field.field_name] || ""}
                      onValueChange={(val) => {
                        setCustomFieldValues(prev => ({ ...prev, [field.field_name]: val }));
                        setFieldErrors(prev => { const n = { ...prev }; delete n[field.field_name]; return n; });
                      }}
                    >
                      <SelectTrigger className={cn("bg-muted/30 border-border/40", fieldErrors[field.field_name] && "border-destructive")}>
                        <SelectValue placeholder={field.placeholder || `Select ${field.field_name.toLowerCase()}`} />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border-border z-50">
                        {(field.options as string[]).map((opt: string) => (
                          <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      type={field.field_type === "email" ? "email" : (field.field_type === "number" || field.field_type === "quantity") ? "number" : field.field_type === "url" ? "url" : "text"}
                      value={customFieldValues[field.field_name] || ""}
                      onChange={(e) => {
                        setCustomFieldValues(prev => ({ ...prev, [field.field_name]: e.target.value }));
                        setFieldErrors(prev => { const n = { ...prev }; delete n[field.field_name]; return n; });
                      }}
                      placeholder={field.placeholder || `Enter ${field.field_name.toLowerCase()}`}
                      min={field.field_type === "quantity" ? (field.min_length || 1) : undefined}
                      max={field.field_type === "quantity" ? (field.max_length || undefined) : undefined}
                      className={cn("bg-muted/30 border-border/40 font-mono", fieldErrors[field.field_name] && "border-destructive")}
                    />
                  )}
                  {fieldErrors[field.field_name] && (
                    <p className="text-[11px] text-destructive">{fieldErrors[field.field_name]}</p>
                  )}
                  {(field.field_type === "quantity" || field.field_type === "number") && (field.min_length || field.max_length) && (
                    <p className="text-[10px] text-muted-foreground">
                      {field.min_length ? `Min: ${field.min_length.toLocaleString()}` : ""}
                      {field.min_length && field.max_length ? " · " : ""}
                      {field.max_length ? `Max: ${field.max_length.toLocaleString()}` : ""}
                    </p>
                  )}
                  {field.field_type !== "quantity" && field.field_type !== "number" && (field.min_length || field.max_length) && (
                    <p className="text-[10px] text-muted-foreground">
                      {field.min_length ? `Min: ${field.min_length} chars` : ""}
                      {field.min_length && field.max_length ? " · " : ""}
                      {field.max_length ? `Max: ${field.max_length} chars` : ""}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Real-time price calculation for API products */}
          {isApiProduct && apiQuantity > 0 && (
            <div
              className="rounded-[var(--radius-card)] border border-border/40 p-5 space-y-3"
              style={{ background: "linear-gradient(145deg, #15151C 0%, #111116 100%)" }}
            >
              <p className="text-[9px] uppercase tracking-[0.1em] text-muted-foreground font-medium">Price Calculation</p>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Unit Price</span>
                  <Money amount={effectiveUnitPrice} className="text-foreground" />
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Quantity</span>
                  <span className="font-mono tabular-nums text-foreground">{apiQuantity.toLocaleString()}</span>
                </div>
                <div className="h-px bg-border/20" />
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">Total</span>
                  <p className="text-xl font-bold font-mono tabular-nums text-primary">
                    {apiTotalPrice.toLocaleString()}
                    <span className="text-xs font-normal text-muted-foreground ml-1">MMK</span>
                  </p>
                </div>
                <div className="h-px bg-border/20" />
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Wallet Balance</span>
                  <span className="font-mono tabular-nums text-foreground">{balance.toLocaleString()} MMK</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">After Purchase</span>
                  <span className={`font-mono tabular-nums font-medium ${
                    balance - apiTotalPrice < 0 ? "text-destructive" : "text-chart-2"
                  }`}>
                    {(balance - apiTotalPrice).toLocaleString()} MMK
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Estimated delivery */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground px-1">
            <Clock className="w-3 h-3" />
            Estimated delivery: {deliveryTimeConfig[effectiveMode] || l(t.detailExtra.instantDelivery)}
          </div>

          <Button
            onClick={handleNext}
            className="w-full h-12 rounded-[var(--radius-btn)] font-semibold text-sm gap-2"
          >
            Review Order
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* ════════════════════════════════════════
           STEP: REVIEW
         ════════════════════════════════════════ */}
      {currentStepKey === "review" && (
        <div className="space-y-5 animate-fade-in">
          {/* Order summary */}
          <div
            className="rounded-[var(--radius-card)] border border-border/40 p-5 space-y-4"
            style={{ background: "linear-gradient(145deg, #15151C 0%, #111116 100%)" }}
          >
            <p className="text-[9px] uppercase tracking-[0.1em] text-muted-foreground font-medium">Order Summary</p>

            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Product</span>
                <span className="text-foreground font-medium text-right max-w-[60%] truncate">{product.name}</span>
              </div>
              {product.duration && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Duration</span>
                  <span className="text-foreground">{product.duration}</span>
                </div>
              )}
              {selectedMode !== "instant" && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Service Type</span>
                  <span className="text-foreground capitalize">{selectedMode.replace(/_/g, " ")}</span>
                </div>
              )}
              {Object.entries(customFieldValues).filter(([, v]) => v).map(([key, val]) => (
                <div key={key} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{key}</span>
                  <span className="text-foreground font-mono text-xs">{val}</span>
                </div>
              ))}
              {quantity > 1 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Quantity</span>
                  <span className="text-foreground font-mono">×{quantity}</span>
                </div>
              )}
            </div>

            <div className="h-px bg-border/20" />

            {/* Price */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">Total Cost</span>
              <span className="text-2xl font-bold font-mono tabular-nums text-primary drop-shadow-[0_0_6px_rgba(212,175,55,0.12)]">
                {totalPrice.toLocaleString()}
                <span className="text-xs font-normal text-muted-foreground ml-1">MMK</span>
              </span>
            </div>

            {/* Balance */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Wallet Balance</span>
              <span className="text-foreground font-mono tabular-nums">{balance.toLocaleString()} MMK</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Remaining</span>
              <span className={cn(
                "font-mono tabular-nums font-medium",
                hasInsufficientBalance ? "text-destructive" : "text-muted-foreground"
              )}>
                {hasInsufficientBalance ? `-${deficit.toLocaleString()}` : (balance - totalPrice).toLocaleString()} MMK
              </span>
            </div>
          </div>

          {/* Insufficient balance */}
          {hasInsufficientBalance && (
            <div
              className="rounded-[var(--radius-card)] border border-warning/30 bg-warning/5 p-4 space-y-3 animate-fade-in"
            >
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-warning/10 flex items-center justify-center shrink-0">
                  <Wallet className="w-4 h-4 text-warning" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">
                    Need {deficit.toLocaleString()} MMK more
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Current balance: {balance.toLocaleString()} MMK
                  </p>
                </div>
              </div>
              <Button
                type="button"
                className="w-full h-10 rounded-[var(--radius-btn)] btn-glow text-sm gap-2"
                onClick={() => navigate("/dashboard/wallet")}
              >
                <Wallet className="w-4 h-4" />
                Top Up {suggestedTopUp.toLocaleString()} MMK
              </Button>
            </div>
          )}

          {/* Warning */}
          <p className="text-[11px] text-muted-foreground flex items-center gap-1.5 px-1">
            <AlertTriangle className="w-3.5 h-3.5 text-warning shrink-0" />
            {l(t.products.noRefund)}
          </p>

          {/* Terms */}
          <label className="flex items-start gap-3 cursor-pointer select-none rounded-[var(--radius-card)] border border-border/40 bg-muted/10 p-3.5 transition-colors hover:bg-muted/20">
            <Checkbox
              checked={agreedTerms}
              onCheckedChange={(checked) => setAgreedTerms(checked === true)}
              className="mt-0.5"
            />
            <span className="text-sm text-muted-foreground">
              I agree to the{" "}
              <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-primary underline hover:text-primary/80">
                Terms and Conditions
              </a>
            </span>
          </label>

          <Button
            onClick={handleNext}
            disabled={!agreedTerms || hasInsufficientBalance || purchasing}
            className={cn(
              "w-full h-12 rounded-[var(--radius-btn)] font-semibold text-sm gap-2 btn-glow",
              "transition-all duration-200 ease-in-out",
              "hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(212,175,55,0.2)]",
              "active:scale-[0.97] active:translate-y-0"
            )}
          >
            {purchasing ? (
              <>
                <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                Processing...
              </>
            ) : (
              <>
                Confirm Order — {totalPrice.toLocaleString()} MMK
              </>
            )}
          </Button>
        </div>
      )}

      {/* ════════════════════════════════════════
           STEP: CONFIRMATION
         ════════════════════════════════════════ */}
      {currentStepKey === "confirm" && result && (
        <OrderSuccessCard
          result={{
            ...result,
            fulfillment_mode: effectiveMode,
            delivery_time: deliveryTimeConfig[effectiveMode] || undefined,
          }}
          showConfetti={showConfetti}
          previousBalance={previousBalance}
          currentBalance={balance}
          onViewOrders={() => navigate("/dashboard/orders")}
          onNewOrder={() => navigate("/dashboard/place-order")}
        />
      )}

    </div>
  );
}
