import { useState, useMemo, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ShoppingCart,
  CheckCircle2,
  Clock,
  Info,
  Zap,
  Copy,
  Eye,
  X,
  AlertTriangle,
  Search,
  Download,
  ShieldAlert,
  Package,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Money } from "@/components/shared";
import { PageContainer } from "@/components/shared";
import TopUpDialog from "@/components/wallet/TopUpDialog";
import Confetti from "@/components/Confetti";
import { motion, AnimatePresence } from "framer-motion";

interface PurchaseResult {
  order_id: string;
  credentials: string;
  product_name: string;
  price: number;
  quantity?: number;
}

/* ════════════════════════════════════════════════════════════
   PLACE ORDER PAGE — Selection-Based Detail View
   ════════════════════════════════════════════════════════════ */
export default function PlaceOrderPage() {
  const { user, profile, refreshProfile } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const detailRef = useRef<HTMLDivElement>(null);

  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, string>>({});
  const [purchasing, setPurchasing] = useState(false);
  const [result, setResult] = useState<PurchaseResult | null>(null);
  const [topUpOpen, setTopUpOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");

  // Realtime: auto-refresh when admin changes products
  useEffect(() => {
    const channel = supabase
      .channel("order-products-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "products" }, (payload) => {
        queryClient.invalidateQueries({ queryKey: ["products-for-order"] });
        const event = payload.eventType;
        const name = (payload.new as any)?.name || (payload.old as any)?.name || "A product";
        if (event === "INSERT") {
          toast.info(`New service added: ${name}`, { icon: "🆕" });
        } else if (event === "UPDATE") {
          toast.info(`Service updated: ${name}`, { icon: "🔄" });
        } else if (event === "DELETE") {
          toast.info(`Service removed`, { icon: "🗑️" });
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  // ── Data Fetching ──
  const { data: products = [] } = useQuery({
    queryKey: ["products-for-order"],
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("*")
        .order("sort_order", { ascending: true });
      return (data || []).filter((p: any) =>
        p.product_type !== "digital" || p.stock > 0
      );
    },
  });

  const selectedProduct = products.find((p: any) => p.id === selectedProductId);

  const { data: customFields = [] } = useQuery({
    queryKey: ["product-custom-fields-order", selectedProductId],
    queryFn: async () => {
      const { data } = await supabase
        .from("product_custom_fields" as any)
        .select("*")
        .eq("product_id", selectedProductId)
        .order("sort_order", { ascending: true });
      return (data || []) as any[];
    },
    enabled: !!selectedProductId,
  });

  const { data: usdRate } = useQuery({
    queryKey: ["usd-rate-place-order"],
    queryFn: async () => {
      const { data } = await supabase
        .from("system_settings")
        .select("value")
        .eq("key", "usd_mmk_rate")
        .single();
      return Number((data?.value as any)?.rate) || 0;
    },
  });

  const { data: marginConfig } = useQuery({
    queryKey: ["margin-config-place-order"],
    queryFn: async () => {
      const { data } = await supabase
        .from("system_settings")
        .select("value")
        .eq("key", "margin_config")
        .single();
      return (data?.value || { global_margin: 20, category_margins: {} }) as any;
    },
  });

  // ── Derived State ──
  const isApiProduct = (selectedProduct as any)?.product_type === "api";
  const defaultMode = selectedProduct
    ? (Array.isArray(selectedProduct.fulfillment_modes) ? String((selectedProduct.fulfillment_modes as any[])[0]) : "instant")
    : "instant";
  const activeFields = customFields.filter((f: any) => f.linked_mode === defaultMode);

  const categories = useMemo(() => {
    const cats = new Map<string, number>();
    products.forEach((p: any) => {
      const cat = p.category || "Other";
      cats.set(cat, (cats.get(cat) || 0) + 1);
    });
    return [
      { name: "All", count: products.length },
      ...Array.from(cats.entries()).sort((a, b) => a[0].localeCompare(b[0])).map(([name, count]) => ({ name, count })),
    ];
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter((p: any) => {
      const matchesCategory = activeCategory === "All" || p.category === activeCategory;
      const matchesSearch = !searchQuery ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        String(p.display_id).includes(searchQuery);
      return matchesCategory && matchesSearch;
    });
  }, [products, activeCategory, searchQuery]);

  const unitPrice = useMemo(() => {
    if (!selectedProduct) return 0;
    if (isApiProduct && selectedProduct.api_rate && usdRate) {
      const margin = (selectedProduct as any).margin_percent || marginConfig?.global_margin || 20;
      const costPer1000 = Math.ceil(selectedProduct.api_rate * usdRate);
      return Math.ceil(costPer1000 * (1 + margin / 100)) / 1000;
    }
    return selectedProduct.wholesale_price || 0;
  }, [selectedProduct, isApiProduct, usdRate, marginConfig]);

  const apiQuantityField = isApiProduct ? activeFields.find((f: any) => f.field_type === "quantity") : null;
  const apiQuantity = apiQuantityField ? (parseInt(customFieldValues[apiQuantityField.field_name]) || 0) : 1;
  const totalPrice = isApiProduct ? unitPrice * apiQuantity : unitPrice;
  const balance = profile?.balance || 0;
  const hasInsufficientBalance = totalPrice > balance;

  const deliveryTimeConfig: Record<string, string> = selectedProduct?.delivery_time_config && typeof selectedProduct.delivery_time_config === "object"
    ? selectedProduct.delivery_time_config as Record<string, string>
    : {};
  const deliveryTime = deliveryTimeConfig[defaultMode] || selectedProduct?.processing_time || "Instant";
  const isInstant = defaultMode === "instant" || deliveryTime.toLowerCase().includes("instant");

  // ── Select handler with mobile scroll ──
  const handleSelectProduct = (id: string) => {
    setSelectedProductId(id);
    setCustomFieldValues({});
    setResult(null);
    // On mobile, scroll to detail panel
    if (window.innerWidth < 1024 && detailRef.current) {
      setTimeout(() => {
        detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    }
  };

  // ── Purchase ──
  const handlePurchase = async () => {
    if (!selectedProduct || purchasing) return;
    for (const field of activeFields) {
      if (field.required && !customFieldValues[field.field_name]?.trim()) {
        toast.error(`${field.field_name} is required`);
        return;
      }
    }
    if (hasInsufficientBalance) {
      toast.error("Insufficient balance");
      return;
    }
    setPurchasing(true);
    try {
      const purchaseBody: any = {
        product_id: selectedProduct.id,
        quantity: isApiProduct ? (apiQuantity || 1) : 1,
        fulfillment_mode: defaultMode,
        custom_fields: Object.keys(customFieldValues).length > 0 ? customFieldValues : undefined,
      };
      if (isApiProduct) {
        const urlField = activeFields.find((f: any) => f.field_type === "url");
        if (urlField) purchaseBody.link = customFieldValues[urlField.field_name] || "";
        purchaseBody.service_id = (selectedProduct as any).api_service_id || "";
      }
      const { data, error } = await supabase.functions.invoke("purchase", { body: purchaseBody });
      if (error) throw new Error(error.message);
      if (data && !data.success) {
        toast.error(data.error as string);
        return;
      }
      setResult(data as PurchaseResult);
      queryClient.invalidateQueries({ queryKey: ["products-for-order"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-orders"] });
      refreshProfile();
    } catch (err: any) {
      toast.error(err.message || "Purchase failed");
    } finally {
      setPurchasing(false);
    }
  };

  const copyCredentials = (creds: string) => {
    navigator.clipboard.writeText(creds);
    setCopied(true);
    toast.success("Copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const credentialsList = result?.credentials?.split("\n").filter(Boolean) || [];

  return (
    <PageContainer>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6 animate-fade-in">
        <div className="w-9 h-9 rounded-[var(--radius-btn)] bg-primary/10 flex items-center justify-center">
          <ShoppingCart className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">Place Order</h1>
          <p className="text-xs text-muted-foreground">Select a service and place your order</p>
        </div>
      </div>

      {/* Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 animate-fade-in" style={{ animationDelay: "0.05s" }}>

        {/* ═══ LEFT: Compact Service List (2/5) ═══ */}
        <div className="lg:col-span-2 flex flex-col gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50 pointer-events-none" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name or #ID..."
              className="pl-9 h-10 bg-card/60 backdrop-blur-md border-border/30 text-sm rounded-xl focus:border-primary/50 focus:ring-primary/20"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded text-muted-foreground/50 hover:text-foreground">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Category Pills */}
          <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-0.5">
            {categories.map((cat) => (
              <button
                key={cat.name}
                onClick={() => setActiveCategory(cat.name)}
                className={cn(
                  "shrink-0 px-3 py-1.5 text-[10px] font-bold rounded-lg border transition-all duration-200",
                  activeCategory === cat.name
                    ? "bg-primary text-primary-foreground border-primary shadow-[0_0_12px_hsl(var(--primary)/0.25)]"
                    : "bg-card/40 backdrop-blur-sm text-muted-foreground border-border/20 hover:border-primary/30 hover:text-foreground"
                )}
              >
                {cat.name}
                <span className="ml-1 opacity-60 font-mono">{cat.count}</span>
              </button>
            ))}
          </div>

          {/* Service List — Glassmorphism Card */}
          <div className="rounded-2xl border border-border/20 bg-card/40 backdrop-blur-xl overflow-hidden shadow-[0_4px_40px_-8px_rgba(0,0,0,0.4)]">
            <div className="px-4 py-2.5 border-b border-border/15 flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-[0.12em] font-bold text-muted-foreground/50">
                Available Services
              </span>
              <span className="text-[10px] font-mono text-muted-foreground/40">{filteredProducts.length}</span>
            </div>

            <div className="max-h-[55vh] lg:max-h-[65vh] overflow-y-auto scrollbar-hide">
              {filteredProducts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground/40">
                  <Search className="w-7 h-7 mb-2" />
                  <p className="text-xs font-medium">No services found</p>
                </div>
              ) : (
                filteredProducts.map((p: any) => {
                  const isSelected = p.id === selectedProductId;
                  return (
                    <button
                      key={p.id}
                      onClick={() => handleSelectProduct(p.id)}
                      className={cn(
                        "w-full text-left px-4 py-3 flex items-center gap-3 border-b border-border/8 transition-all duration-200 group",
                        isSelected
                          ? "bg-primary/8 border-l-2 border-l-primary"
                          : "hover:bg-card/80 border-l-2 border-l-transparent"
                      )}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-[10px] text-primary/70 font-bold">#{p.display_id}</span>
                          <span className={cn(
                            "text-[13px] truncate leading-tight",
                            isSelected ? "text-foreground font-semibold" : "text-secondary-foreground"
                          )}>
                            {p.name}
                          </span>
                        </div>
                      </div>
                      <span className="font-mono text-xs font-bold text-foreground/80 tabular-nums shrink-0">
                        <Money amount={p.wholesale_price} />
                      </span>
                      <ChevronRight className={cn(
                        "w-3.5 h-3.5 shrink-0 transition-all duration-200",
                        isSelected ? "text-primary" : "text-muted-foreground/20 group-hover:text-muted-foreground/50"
                      )} />
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* ═══ RIGHT: Detail Panel (3/5) ═══ */}
        <div ref={detailRef} className="lg:col-span-3">
          <AnimatePresence mode="wait">
            {!selectedProduct ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="rounded-2xl border border-border/20 bg-card/30 backdrop-blur-xl p-8 lg:p-12 shadow-[0_4px_40px_-8px_rgba(0,0,0,0.3)]"
              >
                <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
                  <div className="w-20 h-20 rounded-2xl bg-primary/5 border border-border/20 flex items-center justify-center mb-5">
                    <Sparkles className="w-9 h-9 text-primary/30" />
                  </div>
                  <h3 className="text-lg font-bold text-foreground/80 mb-2">Select a Service</h3>
                  <p className="text-sm text-muted-foreground/50 max-w-[280px]">
                    Choose a service from the list to view its details, pricing, and place your order.
                  </p>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key={selectedProduct.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className="space-y-4"
              >
                {/* Service Detail Card */}
                <div className="rounded-2xl border border-border/20 bg-card/40 backdrop-blur-xl overflow-hidden shadow-[0_4px_40px_-8px_rgba(0,0,0,0.4)]">
                  {/* Header */}
                  <div className="px-5 py-4 border-b border-border/15">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h2 className="text-base font-bold text-foreground leading-tight">{selectedProduct.name}</h2>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          <span className="font-mono text-[10px] text-primary bg-primary/10 px-2 py-0.5 rounded-md font-bold">
                            #{selectedProduct.display_id}
                          </span>
                          <span className="text-[10px] text-muted-foreground/60 font-medium">{selectedProduct.category}</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xl font-extrabold font-mono tabular-nums text-foreground">
                          <Money amount={totalPrice} />
                        </p>
                      </div>
                    </div>

                    {/* Badges */}
                    <div className="flex items-center gap-2 mt-3 flex-wrap">
                      <span className={cn(
                        "inline-flex items-center gap-1 text-[10px] font-bold rounded-lg px-2.5 py-1 border",
                        isInstant
                          ? "bg-success/10 text-success border-success/20"
                          : "bg-warning/10 text-warning border-warning/20"
                      )}>
                        {isInstant ? <Zap className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                        {deliveryTime}
                      </span>
                      {selectedProduct.product_type === "digital" && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold rounded-lg px-2.5 py-1 bg-primary/10 text-primary border border-primary/20">
                          <Zap className="w-3 h-3" /> AUTO-INSTANT
                        </span>
                      )}
                      {selectedProduct.description?.toLowerCase().includes("no refund") && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold rounded-lg px-2.5 py-1 bg-destructive/10 text-destructive border border-destructive/20">
                          <ShieldAlert className="w-3 h-3" /> NO REFUND
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Description Body */}
                  <div className="px-5 py-4 max-h-[280px] overflow-y-auto scrollbar-hide">
                    <ServiceDescription product={selectedProduct} />
                  </div>
                </div>

                {/* Order Form Card */}
                <div className="rounded-2xl border border-border/20 bg-card/40 backdrop-blur-xl p-5 shadow-[0_4px_40px_-8px_rgba(0,0,0,0.3)] space-y-4">
                  <h3 className="text-[11px] uppercase tracking-[0.12em] font-bold text-muted-foreground/50">
                    Order Details
                  </h3>

                  {/* Custom Fields */}
                  {activeFields.length > 0 && (
                    <div className="space-y-3">
                      {activeFields.map((field: any) => (
                        <div key={field.id} className="space-y-1.5">
                          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            {field.field_name}
                            {field.required && <span className="text-destructive ml-0.5">*</span>}
                          </label>
                          {field.field_type === "select" && Array.isArray(field.options) && field.options.length > 0 ? (
                            <select
                              value={customFieldValues[field.field_name] || ""}
                              onChange={(e) => setCustomFieldValues(prev => ({ ...prev, [field.field_name]: e.target.value }))}
                              className="w-full h-10 rounded-xl bg-card/60 backdrop-blur-sm border border-border/30 px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40"
                            >
                              <option value="">{field.placeholder || `Select ${field.field_name}`}</option>
                              {(field.options as string[]).map((opt: string) => (
                                <option key={opt} value={opt}>{opt}</option>
                              ))}
                            </select>
                          ) : (
                            <Input
                              type={field.field_type === "number" || field.field_type === "quantity" ? "number" : field.field_type === "url" ? "url" : "text"}
                              value={customFieldValues[field.field_name] || ""}
                              onChange={(e) => setCustomFieldValues(prev => ({ ...prev, [field.field_name]: e.target.value }))}
                              placeholder={field.placeholder || `Enter ${field.field_name}`}
                              className="bg-card/60 backdrop-blur-sm border-border/30 font-mono text-sm rounded-xl focus:border-primary/40 focus:ring-primary/20"
                              min={field.min_length || undefined}
                              max={field.max_length || undefined}
                            />
                          )}
                          {(field.field_type === "quantity" || field.field_type === "number") && (field.min_length || field.max_length) && (
                            <p className="text-[10px] text-muted-foreground/50">
                              {field.min_length ? `Min: ${field.min_length.toLocaleString()}` : ""}
                              {field.min_length && field.max_length ? " · " : ""}
                              {field.max_length ? `Max: ${field.max_length.toLocaleString()}` : ""}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Price Summary */}
                  <div className="rounded-xl bg-card/50 border border-border/15 p-3.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Total Price</span>
                      <span className="text-lg font-extrabold font-mono tabular-nums text-foreground">
                        <Money amount={totalPrice} />
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Your Balance</span>
                      <span className={cn(
                        "text-xs font-bold font-mono tabular-nums",
                        hasInsufficientBalance ? "text-destructive" : "text-success"
                      )}>
                        <Money amount={balance} />
                      </span>
                    </div>
                  </div>

                  {/* Insufficient balance warning */}
                  {hasInsufficientBalance && (
                    <div className="flex items-center gap-2 text-xs bg-destructive/8 text-destructive px-3 py-2.5 rounded-xl border border-destructive/15">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      <span>Need <Money amount={totalPrice - balance} className="inline font-bold" /> more.</span>
                      <button
                        onClick={() => setTopUpOpen(true)}
                        className="text-primary font-semibold hover:underline ml-auto shrink-0"
                      >
                        Top Up
                      </button>
                    </div>
                  )}

                  {/* Place Order Button */}
                  <Button
                    onClick={handlePurchase}
                    disabled={!selectedProduct || purchasing || hasInsufficientBalance}
                    className={cn(
                      "w-full h-12 font-bold text-sm gap-2 rounded-xl",
                      "bg-primary hover:bg-primary/90 text-primary-foreground",
                      "shadow-[0_0_20px_hsl(var(--primary)/0.25)] hover:shadow-[0_0_30px_hsl(var(--primary)/0.4)]",
                      "transition-all duration-300",
                      hasInsufficientBalance && "opacity-40 shadow-none"
                    )}
                  >
                    {purchasing ? (
                      <>
                        <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        Place Order
                      </>
                    )}
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ═══ SUCCESS MODAL ═══ */}
      {result && <SuccessModal result={result} credentialsList={credentialsList} onCopy={copyCredentials} onClose={() => setResult(null)} onNewOrder={() => { setResult(null); setSelectedProductId(""); setCustomFieldValues({}); }} navigate={navigate} />}

      <TopUpDialog
        userId={user?.id}
        open={topUpOpen}
        onOpenChange={setTopUpOpen}
        hideTrigger
        onSubmitted={(txId) => navigate(`/dashboard/topup-status/${txId}`)}
      />
    </PageContainer>
  );
}

/* ════════════════════════════════════════════════════════════
   SERVICE DESCRIPTION — Clean formatted view
   ════════════════════════════════════════════════════════════ */
function ServiceDescription({ product }: { product: any }) {
  const description = product.description || "";
  const allLines = description.split("\n").filter((l: string) => l.trim());

  const urlRegex = /https?:\/\/[^\s)>\]]+/gi;
  const downloadLines: string[] = [];
  const features: string[] = [];
  const warnings: string[] = [];
  const regularLines: string[] = [];

  for (const line of allLines) {
    const trimmed = line.trim();
    const lower = trimmed.toLowerCase();

    if (lower.includes("[download]") || lower.includes("download tool") || lower.includes("download link")) {
      const urls = trimmed.match(urlRegex);
      if (urls) downloadLines.push(...urls);
    } else if (trimmed.startsWith("✅") || trimmed.startsWith("✓") || trimmed.startsWith("•") || trimmed.startsWith("-")) {
      features.push(trimmed.replace(/^[✅✓•\-]\s*/, ""));
    } else if (
      lower.includes("no refund") ||
      lower.includes("important") ||
      lower.includes("warning") ||
      (trimmed === trimmed.toUpperCase() && trimmed.length > 5 && !trimmed.startsWith("#"))
    ) {
      warnings.push(trimmed);
    } else {
      regularLines.push(trimmed);
    }
  }

  return (
    <div className="space-y-3">
      {/* Regular text */}
      {regularLines.length > 0 && (
        <div className="space-y-1.5">
          {regularLines.map((line, i) => {
            if (line.startsWith("**") && line.endsWith("**")) {
              return <p key={i} className="text-sm font-bold text-foreground">{line.replace(/\*\*/g, "")}</p>;
            }
            return <p key={i} className="text-[13px] text-muted-foreground leading-relaxed">{line}</p>;
          })}
        </div>
      )}

      {/* Features — Green checkmarks */}
      {features.length > 0 && (
        <div className="space-y-1.5">
          {features.map((feat, i) => (
            <div key={i} className="flex items-start gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0 mt-0.5" />
              <span className="text-[13px] text-foreground/90">{feat}</span>
            </div>
          ))}
        </div>
      )}

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="rounded-xl border border-warning/20 bg-warning/5 p-3 space-y-1">
          <div className="flex items-center gap-1.5 text-warning font-bold text-[10px] uppercase tracking-wider">
            <ShieldAlert className="w-3.5 h-3.5" />
            Important
          </div>
          {warnings.map((warn, i) => (
            <p key={i} className="text-xs text-warning/80 font-medium">{warn}</p>
          ))}
        </div>
      )}

      {/* Download links */}
      {downloadLines.length > 0 && (
        <div className="space-y-1.5">
          {downloadLines.map((url, i) => (
            <a
              key={i}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-primary/8 border border-primary/15 text-primary font-semibold text-xs hover:bg-primary/15 transition-all duration-200"
            >
              <Download className="w-3.5 h-3.5" />
              Download Tool{downloadLines.length > 1 ? ` ${i + 1}` : ""}
            </a>
          ))}
        </div>
      )}

      {!description && (
        <p className="text-sm text-muted-foreground/50 italic">No description available.</p>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   SUCCESS MODAL
   ════════════════════════════════════════════════════════════ */
function SuccessModal({ result, credentialsList, onCopy, onClose, onNewOrder, navigate }: {
  result: PurchaseResult;
  credentialsList: string[];
  onCopy: (s: string) => void;
  onClose: () => void;
  onNewOrder: () => void;
  navigate: (path: string) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm animate-fade-in">
      <div className="rounded-2xl border border-border/20 bg-card/80 backdrop-blur-xl max-w-md w-full mx-4 p-8 space-y-6 relative shadow-[0_8px_60px_-4px_rgba(0,0,0,0.6)]">
        <button onClick={onClose} className="absolute top-4 right-4 p-1 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
          <X className="w-5 h-5" />
        </button>
        <Confetti />
        <div className="text-center space-y-3">
          <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto" style={{ boxShadow: "0 0 30px hsl(var(--success) / 0.15)" }}>
            <CheckCircle2 className="w-8 h-8 text-success" />
          </div>
          <h2 className="text-lg font-bold text-foreground">Order Successful!</h2>
          <p className="text-sm text-muted-foreground">Your order has been placed successfully</p>
        </div>
        <div className="space-y-2 bg-secondary/30 rounded-xl p-4">
          <DetailRow label="Product" value={result.product_name} />
          <DetailRow label="Amount" value={<Money amount={result.price} />} />
          <DetailRow label="Order ID" value={result.order_id.slice(0, 8).toUpperCase()} mono />
          <DetailRow label="Status" value={<span className="bg-success/15 text-success px-2 py-0.5 rounded-full text-xs font-semibold">Processing</span>} />
        </div>
        {credentialsList.length > 0 && (
          <div className="space-y-2">
            <p className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">Credentials</p>
            {credentialsList.map((cred, i) => (
              <div key={i} className="flex items-center gap-2">
                <code className="flex-1 text-xs font-mono text-primary bg-primary/5 border border-primary/10 px-3 py-2 rounded-lg break-all">{cred}</code>
                <button onClick={() => onCopy(cred)} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                  <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="flex gap-3">
          <Button className="flex-1 h-10 gap-2" onClick={() => navigate("/dashboard/orders")}>
            <Eye className="w-4 h-4" /> View Orders
          </Button>
          <Button variant="outline" className="flex-1 h-10" onClick={onNewOrder}>New Order</Button>
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("text-foreground font-medium", mono && "font-mono text-xs")}>{value}</span>
    </div>
  );
}
