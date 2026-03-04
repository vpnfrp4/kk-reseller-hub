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
  Zap,
  Copy,
  Eye,
  X,
  AlertTriangle,
  Search,
  Download,
  ShieldAlert,
  Sparkles,
  ArrowLeft,
  Smartphone,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Money } from "@/components/shared";
import { PageContainer } from "@/components/shared";

import Confetti from "@/components/Confetti";
import { motion, AnimatePresence } from "framer-motion";
import IFreeImeiCheck from "@/components/imei/IFreeImeiCheck";
import IFreeCheckHistory from "@/components/imei/IFreeCheckHistory";

interface PurchaseResult {
  order_id: string;
  credentials: string;
  product_name: string;
  price: number;
  quantity?: number;
}

export default function PlaceOrderPage() {
  const { user, profile, refreshProfile } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<"services" | "ifree">("services");
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, string>>({});
  const [purchasing, setPurchasing] = useState(false);
  const [result, setResult] = useState<PurchaseResult | null>(null);
  
  const [copied, setCopied] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Realtime
  useEffect(() => {
    const channel = supabase
      .channel("order-products-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "products" }, (payload) => {
        queryClient.invalidateQueries({ queryKey: ["products-for-order"] });
        const event = payload.eventType;
        const name = (payload.new as any)?.name || (payload.old as any)?.name || "A product";
        if (event === "INSERT") toast.info(`New service added: ${name}`, { icon: "🆕" });
        else if (event === "UPDATE") toast.info(`Service updated: ${name}`, { icon: "🔄" });
        else if (event === "DELETE") toast.info(`Service removed`, { icon: "🗑️" });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  const { data: products = [] } = useQuery({
    queryKey: ["products-for-order"],
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("*")
        .neq("type", "disabled")
        .order("sort_order", { ascending: true });
      return (data || []).filter((p: any) => p.product_type !== "digital" || p.stock > 0);
    },
  });

  const selectedProduct = products.find((p: any) => p.id === selectedProductId);

  const { data: customFields = [] } = useQuery({
    queryKey: ["product-custom-fields-order", selectedProductId],
    queryFn: async () => {
      const { data } = await supabase.from("product_custom_fields" as any).select("*").eq("product_id", selectedProductId).order("sort_order", { ascending: true });
      return (data || []) as any[];
    },
    enabled: !!selectedProductId,
  });

  const { data: usdRate } = useQuery({
    queryKey: ["usd-rate-place-order"],
    queryFn: async () => {
      const { data } = await supabase.from("system_settings").select("value").eq("key", "usd_mmk_rate").single();
      return Number((data?.value as any)?.rate) || 0;
    },
  });

  const { data: marginConfig } = useQuery({
    queryKey: ["margin-config-place-order"],
    queryFn: async () => {
      const { data } = await supabase.from("system_settings").select("value").eq("key", "margin_config").single();
      return (data?.value || { global_margin: 20, category_margins: {} }) as any;
    },
  });

  // Derived
  const isApiProduct = (selectedProduct as any)?.product_type === "api";
  const defaultMode = selectedProduct
    ? (Array.isArray(selectedProduct.fulfillment_modes) ? String((selectedProduct.fulfillment_modes as any[])[0]) : "instant")
    : "instant";
  const activeFields = customFields.filter((f: any) => f.linked_mode === defaultMode);

  const categories = useMemo(() => {
    const cats = new Map<string, number>();
    products.forEach((p: any) => cats.set(p.category || "Other", (cats.get(p.category || "Other") || 0) + 1));
    return [{ name: "All", count: products.length }, ...Array.from(cats.entries()).sort((a, b) => a[0].localeCompare(b[0])).map(([name, count]) => ({ name, count }))];
  }, [products]);

  const [activeCategory, setActiveCategory] = useState("All");

  const filteredProducts = useMemo(() => {
    return products.filter((p: any) => {
      const matchCat = activeCategory === "All" || p.category === activeCategory;
      const matchSearch = !searchQuery.trim() || p.name.toLowerCase().includes(searchQuery.trim().toLowerCase()) || String(p.display_id).includes(searchQuery.trim());
      return matchCat && matchSearch;
    });
  }, [products, searchQuery, activeCategory]);

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
    ? selectedProduct.delivery_time_config as Record<string, string> : {};
  const deliveryTime = deliveryTimeConfig[defaultMode] || selectedProduct?.processing_time || "Instant";
  const isInstant = defaultMode === "instant" || deliveryTime.toLowerCase().includes("instant");

  const handleSelectProduct = (id: string) => {
    setSelectedProductId(id);
    setCustomFieldValues({});
    setResult(null);
  };

  const handleBack = () => {
    setSelectedProductId("");
    setCustomFieldValues({});
    setResult(null);
  };

  const handlePurchase = async () => {
    if (!selectedProduct || purchasing) return;
    for (const field of activeFields) {
      if (field.required && !customFieldValues[field.field_name]?.trim()) { toast.error(`${field.field_name} is required`); return; }
    }
    if (hasInsufficientBalance) { toast.error("Insufficient balance"); return; }
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
      if (data && !data.success) { toast.error(data.error as string); return; }
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
    <PageContainer maxWidth="max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-9 h-9 rounded-[var(--radius-btn)] bg-primary/10 flex items-center justify-center">
          <ShoppingCart className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">Place Order</h1>
          <p className="text-xs text-muted-foreground">Select a service and place your order</p>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex gap-1.5 mb-5 p-1 rounded-[var(--radius-btn)] bg-secondary/40 border border-border w-fit">
        <button
          onClick={() => setActiveTab("services")}
          className={cn(
            "flex items-center gap-1.5 px-4 py-2 rounded-[var(--radius-btn)] text-xs font-bold transition-all duration-200",
            activeTab === "services"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
          )}
        >
          <ShoppingCart className="w-3.5 h-3.5" /> Services
        </button>
        <button
          onClick={() => setActiveTab("ifree")}
          className={cn(
            "flex items-center gap-1.5 px-4 py-2 rounded-[var(--radius-btn)] text-xs font-bold transition-all duration-200",
            activeTab === "ifree"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
          )}
        >
          <Smartphone className="w-3.5 h-3.5" /> iFree IMEI Check
        </button>
      </div>

      {activeTab === "ifree" ? (
        <div className="space-y-6">
          <IFreeImeiCheck />
          <IFreeCheckHistory />
        </div>
      ) : (
      <AnimatePresence mode="wait">
        {/* ═══════════════════════════════════════════
            MODE 1: SELECTION — no service chosen yet
            ═══════════════════════════════════════════ */}
        {!selectedProduct ? (
          <motion.div
            key="selection"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <div className="rounded-[var(--radius-card)] border border-border bg-card overflow-hidden" style={{ boxShadow: "var(--shadow-card)" }}>
              {/* Card Header */}
              <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
                <h2 className="text-sm font-bold text-foreground">Select a Service</h2>
                <span className="text-[10px] font-mono text-muted-foreground">{filteredProducts.length} available</span>
              </div>

              {/* Search */}
              <div className="px-5 py-3 border-b border-border">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50 pointer-events-none" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by name or #ID..."
                    className="pl-9 h-9 bg-secondary/50 border-border text-sm rounded-[var(--radius-input)]"
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded text-muted-foreground/50 hover:text-foreground">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Category Pills */}
              <div className="px-5 py-2.5 border-b border-border flex gap-1.5 overflow-x-auto stool-scrollbar">
                {categories.map((cat) => (
                  <button
                    key={cat.name}
                    onClick={() => setActiveCategory(cat.name)}
                    className={cn(
                      "shrink-0 px-3 py-1.5 text-[10px] font-bold rounded-[var(--radius-btn)] border transition-all duration-200",
                      activeCategory === cat.name
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-secondary/30 text-muted-foreground border-border hover:border-primary/30 hover:text-foreground"
                    )}
                  >
                    {cat.name}
                    <span className="ml-1 opacity-60 font-mono">{cat.count}</span>
                  </button>
                ))}
              </div>

              {/* Service List */}
              <div className="max-h-[70vh] overflow-y-auto stool-scrollbar" style={{ WebkitOverflowScrolling: 'touch' }}>
                {filteredProducts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-muted-foreground/40">
                    <Search className="w-7 h-7 mb-2" />
                    <p className="text-xs font-medium">No services found</p>
                  </div>
                ) : (
                  filteredProducts.map((p: any) => (
                    <button
                      key={p.id}
                      onClick={() => handleSelectProduct(p.id)}
                      className="w-full text-left px-5 py-3 flex items-center justify-between border-b border-border/50 hover:bg-secondary/40 transition-colors duration-150"
                    >
                      <span className="text-[13px] text-secondary-foreground truncate leading-snug">
                        <span className="font-mono text-primary/70 font-bold mr-1.5">#{p.display_id}</span>
                        {p.name}
                      </span>
                      <span className="font-mono text-xs font-bold text-foreground/70 tabular-nums shrink-0 ml-3">
                        <Money amount={p.wholesale_price} compact />
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>
          </motion.div>
        ) : (
          /* ═══════════════════════════════════════════
             MODE 2: DETAILS — service selected
             ═══════════════════════════════════════════ */
          <motion.div
            key={`detail-${selectedProduct.id}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="space-y-4"
          >
            {/* Change Service button */}
            <button
              onClick={handleBack}
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors duration-150"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="font-medium">Change Service</span>
            </button>

            {/* Service Detail Card — full width, main focus */}
            <div className="rounded-[var(--radius-card)] border border-border bg-card overflow-hidden" style={{ boxShadow: "var(--shadow-card)" }}>
              {/* Header */}
              <div className="px-5 py-4 border-b border-border">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="text-lg font-bold text-foreground leading-tight">{selectedProduct.name}</h2>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <span className="font-mono text-[10px] text-primary bg-primary/10 px-2 py-0.5 rounded-md font-bold">
                        #{selectedProduct.display_id}
                      </span>
                      <span className="text-[10px] text-muted-foreground font-medium">{selectedProduct.category}</span>
                    </div>
                  </div>
                  <span className="text-2xl font-extrabold font-mono tabular-nums text-foreground shrink-0">
                    <Money amount={totalPrice} />
                  </span>
                </div>

                {/* Badges */}
                <div className="flex items-center gap-2 mt-3 flex-wrap">
                  <span className={cn(
                    "inline-flex items-center gap-1 text-[10px] font-bold rounded-[var(--radius-btn)] px-2.5 py-1 border",
                    isInstant ? "bg-success/10 text-success border-success/20" : "bg-warning/10 text-warning border-warning/20"
                  )}>
                    {isInstant ? <Zap className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                    {isInstant ? "Auto Instant" : "Manual"}
                  </span>
                  {selectedProduct.product_type === "digital" && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold rounded-[var(--radius-btn)] px-2.5 py-1 bg-primary/10 text-primary border border-primary/20">
                      <Zap className="w-3 h-3" /> AUTO-INSTANT
                    </span>
                  )}
                  {deliveryTime && deliveryTime !== "Instant" && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold rounded-[var(--radius-btn)] px-2.5 py-1 bg-ice/10 text-ice border border-ice/20">
                      <Clock className="w-3 h-3" /> {deliveryTime}
                    </span>
                  )}
                  {selectedProduct.description?.toLowerCase().includes("no refund") && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold rounded-[var(--radius-btn)] px-2.5 py-1 bg-destructive/10 text-destructive border border-destructive/20">
                      <ShieldAlert className="w-3 h-3" /> NO REFUND
                    </span>
                  )}
                </div>
              </div>

              {/* Description */}
              <div className="px-5 py-4 border-b border-border stool-scrollbar max-h-[40vh] overflow-y-auto">
                <ServiceDescription product={selectedProduct} />
              </div>

              {/* ─── Order Form (inside the same card) ─── */}
              <div className="px-5 py-5 space-y-4">
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
                            className="w-full h-10 rounded-[var(--radius-input)] bg-secondary/50 border border-border px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40"
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
                            className="bg-secondary/50 border-border font-mono text-sm rounded-[var(--radius-input)]"
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
                <div className="rounded-[var(--radius-btn)] bg-secondary/30 border border-border p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Total Price</span>
                    <span className="text-lg font-extrabold font-mono tabular-nums text-foreground">
                      <Money amount={totalPrice} />
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Your Balance</span>
                    <span className={cn("text-xs font-bold font-mono tabular-nums", hasInsufficientBalance ? "text-destructive" : "text-success")}>
                      <Money amount={balance} />
                    </span>
                  </div>
                </div>

                {hasInsufficientBalance && (
                  <div className="flex items-center gap-2 text-xs bg-destructive/8 text-destructive px-3 py-2.5 rounded-[var(--radius-btn)] border border-destructive/15">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>Need <Money amount={totalPrice - balance} className="inline font-bold" /> more.</span>
                    <button onClick={() => navigate("/dashboard/wallet")} className="text-primary font-semibold hover:underline ml-auto shrink-0">Top Up</button>
                  </div>
                )}

                <Button
                  onClick={handlePurchase}
                  disabled={!selectedProduct || purchasing || hasInsufficientBalance}
                  className={cn(
                    "w-full h-12 font-bold text-sm gap-2 rounded-[var(--radius-btn)]",
                    "bg-primary hover:bg-primary/90 text-primary-foreground",
                    "shadow-[0_0_20px_hsl(var(--primary)/0.25)] hover:shadow-[0_0_30px_hsl(var(--primary)/0.4)]",
                    "transition-all duration-300",
                    hasInsufficientBalance && "opacity-40 shadow-none"
                  )}
                >
                  {purchasing ? (
                    <><div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" /> Processing...</>
                  ) : (
                    <><CheckCircle2 className="w-4 h-4" /> Place Order</>
                  )}
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      )}



      {/* Success Modal */}
      {result && <SuccessModal result={result} credentialsList={credentialsList} onCopy={copyCredentials} onClose={() => setResult(null)} onNewOrder={() => { setResult(null); setSelectedProductId(""); setCustomFieldValues({}); }} navigate={navigate} />}
      
    </PageContainer>
  );
}

/* ═══ SERVICE DESCRIPTION ═══ */
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
    } else if (lower.includes("no refund") || lower.includes("important") || lower.includes("warning") || (trimmed === trimmed.toUpperCase() && trimmed.length > 5 && !trimmed.startsWith("#"))) {
      warnings.push(trimmed);
    } else {
      regularLines.push(trimmed);
    }
  }

  return (
    <div className="space-y-3">
      {regularLines.length > 0 && (
        <div className="space-y-1.5">
          {regularLines.map((line, i) => {
            if (line.startsWith("**") && line.endsWith("**"))
              return <p key={i} className="text-sm font-bold text-foreground">{line.replace(/\*\*/g, "")}</p>;
            return <p key={i} className="text-[13px] text-muted-foreground leading-relaxed">{line}</p>;
          })}
        </div>
      )}
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
      {warnings.length > 0 && (
        <div className="rounded-[var(--radius-btn)] border border-destructive/20 bg-destructive/5 p-3 space-y-1">
          <div className="flex items-center gap-1.5 text-destructive font-bold text-[10px] uppercase tracking-wider">
            <ShieldAlert className="w-3.5 h-3.5" /> Important Notice
          </div>
          {warnings.map((warn, i) => (
            <p key={i} className="text-xs text-destructive/80 font-medium">{warn}</p>
          ))}
        </div>
      )}
      {downloadLines.length > 0 && (
        <div className="space-y-1.5">
          {downloadLines.map((url, i) => (
            <a key={i} href={url} target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-[var(--radius-btn)] bg-primary/8 border border-primary/15 text-primary font-semibold text-xs hover:bg-primary/15 transition-all duration-200">
              <Download className="w-3.5 h-3.5" /> Download Tool{downloadLines.length > 1 ? ` ${i + 1}` : ""}
            </a>
          ))}
        </div>
      )}
      {!description && <p className="text-sm text-muted-foreground/50 italic">No description available.</p>}
    </div>
  );
}

/* ═══ SUCCESS MODAL ═══ */
function SuccessModal({ result, credentialsList, onCopy, onClose, onNewOrder, navigate }: {
  result: PurchaseResult; credentialsList: string[];
  onCopy: (s: string) => void; onClose: () => void; onNewOrder: () => void; navigate: (path: string) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm animate-fade-in">
      <div className="rounded-[var(--radius-modal)] border border-border bg-card max-w-md w-full mx-4 p-8 space-y-6 relative" style={{ boxShadow: "var(--shadow-elevated)" }}>
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
        <div className="space-y-2 bg-secondary/30 rounded-[var(--radius-btn)] p-4">
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
                <button onClick={() => onCopy(cred)} className="p-1.5 rounded-lg hover:bg-muted transition-colors"><Copy className="w-3.5 h-3.5 text-muted-foreground" /></button>
              </div>
            ))}
          </div>
        )}
        <div className="flex gap-3">
          <Button className="flex-1 h-10 gap-2" onClick={() => navigate("/dashboard/orders")}><Eye className="w-4 h-4" /> View Orders</Button>
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
