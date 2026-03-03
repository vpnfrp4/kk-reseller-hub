import { useState, useMemo, useEffect } from "react";
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
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Money } from "@/components/shared";
import { PageContainer } from "@/components/shared";
import TopUpDialog from "@/components/wallet/TopUpDialog";
import Confetti from "@/components/Confetti";

interface PurchaseResult {
  order_id: string;
  credentials: string;
  product_name: string;
  price: number;
  quantity?: number;
}

/* ════════════════════════════════════════════════════════════
   PLACE ORDER PAGE — S-Tool Pro Layout
   ════════════════════════════════════════════════════════════ */
export default function PlaceOrderPage() {
  const { user, profile, refreshProfile } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

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
      .on("postgres_changes", { event: "*", schema: "public", table: "products" }, () => {
        queryClient.invalidateQueries({ queryKey: ["products-for-order"] });
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
      // Filter: hide digital products with 0 stock, keep all others
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

  // Categories
  const categories = useMemo(() => {
    const cats = new Set<string>();
    products.forEach((p: any) => cats.add(p.category || "Other"));
    return ["All", ...Array.from(cats).sort()];
  }, [products]);

  // Filtered products
  const filteredProducts = useMemo(() => {
    return products.filter((p: any) => {
      const matchesCategory = activeCategory === "All" || p.category === activeCategory;
      const matchesSearch = !searchQuery ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        String(p.display_id).includes(searchQuery);
      return matchesCategory && matchesSearch;
    });
  }, [products, activeCategory, searchQuery]);

  // Price calculation
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

  // ── Handlers ──
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
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 animate-fade-in" style={{ animationDelay: "0.05s" }}>

        {/* ═══ LEFT: Available Services (3/5) ═══ */}
        <div className="lg:col-span-3 stool-card flex flex-col">
          <div className="stool-card-header">
            <Package className="w-4 h-4 text-primary" />
            <span className="font-semibold text-foreground text-sm">Available Services</span>
            <span className="ml-auto text-xs text-muted-foreground">{filteredProducts.length} services</span>
          </div>

          <div className="p-4 space-y-3 flex flex-col flex-1 min-h-0">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name or ID..."
                className="pl-9 h-10 bg-secondary/60 border-border text-sm"
              />
            </div>

            {/* Category Filters */}
            <div className="flex gap-1.5 flex-wrap">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={cn(
                    "px-3 py-1.5 text-[11px] font-semibold rounded-full border transition-all duration-200",
                    activeCategory === cat
                      ? "bg-primary text-primary-foreground border-primary shadow-[0_0_12px_hsl(var(--primary)/0.3)]"
                      : "bg-secondary/50 text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Scrollable Service List */}
            <div className="flex-1 min-h-0 overflow-y-auto stool-scrollbar space-y-1 max-h-[420px] pr-1">
              {filteredProducts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Search className="w-8 h-8 mb-2 opacity-40" />
                  <p className="text-sm">No services found</p>
                </div>
              ) : (
                filteredProducts.map((p: any) => {
                  const isSelected = p.id === selectedProductId;
                  const isAuto = Array.isArray(p.fulfillment_modes) && (p.fulfillment_modes as any[]).includes("instant");
                  return (
                    <button
                      key={p.id}
                      onClick={() => {
                        setSelectedProductId(p.id);
                        setCustomFieldValues({});
                        setResult(null);
                      }}
                      className={cn(
                        "w-full text-left px-3 py-2.5 rounded-[var(--radius-btn)] border transition-all duration-200 group",
                        isSelected
                          ? "bg-primary/10 border-primary/40 shadow-[0_0_15px_hsl(var(--primary)/0.1)]"
                          : "bg-secondary/30 border-transparent hover:bg-secondary/60 hover:border-border"
                      )}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <span className="font-mono text-[11px] text-primary font-bold shrink-0">#{p.display_id}</span>
                          <span className={cn(
                            "text-sm truncate",
                            isSelected ? "text-foreground font-semibold" : "text-secondary-foreground"
                          )}>
                            {p.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={cn(
                            "inline-flex items-center gap-0.5 text-[9px] font-bold rounded-full px-1.5 py-0.5",
                            isAuto ? "bg-success/15 text-success" : "bg-warning/15 text-warning"
                          )}>
                            {isAuto ? <Zap className="w-2.5 h-2.5" /> : <Clock className="w-2.5 h-2.5" />}
                            {isAuto ? "Instant" : "Manual"}
                          </span>
                          <span className="font-mono text-xs font-bold text-foreground tabular-nums">
                            <Money amount={p.wholesale_price} />
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {/* Custom Fields (shown when product selected) */}
            {selectedProduct && activeFields.length > 0 && (
              <div className="border-t border-border/40 pt-3 space-y-3">
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
                        className="w-full h-10 rounded-[var(--radius-input)] bg-secondary/60 border border-border px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
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
                        className="bg-secondary/60 border-border font-mono text-sm"
                        min={field.min_length || undefined}
                        max={field.max_length || undefined}
                      />
                    )}
                    {(field.field_type === "quantity" || field.field_type === "number") && (field.min_length || field.max_length) && (
                      <p className="text-[10px] text-muted-foreground">
                        {field.min_length ? `Min: ${field.min_length.toLocaleString()}` : ""}
                        {field.min_length && field.max_length ? " · " : ""}
                        {field.max_length ? `Max: ${field.max_length.toLocaleString()}` : ""}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Price Summary + Insufficient balance */}
            {selectedProduct && (
              <div className="border-t border-border/40 pt-3 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Total Price</span>
                  <span className="text-lg font-extrabold font-mono tabular-nums text-foreground">
                    <Money amount={totalPrice} />
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Delivery</span>
                  <span className={cn(
                    "text-xs font-semibold px-2.5 py-1 rounded-full",
                    isInstant ? "bg-success/15 text-success" : "bg-warning/15 text-warning"
                  )}>
                    {isInstant && <Zap className="w-3 h-3 inline mr-1" />}
                    {deliveryTime}
                  </span>
                </div>

                {hasInsufficientBalance && (
                  <div className="flex items-center gap-2 text-xs bg-destructive/10 text-destructive px-3 py-2.5 rounded-[var(--radius-btn)] border border-destructive/20">
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
              </div>
            )}

            {/* Place Order Button */}
            <Button
              onClick={handlePurchase}
              disabled={!selectedProduct || purchasing || hasInsufficientBalance}
              className={cn(
                "w-full h-12 font-bold text-sm gap-2 rounded-[var(--radius-btn)]",
                "bg-primary hover:bg-primary/90 text-primary-foreground",
                "shadow-[0_0_20px_hsl(var(--primary)/0.25)] hover:shadow-[0_0_30px_hsl(var(--primary)/0.4)]",
                "transition-all duration-300",
                (!selectedProduct || hasInsufficientBalance) && "opacity-40 shadow-none"
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
        </div>

        {/* ═══ RIGHT: Service Description (2/5) ═══ */}
        <div className="lg:col-span-2 stool-card flex flex-col">
          <div className="stool-card-header">
            <Info className="w-4 h-4 text-primary" />
            <span className="font-semibold text-foreground text-sm">Service Description</span>
          </div>

          <div className="p-4 flex-1 overflow-y-auto stool-scrollbar">
            {!selectedProduct ? (
              <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-muted-foreground">
                <div className="w-16 h-16 rounded-full bg-primary/5 border border-border flex items-center justify-center mb-4">
                  <Info className="w-7 h-7 text-primary/50" />
                </div>
                <p className="text-sm font-medium">Please select a service to view details.</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Choose from the list on the left</p>
              </div>
            ) : (
              <ServiceDescription product={selectedProduct} />
            )}
          </div>
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
   SERVICE DESCRIPTION — S-Tool Pro Style
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
    <div className="space-y-4">
      {/* Product Name Header */}
      <div className="pb-3 border-b border-border/30">
        <h3 className="text-base font-bold text-foreground">{product.name}</h3>
        <div className="flex items-center gap-2 mt-1.5">
          <span className="font-mono text-[11px] text-primary bg-primary/10 px-2 py-0.5 rounded-full font-semibold">
            #{product.display_id}
          </span>
          <span className="text-xs text-muted-foreground">{product.category}</span>
        </div>
      </div>

      {/* Regular description text */}
      {regularLines.length > 0 && (
        <div className="space-y-1.5">
          {regularLines.map((line, i) => {
            if (line.startsWith("**") && line.endsWith("**")) {
              return <p key={i} className="text-sm font-bold text-foreground">{line.replace(/\*\*/g, "")}</p>;
            }
            return <p key={i} className="text-sm text-muted-foreground leading-relaxed">{line}</p>;
          })}
        </div>
      )}

      {/* Features List — Green Checkmarks */}
      {features.length > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] uppercase tracking-widest font-bold text-success/80">Features</p>
          <div className="space-y-1.5">
            {features.map((feat, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-0.5" />
                <span className="text-sm text-foreground">{feat}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Warnings — Orange/Red Box */}
      {warnings.length > 0 && (
        <div className="rounded-[var(--radius-btn)] border border-warning/30 bg-warning/5 p-3 space-y-1.5">
          <div className="flex items-center gap-2 text-warning font-bold text-xs uppercase tracking-wider">
            <ShieldAlert className="w-4 h-4" />
            Important Notice
          </div>
          {warnings.map((warn, i) => (
            <p key={i} className="text-xs text-warning/90 font-medium">{warn}</p>
          ))}
        </div>
      )}

      {/* Download Tool Button */}
      {downloadLines.length > 0 && (
        <div className="pt-2 space-y-2">
          {downloadLines.map((url, i) => (
            <a
              key={i}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "flex items-center justify-center gap-2 w-full py-3 rounded-[var(--radius-btn)]",
                "bg-primary/10 border border-primary/20 text-primary font-semibold text-sm",
                "hover:bg-primary/20 hover:border-primary/30 transition-all duration-200"
              )}
            >
              <Download className="w-4 h-4" />
              Download Tool{downloadLines.length > 1 ? ` ${i + 1}` : ""}
            </a>
          ))}
        </div>
      )}

      {!description && (
        <p className="text-sm text-muted-foreground italic">No description available for this service.</p>
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
      <div className="stool-card max-w-md w-full mx-4 p-8 space-y-6 relative">
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
        <div className="space-y-2 bg-secondary/30 rounded-[var(--radius-card)] p-4">
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
