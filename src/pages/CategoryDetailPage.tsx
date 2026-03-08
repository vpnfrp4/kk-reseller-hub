import { useState, useMemo, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { sanitizeName } from "@/lib/sanitize-name";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ShoppingCart, CheckCircle2, Clock, Zap, Copy, Eye, X,
  AlertTriangle, Search, Download, ShieldAlert, ArrowRight, ArrowLeft,
  Link2, Star, ChevronLeft, Wifi,
} from "lucide-react";
import { getCategoryIcon, getCategoryIconColor } from "@/lib/category-icons";
import ProductIcon from "@/components/products/ProductIcon";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Money, PageContainer } from "@/components/shared";
import Confetti from "@/components/Confetti";
import OrderSuccessCard from "@/components/products/OrderSuccessCard";
import { motion } from "framer-motion";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import IFreeImeiCheck, { type IFreeImeiCheckHandle } from "@/components/imei/IFreeImeiCheck";
import IFreeCheckHistory from "@/components/imei/IFreeCheckHistory";

interface PurchaseResult {
  order_id: string;
  credentials: string;
  product_name: string;
  price: number;
  quantity?: number;
}

const FAVORITES_KEY = "kktech_favorite_services";
function getFavorites(): string[] {
  try { return JSON.parse(localStorage.getItem(FAVORITES_KEY) || "[]"); } catch { return []; }
}
function setFavoritesStorage(ids: string[]) {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(ids));
}

export default function CategoryDetailPage() {
  const { category } = useParams<{ category: string }>();
  const decodedCategory = decodeURIComponent(category || "");
  const { user, profile, refreshProfile } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [selectedProductId, setSelectedProductId] = useState("");
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, string>>({});
  const [purchasing, setPurchasing] = useState(false);
  const [result, setResult] = useState<PurchaseResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [favorites, setFavoritesState] = useState<string[]>(getFavorites);
  const [quickOrderOpen, setQuickOrderOpen] = useState(false);
  const imeiCheckRef = useRef<IFreeImeiCheckHandle>(null);

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["category-products", decodedCategory],
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("*")
        .eq("category", decodedCategory)
        .neq("type", "disabled")
        .order("sort_order", { ascending: true });
      return (data || []).filter((p: any) => p.product_type !== "digital" || p.stock > 0);
    },
    enabled: !!decodedCategory,
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

  const { data: tierDiscount = 0 } = useQuery({
    queryKey: ["user-tier-discount", profile?.tier],
    queryFn: async () => {
      if (!profile?.tier) return 0;
      const { data } = await supabase.from("reseller_tiers").select("discount_percent").ilike("name", profile.tier).maybeSingle();
      return Number(data?.discount_percent) || 0;
    },
    enabled: !!profile?.tier,
  });

  const isApiProduct = (selectedProduct as any)?.product_type === "api";
  const defaultMode = selectedProduct
    ? (Array.isArray(selectedProduct.fulfillment_modes) ? String((selectedProduct.fulfillment_modes as any[])[0]) : "instant")
    : "instant";
  const activeFields = customFields.filter((f: any) => f.linked_mode === defaultMode);

  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p: any) =>
      p.name.toLowerCase().includes(q) ||
      String(p.display_id).includes(q) ||
      (p.brand && p.brand.toLowerCase().includes(q))
    );
  }, [products, searchQuery]);

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
  const baseTotal = isApiProduct ? unitPrice * apiQuantity : unitPrice;
  const discountAmount = tierDiscount > 0 ? Math.floor(baseTotal * (tierDiscount / 100)) : 0;
  const totalPrice = baseTotal - discountAmount;
  const balance = profile?.balance || 0;
  const hasInsufficientBalance = totalPrice > balance;

  const deliveryTimeConfig: Record<string, string> = selectedProduct?.delivery_time_config && typeof selectedProduct.delivery_time_config === "object"
    ? selectedProduct.delivery_time_config as Record<string, string> : {};
  const deliveryTime = deliveryTimeConfig[defaultMode] || selectedProduct?.processing_time || "Instant";
  const isInstant = defaultMode === "instant" || deliveryTime.toLowerCase().includes("instant");

  const toggleFavorite = useCallback((id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setFavoritesState(prev => {
      const next = prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id];
      setFavoritesStorage(next);
      return next;
    });
  }, []);

  const handleSelectProduct = (id: string) => {
    setSelectedProductId(id);
    setCustomFieldValues({});
    setResult(null);
    setQuickOrderOpen(true);
  };

  const handleCloseModal = () => {
    setQuickOrderOpen(false);
    setTimeout(() => { setSelectedProductId(""); setCustomFieldValues({}); }, 200);
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
      setQuickOrderOpen(false);
      queryClient.invalidateQueries({ queryKey: ["category-products"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["recent-orders"] });
      refreshProfile();
      toast.success("Order placed successfully!");
      navigate("/dashboard/orders");
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
  const CatIcon = getCategoryIcon(decodedCategory, "");
  const catColor = getCategoryIconColor(decodedCategory, "");
  const isImeiCheckCategory = decodedCategory === "IMEI Check";

  return (
    <PageContainer maxWidth="max-w-5xl">
      {/* ═══ BREADCRUMB + HEADER ═══ */}
      <div className="page-header-card mb-4 lg:mb-6">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-[11px] text-muted-foreground/60 mb-3">
          <button onClick={() => navigate("/dashboard")} className="hover:text-foreground transition-colors">Home</button>
          <span>/</span>
          <button onClick={() => navigate("/dashboard/place-order")} className="hover:text-foreground transition-colors">Place Order</button>
          <span>/</span>
          <span className="text-foreground font-semibold truncate max-w-[200px]">{decodedCategory}</span>
        </nav>

        <div className="flex items-center gap-3.5">
          <button
            onClick={() => navigate("/dashboard/place-order")}
            className="w-10 h-10 rounded-xl bg-secondary/60 border border-border/40 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-all duration-200 shrink-0"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center shrink-0", catColor)}>
            <CatIcon className="w-5 h-5" strokeWidth={1.8} />
          </div>
          <div className="min-w-0">
            <h1 className="gradient-text text-lg lg:text-xl truncate">{decodedCategory}</h1>
            {!isImeiCheckCategory && (
              <p className="page-header-subtitle">
                {products.length} {products.length === 1 ? "service" : "services"} available
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ═══ IMEI CHECK SPECIAL: iFree Interface ═══ */}
      {isImeiCheckCategory && (
        <div className="space-y-6 mb-6">
          <IFreeImeiCheck ref={imeiCheckRef} />
          <IFreeCheckHistory onCheckAgain={(imei, serviceId) => imeiCheckRef.current?.prefill(imei, serviceId)} />
        </div>
      )}

      {/* ═══ SEARCH WITHIN CATEGORY ═══ */}
      {!isImeiCheckCategory && (
        <>
          <div className="sticky top-0 z-20 -mx-3 px-3 py-2 lg:static lg:mx-0 lg:px-0 lg:py-0 mb-4"
            style={{ background: 'hsl(var(--background) / 0.9)', backdropFilter: 'blur(16px)' }}>
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/40 pointer-events-none transition-colors group-focus-within:text-primary/60" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={`Search in ${decodedCategory}...`}
                className={cn(
                  "w-full pl-12 pr-12 py-3 lg:py-3.5 rounded-2xl text-sm font-medium",
                  "bg-card border border-border/50 text-foreground placeholder:text-muted-foreground/40",
                  "focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40",
                  "transition-all duration-300",
                  "shadow-[0_2px_12px_rgba(0,0,0,0.04)]",
                )}
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 rounded-full text-muted-foreground/50 hover:text-foreground hover:bg-secondary/60 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

      {/* ═══ SERVICE LIST ═══ */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border/30 bg-card overflow-hidden animate-pulse">
              <div className="w-full aspect-[5/3] bg-muted/10" />
              <div className="px-3.5 py-3 space-y-2">
                <div className="h-4 bg-muted/30 rounded w-3/4" />
                <div className="flex justify-between">
                  <div className="h-4 bg-muted/20 rounded w-1/4" />
                  <div className="h-3 bg-muted/15 rounded w-1/5" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground/30">
          <Search className="w-10 h-10 mb-3" />
          <p className="text-sm font-medium">No services found</p>
          <p className="text-xs mt-1">{searchQuery ? "Try adjusting your search" : "This category is empty"}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredProducts.map((p: any, i: number) => (
            <ServiceCard
              key={p.id}
              product={p}
              index={i}
              isFavorite={favorites.includes(p.id)}
              onToggleFavorite={toggleFavorite}
              onSelect={handleSelectProduct}
            />
          ))}
        </div>
      )}

      {/* ═══ QUICK ORDER MODAL ═══ */}
      <Dialog open={quickOrderOpen && !!selectedProduct} onOpenChange={(open) => { if (!open) handleCloseModal(); }}>
        <DialogContent className="max-w-md sm:max-w-lg max-h-[90vh] overflow-y-auto">
          {selectedProduct && (
            <>
              <DialogHeader>
                <DialogTitle className="text-lg font-bold leading-tight pr-6">
                  {sanitizeName(selectedProduct.name)}
                </DialogTitle>
                <DialogDescription className="flex items-center gap-2 flex-wrap mt-1">
                  <span className="font-mono text-[10px] text-primary bg-primary/10 px-2 py-0.5 rounded-md font-bold">
                    #{selectedProduct.display_id}
                  </span>
                  <span className="text-[10px] text-muted-foreground">{selectedProduct.category}</span>
                  <DeliveryBadge isInstant={isInstant} deliveryTime={deliveryTime} noRefund={selectedProduct.description?.toLowerCase().includes("no refund")} />
                </DialogDescription>
              </DialogHeader>

              {/* Description */}
              <div className="max-h-[25vh] overflow-y-auto rounded-xl bg-secondary/20 border border-border/30 p-3">
                <ServiceDescription product={selectedProduct} />
              </div>

              {/* Custom Fields */}
              {activeFields.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-[11px] uppercase tracking-[0.12em] font-bold text-muted-foreground/50">Order Details</h3>
                  {activeFields.map((field: any) => (
                    <div key={field.id} className="space-y-1.5">
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        {field.field_name}{field.required && <span className="text-destructive ml-0.5">*</span>}
                      </label>
                      {field.field_type === "select" && Array.isArray(field.options) && field.options.length > 0 ? (
                        <select
                          value={customFieldValues[field.field_name] || ""}
                          onChange={(e) => setCustomFieldValues(prev => ({ ...prev, [field.field_name]: e.target.value }))}
                          className="w-full h-10 rounded-input bg-secondary/50 border border-border px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40"
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
                          className="bg-secondary/50 border-border font-mono text-sm"
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
              <div className="rounded-xl bg-secondary/20 border border-border/30 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Total Price</span>
                  <span className="text-xl font-extrabold font-mono tabular-nums text-foreground">
                    <Money amount={totalPrice} />
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Your Balance</span>
                  <span className={cn("text-xs font-bold font-mono tabular-nums", hasInsufficientBalance ? "text-destructive" : "text-success")}>
                    <Money amount={balance} />
                  </span>
                </div>
                {tierDiscount > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-success">Tier Discount ({tierDiscount}%)</span>
                    <span className="text-xs font-bold font-mono tabular-nums text-success">-<Money amount={discountAmount} /></span>
                  </div>
                )}
              </div>

              {hasInsufficientBalance && (
                <div className="flex items-center gap-2 text-xs bg-destructive/8 text-destructive px-3 py-2.5 rounded-xl border border-destructive/15">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>Need <Money amount={totalPrice - balance} className="inline font-bold" /> more.</span>
                  <button onClick={() => navigate("/dashboard/wallet")} className="text-primary font-semibold hover:underline ml-auto shrink-0">Top Up</button>
                </div>
              )}

              <Button
                onClick={handlePurchase}
                disabled={!selectedProduct || purchasing || hasInsufficientBalance}
                className={cn(
                  "w-full h-12 font-bold text-sm gap-2 rounded-btn",
                  "bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground",
                  "shadow-[0_0_20px_hsl(var(--primary)/0.25)] hover:shadow-[0_0_30px_hsl(var(--primary)/0.4)]",
                  "transition-all duration-300",
                  hasInsufficientBalance && "opacity-40 shadow-none"
                )}
              >
                {purchasing ? (
                  <><div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" /> Processing...</>
                ) : (
                  <><CheckCircle2 className="w-4 h-4" /> Place Order <ArrowRight className="w-4 h-4" /></>
                )}
              </Button>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ═══ SUCCESS MODAL ═══ */}
      {result && <SuccessModal result={result} onClose={() => setResult(null)} onNewOrder={() => { setResult(null); setSelectedProductId(""); setCustomFieldValues({}); }} navigate={navigate} />}
        </>
      )}
    </PageContainer>
  );
}

/* ═══ SERVICE CARD (Grid) ═══ */
function ServiceCard({ product: p, index, isFavorite, onToggleFavorite, onSelect }: {
  product: any; index: number; isFavorite: boolean;
  onToggleFavorite: (id: string, e?: React.MouseEvent) => void;
  onSelect: (id: string) => void;
}) {
  const [imgStatus, setImgStatus] = useState<"loading" | "loaded" | "error">(
    p.image_url ? "loading" : "error"
  );
  const pType = p.product_type;
  const isOutOfStock = pType === "digital" && p.stock === 0;
  const pTime = p.processing_time || (pType === "api" || pType === "digital" ? "Instant" : "1–24 Hours");
  let badgeLabel = "Manual"; let badgeClass = "bg-warning/10 text-warning border-warning/20"; let BadgeIcon = Clock;
  if (pType === "digital") { badgeLabel = "Instant"; badgeClass = "bg-success/10 text-success border-success/20"; BadgeIcon = Zap; }
  else if (pType === "api") { badgeLabel = "API"; badgeClass = "bg-ice/10 text-ice border-ice/20"; BadgeIcon = Link2; }

  const CategoryIcon = getCategoryIcon(p.category, p.name);
  const iconColor = getCategoryIconColor(p.category, p.name);

  return (
    <motion.button
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: Math.min(index * 0.04, 0.3) }}
      onClick={() => !isOutOfStock && onSelect(p.id)}
      disabled={isOutOfStock}
      className={cn(
        "w-full text-left rounded-xl border border-border/40 bg-card overflow-hidden group/card transition-all duration-200 relative",
        isOutOfStock
          ? "opacity-40 cursor-not-allowed"
          : "cursor-pointer hover:border-primary/30 hover:shadow-[0_4px_20px_hsl(var(--primary)/0.08)] active:scale-[0.98]"
      )}
    >
      {/* Image area — fixed aspect ratio */}
      <div className="relative w-full aspect-[5/3] overflow-hidden">
        {p.image_url && imgStatus !== "error" ? (
          <>
            {imgStatus === "loading" && (
              <div className="absolute inset-0 bg-muted/30 animate-pulse" />
            )}
            <img
              src={p.image_url}
              alt={sanitizeName(p.name)}
              className={cn(
                "w-full h-full object-cover transition-transform duration-300 group-hover/card:scale-105",
                imgStatus === "loaded" ? "opacity-100" : "opacity-0"
              )}
              loading="lazy"
              onLoad={() => setImgStatus("loaded")}
              onError={() => setImgStatus("error")}
            />
          </>
        ) : (
          /* Polished placeholder with category icon */
          <div className="w-full h-full flex flex-col items-center justify-center gap-2.5 bg-gradient-to-br from-primary/[0.06] to-primary/[0.02] dark:from-primary/[0.1] dark:to-primary/[0.04]">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: iconColor.replace('text-', '').includes('[') ? undefined : `hsl(var(--primary) / 0.1)` }}>
              <CategoryIcon className="w-7 h-7 text-primary/60" strokeWidth={1.5} />
            </div>
            <span className="text-[9px] font-semibold uppercase tracking-[0.15em] text-muted-foreground/40 px-4 text-center line-clamp-1">
              {p.category}
            </span>
          </div>
        )}

        {/* Favorite star */}
        {!isOutOfStock && (
          <button
            onClick={(e) => onToggleFavorite(p.id, e)}
            className={cn(
              "absolute top-2 right-2 p-1.5 rounded-full bg-black/30 backdrop-blur-sm transition-all duration-200 z-10",
              isFavorite ? "text-warning opacity-100" : "text-white/50 opacity-0 group-hover/card:opacity-100 hover:text-warning/80"
            )}
          >
            <Star className={cn("w-3.5 h-3.5", isFavorite && "fill-warning")} />
          </button>
        )}

        {/* Badge overlay */}
        <div className="absolute bottom-2 left-2 flex items-center gap-1.5">
          <span className={cn("inline-flex items-center gap-1 text-[10px] font-bold rounded-full px-2 py-0.5 border backdrop-blur-sm", badgeClass)}>
            <BadgeIcon className="w-2.5 h-2.5" />{badgeLabel}
          </span>
          {isOutOfStock && (
            <span className="text-[10px] font-bold text-destructive-foreground bg-destructive px-2 py-0.5 rounded-full">
              Out of Stock
            </span>
          )}
        </div>
      </div>

      {/* Card body */}
      <div className="px-3.5 py-3 space-y-2">
        <div className="flex items-start gap-1.5">
          <span className="shrink-0 font-mono text-[10px] font-bold text-primary/50 mt-0.5">#{p.display_id}</span>
          <p className="text-[13px] text-foreground font-semibold leading-snug line-clamp-2 group-hover/card:text-primary transition-colors duration-150">
            {sanitizeName(p.name)}
          </p>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm font-bold font-mono tabular-nums text-foreground">
            <Money amount={p.wholesale_price} compact />
          </span>
          <span className="text-[10px] text-muted-foreground/50 font-medium flex items-center gap-1">
            <Clock className="w-2.5 h-2.5" />{pTime}
          </span>
        </div>
      </div>
    </motion.button>
  );
}

/* ═══ DELIVERY BADGE ═══ */
function DeliveryBadge({ isInstant, deliveryTime, noRefund }: { isInstant: boolean; deliveryTime: string; noRefund?: boolean }) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <span className={cn("inline-flex items-center gap-1 text-[10px] font-bold rounded-full px-2 py-0.5 border",
        isInstant ? "bg-success/10 text-success border-success/20" : "bg-warning/10 text-warning border-warning/20"
      )}>
        {isInstant ? <Zap className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
        {isInstant ? "Instant" : "Manual"}
      </span>
      {deliveryTime && deliveryTime !== "Instant" && (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold rounded-full px-2 py-0.5 bg-ice/10 text-ice border border-ice/20">
          <Clock className="w-3 h-3" /> {deliveryTime}
        </span>
      )}
      {noRefund && (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold rounded-full px-2 py-0.5 bg-destructive/10 text-destructive border border-destructive/20">
          <ShieldAlert className="w-3 h-3" /> NO REFUND
        </span>
      )}
    </div>
  );
}

/* ═══ SERVICE DESCRIPTION ═══ */
function ServiceDescription({ product }: { product: any }) {
  const description = product.description || "";
  const allLines = description.split("\n").filter((l: string) => l.trim());
  const urlRegex = /https?:\/\/[^\s)>\]]+/gi;
  const downloadLines: string[] = []; const features: string[] = []; const warnings: string[] = []; const regularLines: string[] = [];
  for (const line of allLines) {
    const trimmed = line.trim(); const lower = trimmed.toLowerCase();
    if (lower.includes("[download]") || lower.includes("download tool") || lower.includes("download link")) {
      const urls = trimmed.match(urlRegex); if (urls) downloadLines.push(...urls);
    } else if (trimmed.startsWith("✅") || trimmed.startsWith("✓") || trimmed.startsWith("•") || trimmed.startsWith("-")) {
      features.push(trimmed.replace(/^[✅✓•\-]\s*/, ""));
    } else if (lower.includes("no refund") || lower.includes("important") || lower.includes("warning") || (trimmed === trimmed.toUpperCase() && trimmed.length > 5 && !trimmed.startsWith("#"))) {
      warnings.push(trimmed);
    } else { regularLines.push(trimmed); }
  }
  return (
    <div className="space-y-2.5">
      {regularLines.length > 0 && <div className="space-y-1">{regularLines.map((line, i) => line.startsWith("**") && line.endsWith("**") ? <p key={i} className="text-xs font-bold text-foreground">{line.replace(/\*\*/g, "")}</p> : <p key={i} className="text-xs text-muted-foreground leading-relaxed">{line}</p>)}</div>}
      {features.length > 0 && <div className="space-y-1">{features.map((feat, i) => <div key={i} className="flex items-start gap-2"><CheckCircle2 className="w-3 h-3 text-success shrink-0 mt-0.5" /><span className="text-xs text-foreground/90">{feat}</span></div>)}</div>}
      {warnings.length > 0 && <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-2.5 space-y-1"><div className="flex items-center gap-1.5 text-destructive font-bold text-[10px] uppercase tracking-wider"><ShieldAlert className="w-3 h-3" /> Important</div>{warnings.map((w, i) => <p key={i} className="text-[11px] text-destructive/80 font-medium">{w}</p>)}</div>}
      {downloadLines.length > 0 && <div className="space-y-1.5">{downloadLines.map((url, i) => <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 w-full py-2 rounded-lg bg-primary/8 border border-primary/15 text-primary font-semibold text-xs hover:bg-primary/15 transition-all duration-200"><Download className="w-3.5 h-3.5" /> Download Tool{downloadLines.length > 1 ? ` ${i + 1}` : ""}</a>)}</div>}
      {!description && <p className="text-xs text-muted-foreground/50 italic">No description available.</p>}
    </div>
  );
}

/* ═══ SUCCESS MODAL ═══ */
function SuccessModal({ result, onClose, onNewOrder, navigate }: {
  result: PurchaseResult;
  onClose: () => void; onNewOrder: () => void; navigate: (path: string) => void;
}) {
  return (
    <OrderSuccessCard
      result={result}
      showConfetti
      onViewOrders={() => navigate("/dashboard/orders")}
      onNewOrder={onNewOrder}
      onClose={onClose}
    />
  );
}
