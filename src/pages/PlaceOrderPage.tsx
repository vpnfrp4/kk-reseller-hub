import { useState, useMemo, useCallback, useRef } from "react";
import { sanitizeName } from "@/lib/sanitize-name";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Search, X, Star, ChevronRight, Clock, Zap, Link2,
  CheckCircle2, ArrowRight, Download, ShieldAlert,
} from "lucide-react";
import { getCategoryIcon, getCategoryIconColor } from "@/lib/category-icons";
import ProductIcon from "@/components/products/ProductIcon";
import { cn } from "@/lib/utils";
import { Money, PageContainer } from "@/components/shared";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import IFreeImeiCheck, { type IFreeImeiCheckHandle } from "@/components/imei/IFreeImeiCheck";
import IFreeCheckHistory from "@/components/imei/IFreeCheckHistory";

/* ═══ FAVORITES STORAGE ═══ */
const FAVORITES_KEY = "kktech_favorite_services";
function getFavorites(): string[] {
  try { return JSON.parse(localStorage.getItem(FAVORITES_KEY) || "[]"); } catch { return []; }
}
function setFavoritesStorage(ids: string[]) {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(ids));
}

export default function PlaceOrderPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, profile, refreshProfile } = useAuth();
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [favorites, setFavoritesState] = useState<string[]>(getFavorites);

  // Order modal state
  const [selectedProductId, setSelectedProductId] = useState("");
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, string>>({});
  const [purchasing, setPurchasing] = useState(false);
  const [quickOrderOpen, setQuickOrderOpen] = useState(false);
  const imeiCheckRef = useRef<IFreeImeiCheckHandle>(null);

  const { data: products = [], isLoading } = useQuery({
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

  // Derive categories from products
  const categories = useMemo(() => {
    const catMap = new Map<string, number>();
    products.forEach((p: any) => {
      const cat = p.category || "Other";
      catMap.set(cat, (catMap.get(cat) || 0) + 1);
    });
    return Array.from(catMap.entries()).map(([name, count]) => ({ name, count }));
  }, [products]);

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
  const deliveryTimeConfig: Record<string, string> = selectedProduct?.delivery_time_config && typeof selectedProduct.delivery_time_config === "object"
    ? selectedProduct.delivery_time_config as Record<string, string> : {};
  const deliveryTime = deliveryTimeConfig[defaultMode] || selectedProduct?.processing_time || "Instant";
  const isInstant = defaultMode === "instant" || deliveryTime.toLowerCase().includes("instant");

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

  // Filtered products
  const filteredProducts = useMemo(() => {
    let list = products;
    if (activeCategory !== "all") {
      list = list.filter((p: any) => (p.category || "Other") === activeCategory);
    }
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter((p: any) =>
        p.name.toLowerCase().includes(q) ||
        String(p.display_id).includes(q) ||
        (p.brand && p.brand.toLowerCase().includes(q)) ||
        (p.category && p.category.toLowerCase().includes(q))
      );
    }
    return list;
  }, [products, activeCategory, searchQuery]);

  const favoriteProducts = useMemo(() => {
    return products.filter((p: any) => favorites.includes(p.id));
  }, [products, favorites]);

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
      queryClient.invalidateQueries({ queryKey: ["products-for-order"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["recent-orders"] });
      refreshProfile();
      toast.success("Order placed successfully!");
      navigate("/dashboard/orders?new=1");
    } catch (err: any) {
      toast.error(err.message || "Purchase failed");
    } finally {
      setPurchasing(false);
    }
  };

  const isImeiCheckMode = activeCategory === "IMEI Check";

  return (
    <PageContainer maxWidth="max-w-5xl">
      <div className="space-y-4">

        {/* ═══ SEARCH BAR ═══ */}
        <div className="sticky top-0 z-20 -mx-1 px-1 py-2 lg:static lg:mx-0 lg:px-0 lg:py-0 bg-background">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/30 pointer-events-none transition-colors group-focus-within:text-primary/60" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search all services..."
              className={cn(
                "w-full pl-12 pr-12 py-3.5 rounded-2xl text-sm",
                "bg-secondary border-0 text-foreground placeholder:text-muted-foreground/40",
                "focus:outline-none focus:ring-2 focus:ring-primary/15",
                "transition-all duration-200",
              )}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-full text-muted-foreground/40 hover:text-foreground transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* ═══ CATEGORY TABS — horizontal scroll ═══ */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1">
          <button
            onClick={() => setActiveCategory("all")}
            className={cn(
              "shrink-0 px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-200 border",
              activeCategory === "all"
                ? "bg-primary text-primary-foreground border-primary shadow-glow-sm"
                : "bg-card text-muted-foreground border-border/30 hover:border-primary/30 hover:text-foreground"
            )}
          >
            All ({products.length})
          </button>
          {categories.map(cat => (
            <button
              key={cat.name}
              onClick={() => setActiveCategory(cat.name)}
              className={cn(
                "shrink-0 px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-200 border whitespace-nowrap",
                activeCategory === cat.name
                  ? "bg-primary text-primary-foreground border-primary shadow-glow-sm"
                  : "bg-card text-muted-foreground border-border/30 hover:border-primary/30 hover:text-foreground"
              )}
            >
              {cat.name} ({cat.count})
            </button>
          ))}
        </div>

        {/* ═══ FAVORITES ROW ═══ */}
        {activeCategory === "all" && !searchQuery && favoriteProducts.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 px-1">
              <Star className="w-3.5 h-3.5 text-warning fill-warning" />
              <h2 className="text-[13px] font-semibold text-foreground">Favorites</h2>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
              {favoriteProducts.map((p: any) => (
                <button
                  key={p.id}
                  onClick={() => handleSelectProduct(p.id)}
                  className="shrink-0 w-[140px] text-left rounded-xl border border-border/20 bg-card p-3 hover:border-primary/30 transition-all duration-150 active:scale-[0.98] group"
                >
                  <ProductIcon imageUrl={p.image_url} name={p.name} category={p.category} size="sm" />
                  <p className="text-[11px] font-medium text-foreground mt-2 line-clamp-2 leading-tight group-hover:text-primary transition-colors">
                    {sanitizeName(p.name)}
                  </p>
                  <p className="text-[10px] font-semibold text-primary mt-1 font-mono">
                    <Money amount={p.wholesale_price} compact />
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ═══ IMEI CHECK SPECIAL ═══ */}
        {isImeiCheckMode && (
          <div className="space-y-6">
            <IFreeImeiCheck ref={imeiCheckRef} />
            <IFreeCheckHistory onCheckAgain={(imei, serviceId) => imeiCheckRef.current?.prefill(imei, serviceId)} />
          </div>
        )}

        {/* ═══ PRODUCT GRID ═══ */}
        {!isImeiCheckMode && (
          <>
            <div className="flex items-center justify-between px-1">
              <p className="text-xs text-muted-foreground">
                {filteredProducts.length} {filteredProducts.length === 1 ? "service" : "services"}
                {searchQuery && <> for "<span className="text-foreground font-medium">{searchQuery}</span>"</>}
              </p>
            </div>

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
                <p className="text-xs mt-1">Try adjusting your search or category</p>
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
          </>
        )}
      </div>

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
                          value={customFieldValues[field.field_name] || ""}
                          onChange={(e) => setCustomFieldValues(prev => ({ ...prev, [field.field_name]: e.target.value }))}
                          placeholder={field.placeholder || field.field_name}
                          type={field.field_type === "quantity" ? "number" : field.field_type === "url" ? "url" : "text"}
                          min={field.min_length || undefined}
                          max={field.max_length || undefined}
                          className="rounded-input bg-secondary/50 border-border"
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Price Summary */}
              <div className="rounded-xl border border-border/30 bg-secondary/15 p-4 space-y-2.5">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Price</span>
                  <span className="font-semibold font-mono tabular-nums">
                    <Money amount={baseTotal} />
                  </span>
                </div>
                {tierDiscount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-success font-medium">Tier Discount ({tierDiscount}%)</span>
                    <span className="text-success font-semibold font-mono">-<Money amount={discountAmount} /></span>
                  </div>
                )}
                <div className="border-t border-border/20 pt-2.5 flex justify-between text-sm">
                  <span className="font-bold text-foreground">Total</span>
                  <span className="font-extrabold font-mono text-base tabular-nums text-foreground">
                    <Money amount={totalPrice} />
                  </span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-muted-foreground/50">Your Balance</span>
                  <span className={cn("font-semibold font-mono tabular-nums", hasInsufficientBalance ? "text-destructive" : "text-foreground/60")}>
                    <Money amount={balance} />
                  </span>
                </div>
              </div>

              {/* Purchase button */}
              <Button
                onClick={handlePurchase}
                disabled={purchasing || hasInsufficientBalance || (isApiProduct && apiQuantity < 1)}
                className="w-full h-12 rounded-xl text-sm font-bold gap-2"
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
    </PageContainer>
  );
}

/* ═══ SERVICE CARD ═══ */
function ServiceCard({ product: p, index, isFavorite, onToggleFavorite, onSelect }: {
  product: any; index: number; isFavorite: boolean;
  onToggleFavorite: (id: string, e?: React.MouseEvent) => void;
  onSelect: (id: string) => void;
}) {
  const [imgStatus, setImgStatus] = useState<"loading" | "loaded" | "error">(
    p.image_url ? "loading" : "error"
  );

  // Reset status when image_url changes
  React.useEffect(() => {
    setImgStatus(p.image_url ? "loading" : "error");
  }, [p.image_url]);
  const pType = p.product_type;
  const isOutOfStock = pType === "digital" && p.stock === 0;
  const pTime = p.processing_time || (pType === "api" || pType === "digital" ? "Instant" : "1–24 Hours");
  let badgeLabel = "Manual"; let badgeClass = "bg-warning/8 text-warning border-warning/15"; let BadgeIcon = Clock;
  if (pType === "digital") { badgeLabel = "Instant"; badgeClass = "bg-success/8 text-success border-success/15"; BadgeIcon = Zap; }
  else if (pType === "api") { badgeLabel = "API"; badgeClass = "bg-ice/8 text-ice border-ice/15"; BadgeIcon = Link2; }

  const CategoryIcon = getCategoryIcon(p.category, p.name);

  return (
    <motion.button
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: Math.min(index * 0.03, 0.25) }}
      onClick={() => !isOutOfStock && onSelect(p.id)}
      disabled={isOutOfStock}
      className={cn(
        "w-full text-left rounded-2xl border border-border/30 bg-card overflow-hidden group/card transition-all duration-200 relative",
        isOutOfStock
          ? "opacity-35 cursor-not-allowed"
          : "cursor-pointer hover:border-primary/20 active:scale-[0.99]"
      )}
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      {/* Image area */}
      <div className="relative w-full aspect-[5/3] overflow-hidden bg-secondary/15">
        {p.image_url && imgStatus !== "error" ? (
          <>
            {imgStatus === "loading" && (
              <div className="absolute inset-0 bg-muted/15 animate-pulse" />
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
          <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-secondary/10">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-primary/8">
              <CategoryIcon className="w-6 h-6 text-primary/40" strokeWidth={1.5} />
            </div>
            <span className="text-[9px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/25 px-4 text-center line-clamp-1">
              {p.category}
            </span>
          </div>
        )}

        {/* Favorite star */}
        {!isOutOfStock && (
          <button
            onClick={(e) => onToggleFavorite(p.id, e)}
            className={cn(
              "absolute top-2.5 right-2.5 p-1.5 rounded-lg bg-black/20 backdrop-blur-sm transition-all duration-200 z-10",
              isFavorite ? "text-warning opacity-100" : "text-white/40 opacity-0 group-hover/card:opacity-100 hover:text-warning/80"
            )}
          >
            <Star className={cn("w-3.5 h-3.5", isFavorite && "fill-warning")} />
          </button>
        )}

        {/* Badge overlay */}
        <div className="absolute bottom-2.5 left-2.5 flex items-center gap-1.5">
          <span className={cn("inline-flex items-center gap-1 text-[9px] font-bold rounded-md px-2 py-[3px] border backdrop-blur-sm", badgeClass)}>
            <BadgeIcon className="w-2.5 h-2.5" />{badgeLabel}
          </span>
          {isOutOfStock && (
            <span className="text-[9px] font-bold text-destructive-foreground bg-destructive px-2 py-[3px] rounded-md">
              Out of Stock
            </span>
          )}
        </div>
      </div>

      {/* Card body */}
      <div className="px-3.5 py-3 space-y-2">
        <div className="flex items-start gap-1.5">
          <span className="shrink-0 font-mono text-[9px] font-bold text-primary/40 mt-0.5">#{p.display_id}</span>
          <p className="text-[13px] text-foreground font-semibold leading-snug line-clamp-2 group-hover/card:text-primary transition-colors duration-150">
            {sanitizeName(p.name)}
          </p>
        </div>

        <div className="flex items-center justify-between pt-0.5">
          <span className="text-sm font-bold font-mono tabular-nums text-foreground">
            <Money amount={p.wholesale_price} compact />
          </span>
          <span className="text-[10px] text-muted-foreground/40 font-medium flex items-center gap-1">
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
