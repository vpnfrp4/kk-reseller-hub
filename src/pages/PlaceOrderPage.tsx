import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
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
import ServiceSelector from "@/components/products/ServiceSelector";
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
  Wallet,
  Download,
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

  // Fetch all active products
  const { data: products = [] } = useQuery({
    queryKey: ["products-for-order"],
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("*")
        .gt("stock", 0)
        .order("sort_order", { ascending: true });
      return data || [];
    },
  });

  const selectedProduct = products.find((p: any) => p.id === selectedProductId);

  // Fetch custom fields for selected product
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

  // Fetch exchange rate for API pricing
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

  const isApiProduct = (selectedProduct as any)?.product_type === "api";
  const defaultMode = selectedProduct
    ? (Array.isArray(selectedProduct.fulfillment_modes) ? String((selectedProduct.fulfillment_modes as any[])[0]) : "instant")
    : "instant";

  const activeFields = customFields.filter((f: any) => f.linked_mode === defaultMode);

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

  // For API products, get quantity from custom fields
  const apiQuantityField = isApiProduct ? activeFields.find((f: any) => f.field_type === "quantity") : null;
  const apiQuantity = apiQuantityField ? (parseInt(customFieldValues[apiQuantityField.field_name]) || 0) : 1;
  const totalPrice = isApiProduct ? unitPrice * apiQuantity : unitPrice;
  const balance = profile?.balance || 0;
  const hasInsufficientBalance = totalPrice > balance;

  const deliveryTimeConfig: Record<string, string> = selectedProduct?.delivery_time_config && typeof selectedProduct.delivery_time_config === "object"
    ? selectedProduct.delivery_time_config as Record<string, string>
    : {};
  const deliveryTime = deliveryTimeConfig[defaultMode] || selectedProduct?.processing_time || "Instant";

  // Determine delivery label
  const isInstant = defaultMode === "instant" || deliveryTime.toLowerCase().includes("instant");

  const handlePurchase = async () => {
    if (!selectedProduct || purchasing) return;

    // Validate required fields
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
        if (urlField) {
          purchaseBody.link = customFieldValues[urlField.field_name] || "";
        }
        purchaseBody.service_id = (selectedProduct as any).api_service_id || "";
      }

      const { data, error } = await supabase.functions.invoke("purchase", {
        body: purchaseBody,
      });
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
        <ShoppingCart className="w-6 h-6 text-foreground" />
        <h1 className="text-xl font-bold text-foreground">Place Order</h1>
      </div>

      {/* Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in" style={{ animationDelay: "0.05s" }}>
        {/* LEFT: Available Services */}
        <div className="glass-card overflow-hidden">
          <div className="p-6 text-center border-b border-border/30">
            <h2 className="text-lg font-bold text-foreground">Available Services</h2>
          </div>
          <div className="p-6 space-y-5">
            {/* Service Selector */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-muted-foreground">Service Name</Label>
              <ServiceSelector
                services={products.map((p: any) => ({
                  id: p.id,
                  slug: p.slug,
                  name: p.name,
                  wholesale_price: p.wholesale_price,
                  category: p.category,
                  product_type: p.product_type,
                  stock: p.stock,
                  type: p.type,
                  display_id: p.display_id,
                  delivery_time_config: p.delivery_time_config,
                  fulfillment_modes: p.fulfillment_modes,
                  processing_time: p.processing_time,
                }))}
                onSelect={(service) => {
                  setSelectedProductId(service.id);
                  setCustomFieldValues({});
                  setResult(null);
                }}
              />
            </div>

            {/* Service Price Display */}
            {selectedProduct && (
              <div className="balance-card text-center space-y-2">
                <p className="text-3xl font-extrabold font-mono tabular-nums gold-shimmer">
                  <Money amount={totalPrice} />
                </p>
                <div className="flex items-center justify-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Delivery:</span>
                  <span className={cn(
                    "text-xs font-semibold px-2 py-0.5 rounded-full",
                    isInstant ? "label-instant" : "label-manual"
                  )}>
                    {deliveryTime}
                  </span>
                </div>
              </div>
            )}

            {/* Custom Fields */}
            {activeFields.map((field: any) => (
              <div key={field.id} className="space-y-2">
                <Label className="text-sm font-medium text-muted-foreground">
                  {field.field_name}
                  {field.required && <span className="text-destructive ml-0.5">*</span>}
                </Label>
                {field.field_type === "select" && Array.isArray(field.options) && field.options.length > 0 ? (
                  <Select
                    value={customFieldValues[field.field_name] || ""}
                    onValueChange={(val) => setCustomFieldValues(prev => ({ ...prev, [field.field_name]: val }))}
                  >
                    <SelectTrigger className="bg-secondary border-border">
                      <SelectValue placeholder={field.placeholder || `Select ${field.field_name}`} />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border">
                      {(field.options as string[]).map((opt: string) => (
                        <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    type={field.field_type === "number" || field.field_type === "quantity" ? "number" : field.field_type === "url" ? "url" : "text"}
                    value={customFieldValues[field.field_name] || ""}
                    onChange={(e) => setCustomFieldValues(prev => ({ ...prev, [field.field_name]: e.target.value }))}
                    placeholder={field.placeholder || `Enter ${field.field_name}`}
                    className="bg-secondary border-border font-mono"
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

            {/* Insufficient balance warning */}
            {selectedProduct && hasInsufficientBalance && (
              <div className="flex items-center gap-2 text-xs text-warning bg-warning/10 px-3 py-2 rounded-lg">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>Insufficient balance. Need {(totalPrice - balance).toLocaleString()} MMK more.</span>
                <button
                  onClick={() => setTopUpOpen(true)}
                  className="text-primary font-medium hover:underline ml-auto shrink-0"
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
                "w-full h-12 btn-glow font-semibold text-sm gap-2",
                "transition-all duration-200",
                (!selectedProduct || hasInsufficientBalance) && "opacity-50"
              )}
            >
              {purchasing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
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

        {/* RIGHT: Service Description */}
        <div className="glass-card overflow-hidden">
          <div className="p-6 text-center border-b border-border/30">
            <h2 className="text-lg font-bold text-foreground">Service Description</h2>
          </div>
          <div className="p-6">
            {!selectedProduct ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <Info className="w-8 h-8 text-primary" />
                </div>
                <p className="text-sm">Select a service to view details</p>
              </div>
            ) : (
              <div className="space-y-4">
                <ServiceDescription product={selectedProduct} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* SUCCESS MODAL */}
      {result && (
        <div className="fixed inset-0 z-50 flex items-center justify-center success-modal-overlay animate-fade-in">
          <div className="glass-card max-w-md w-full mx-4 p-8 space-y-6 relative">
            <button
              onClick={() => setResult(null)}
              className="absolute top-4 right-4 p-1 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <Confetti />

            {/* Success Icon */}
            <div className="text-center space-y-3">
              <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto" style={{ boxShadow: "0 0 30px hsl(var(--success) / 0.15)" }}>
                <CheckCircle2 className="w-8 h-8 text-success" />
              </div>
              <h2 className="text-lg font-bold text-foreground">Order Successful!</h2>
              <p className="text-sm text-muted-foreground">Your order has been placed successfully</p>
            </div>

            {/* Order Details */}
            <div className="space-y-2 bg-secondary/30 rounded-[var(--radius-card)] p-4">
              <DetailRow label="Product" value={result.product_name} />
              <DetailRow label="Amount" value={<Money amount={result.price} />} />
              <DetailRow label="Order ID" value={result.order_id.slice(0, 8).toUpperCase()} mono />
              <DetailRow label="Status" value={<span className="label-instant px-2 py-0.5 rounded-full text-xs font-semibold">Processing</span>} />
            </div>

            {/* Credentials */}
            {credentialsList.length > 0 && (
              <div className="space-y-2">
                <p className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">Credentials</p>
                {credentialsList.map((cred, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <code className="flex-1 text-xs font-mono text-primary bg-primary/5 border border-primary/10 px-3 py-2 rounded-lg break-all">
                      {cred}
                    </code>
                    <button
                      onClick={() => copyCredentials(cred)}
                      className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                    >
                      <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <Button className="flex-1 h-10 gap-2" onClick={() => navigate("/dashboard/orders")}>
                <Eye className="w-4 h-4" /> View Orders
              </Button>
              <Button variant="outline" className="flex-1 h-10" onClick={() => { setResult(null); setSelectedProductId(""); setCustomFieldValues({}); }}>
                New Order
              </Button>
            </div>
          </div>
        </div>
      )}

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

function DetailRow({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("text-foreground font-medium", mono && "font-mono text-xs")}>{value}</span>
    </div>
  );
}

function ServiceDescription({ product }: { product: any }) {
  const description = product.description || "";
  const allLines = description.split("\n").filter((l: string) => l.trim());

  // Extract download URLs from description lines
  const urlRegex = /https?:\/\/[^\s)>\]]+/gi;
  const downloadLines: string[] = [];
  const displayLines: string[] = [];

  for (const line of allLines) {
    const lower = line.toLowerCase();
    if (lower.includes("[download]") || lower.includes("download tool") || lower.includes("download link")) {
      const urls = line.match(urlRegex);
      if (urls) downloadLines.push(...urls);
    } else {
      displayLines.push(line);
    }
  }

  return (
    <div className="prose prose-sm prose-invert max-w-none space-y-1">
      {displayLines.map((line: string, i: number) => {
        const trimmed = line.trim();

        // Check marks ✅
        if (trimmed.startsWith("✅") || trimmed.startsWith("✓")) {
          return (
            <div key={i} className="flex items-start gap-2 py-1">
              <CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-0.5" />
              <span className="text-sm text-foreground">{trimmed.replace(/^[✅✓]\s*/, "")}</span>
            </div>
          );
        }

        // Warning lines (UPPERCASE or contains WARNING/IMPORTANT)
        if (trimmed === trimmed.toUpperCase() && trimmed.length > 5 && !trimmed.startsWith("#")) {
          return (
            <p key={i} className="text-sm font-bold text-warning py-1">{trimmed}</p>
          );
        }

        // Bold lines
        if (trimmed.startsWith("**") && trimmed.endsWith("**")) {
          return (
            <p key={i} className="text-sm font-bold text-foreground py-1">{trimmed.replace(/\*\*/g, "")}</p>
          );
        }

        // Regular text
        return (
          <p key={i} className="text-sm text-muted-foreground py-0.5">{trimmed}</p>
        );
      })}

      {/* Download Tool Button */}
      {downloadLines.length > 0 && (
        <div className="pt-4 border-t border-border/20 mt-4">
          {downloadLines.map((url, i) => (
            <a
              key={i}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "flex items-center justify-center gap-2 w-full py-3 rounded-xl",
                "bg-primary/10 border border-primary/20 text-primary font-semibold text-sm",
                "hover:bg-primary/20 transition-all duration-200",
                "mb-2 last:mb-0"
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
