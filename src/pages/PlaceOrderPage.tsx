import { useState, useMemo, useEffect, useCallback } from "react";
import { sanitizeName } from "@/lib/sanitize-name";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ShoppingCart, CheckCircle2, Clock, Zap, Copy, Eye, X,
  AlertTriangle, Search, Download, ShieldAlert, ArrowRight, ArrowLeft,
  Smartphone, Link2, Package, Star, ChevronDown, LayoutGrid, List,
} from "lucide-react";
import CategoryCardsOverview from "@/components/products/CategoryCardsOverview";
import { getCategoryIcon, getCategoryIconColor } from "@/lib/category-icons";
import ProductIcon from "@/components/products/ProductIcon";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Money } from "@/components/shared";
import { PageContainer } from "@/components/shared";
import Confetti from "@/components/Confetti";
import { motion, AnimatePresence } from "framer-motion";
import IFreeImeiCheck from "@/components/imei/IFreeImeiCheck";
import IFreeCheckHistory from "@/components/imei/IFreeCheckHistory";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";

interface PurchaseResult {
  order_id: string;
  credentials: string;
  product_name: string;
  price: number;
  quantity?: number;
}

/* ═══ FAVORITES STORAGE ═══ */
const FAVORITES_KEY = "kktech_favorite_services";
function getFavorites(): string[] {
  try { return JSON.parse(localStorage.getItem(FAVORITES_KEY) || "[]"); } catch { return []; }
}
function setFavorites(ids: string[]) {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(ids));
}

/* ═══ EXPANDED GROUPS STORAGE ═══ */
const EXPANDED_KEY = "kktech_expanded_groups";
function getExpandedGroups(): string[] {
  try { return JSON.parse(localStorage.getItem(EXPANDED_KEY) || "[]"); } catch { return []; }
}
function saveExpandedGroups(groups: string[]) {
  localStorage.setItem(EXPANDED_KEY, JSON.stringify(groups));
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
  const [favorites, setFavoritesState] = useState<string[]>(getFavorites);
  const [quickOrderOpen, setQuickOrderOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<string[]>(getExpandedGroups);
  const [viewMode, setViewMode] = useState<"categories" | "list">("categories");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const handleCategoryClick = useCallback((category: string) => {
    setSelectedCategory(category);
    setViewMode("list");
    setExpandedGroups([category]);
    saveExpandedGroups([category]);
    setSearchQuery("");
  }, []);

  const handleBackToCategories = useCallback(() => {
    setViewMode("categories");
    setSelectedCategory(null);
  }, []);

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

  const { data: products = [], isLoading: productsLoading } = useQuery({
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

  const { data: tierDiscount = 0 } = useQuery({
    queryKey: ["user-tier-discount", profile?.tier],
    queryFn: async () => {
      if (!profile?.tier) return 0;
      const { data } = await supabase.from("reseller_tiers").select("discount_percent").ilike("name", profile.tier).maybeSingle();
      return Number(data?.discount_percent) || 0;
    },
    enabled: !!profile?.tier,
  });

  // Derived
  const isApiProduct = (selectedProduct as any)?.product_type === "api";
  const defaultMode = selectedProduct
    ? (Array.isArray(selectedProduct.fulfillment_modes) ? String((selectedProduct.fulfillment_modes as any[])[0]) : "instant")
    : "instant";
  const activeFields = customFields.filter((f: any) => f.linked_mode === defaultMode);

  // Filter products by search
  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p: any) => {
      return p.name.toLowerCase().includes(q) ||
        String(p.display_id).includes(q) ||
        (p.brand && p.brand.toLowerCase().includes(q)) ||
        (p.category && p.category.toLowerCase().includes(q));
    });
  }, [products, searchQuery]);

  // Group products by category
  const groupedProducts = useMemo(() => {
    const groups = new Map<string, any[]>();
    filteredProducts.forEach((p: any) => {
      const cat = p.category || "Other";
      if (!groups.has(cat)) groups.set(cat, []);
      groups.get(cat)!.push(p);
    });
    // Sort groups by count descending
    return Array.from(groups.entries())
      .sort((a, b) => b[1].length - a[1].length)
      .map(([name, items]) => ({ name, items, count: items.length }));
  }, [filteredProducts]);

  // Favorites
  const favoriteProducts = useMemo(() => {
    return products.filter((p: any) => favorites.includes(p.id));
  }, [products, favorites]);

  const toggleFavorite = useCallback((id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setFavoritesState(prev => {
      const next = prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id];
      setFavorites(next);
      return next;
    });
  }, []);

  // Accordion toggle
  const toggleGroup = useCallback((groupName: string) => {
    setExpandedGroups(prev => {
      const next = prev.includes(groupName)
        ? prev.filter(g => g !== groupName)
        : [...prev, groupName];
      saveExpandedGroups(next);
      return next;
    });
  }, []);

  const expandAll = useCallback(() => {
    const all = groupedProducts.map(g => g.name);
    setExpandedGroups(all);
    saveExpandedGroups(all);
  }, [groupedProducts]);

  const collapseAll = useCallback(() => {
    setExpandedGroups([]);
    saveExpandedGroups([]);
  }, []);

  // When searching, auto-expand all matching groups
  useEffect(() => {
    if (searchQuery.trim()) {
      const allGroups = groupedProducts.map(g => g.name);
      setExpandedGroups(allGroups);
    }
  }, [searchQuery, groupedProducts]);

  // Pricing
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

  const handleSelectProduct = (id: string) => {
    setSelectedProductId(id);
    setCustomFieldValues({});
    setResult(null);
    setQuickOrderOpen(true);
  };

  const handleCloseModal = () => {
    setQuickOrderOpen(false);
    setTimeout(() => {
      setSelectedProductId("");
      setCustomFieldValues({});
    }, 200);
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
      setQuickOrderOpen(false);
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
    <PageContainer maxWidth="max-w-5xl">
      {/* ═══ HEADER ═══ */}
      <div className="page-header-card mb-4 lg:mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="page-header-icon hidden lg:flex">
              <ShoppingCart className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="gradient-text text-lg lg:text-xl">Place Order</h1>
              <p className="page-header-subtitle hidden sm:block">Browse service groups and place orders</p>
            </div>
          </div>
          <div className="flex gap-1 p-1 rounded-[var(--radius-btn)] bg-secondary/50 border border-border">
            <button
              onClick={() => setActiveTab("services")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-[calc(var(--radius-btn)-2px)] text-[11px] font-bold transition-all duration-200",
                activeTab === "services"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <ShoppingCart className="w-3 h-3" /> Services
            </button>
            <button
              onClick={() => setActiveTab("ifree")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-[calc(var(--radius-btn)-2px)] text-[11px] font-bold transition-all duration-200",
                activeTab === "ifree"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Smartphone className="w-3 h-3" /> IMEI
            </button>
          </div>
        </div>
      </div>

      {activeTab === "ifree" ? (
        <div className="space-y-6">
          <IFreeImeiCheck />
          <IFreeCheckHistory />
        </div>
      ) : (
        <div className="space-y-5">
          {/* ═══ STICKY SEARCH BAR ═══ */}
          <div className="sticky top-0 z-20 -mx-3 px-3 py-2 lg:static lg:mx-0 lg:px-0 lg:py-0"
            style={{ background: 'hsl(var(--background) / 0.9)', backdropFilter: 'blur(16px)' }}>
            <div className="flex gap-2">
              <div className="relative group flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/40 pointer-events-none transition-colors group-focus-within:text-primary/60" />
                <input
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    if (e.target.value.trim()) setViewMode("list");
                  }}
                  placeholder="Search IMEI service, iPhone unlock, Samsung FRP..."
                  className={cn(
                    "w-full pl-12 pr-12 py-3.5 lg:py-4 rounded-2xl text-sm font-medium",
                    "bg-card border border-border/50 text-foreground placeholder:text-muted-foreground/40",
                    "focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40",
                    "transition-all duration-300",
                    "shadow-[0_2px_12px_rgba(0,0,0,0.04)]",
                  )}
                />
                {searchQuery && (
                  <button onClick={() => { setSearchQuery(""); if (!selectedCategory) setViewMode("categories"); }} className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 rounded-full text-muted-foreground/50 hover:text-foreground hover:bg-secondary/60 transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              {/* View mode toggle */}
              <div className="flex items-center gap-0.5 p-1 rounded-xl bg-secondary/50 border border-border/40 shrink-0">
                <button
                  onClick={handleBackToCategories}
                  className={cn(
                    "p-2.5 rounded-lg transition-all duration-200",
                    viewMode === "categories" && !searchQuery ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  )}
                  title="Category cards"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={cn(
                    "p-2.5 rounded-lg transition-all duration-200",
                    viewMode === "list" || searchQuery ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  )}
                  title="List view"
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* ═══ CATEGORY CARDS VIEW ═══ */}
          {viewMode === "categories" && !searchQuery && (
            <div className="space-y-4">
              {favoriteProducts.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                  <div className="flex items-center gap-2 px-1">
                    <Star className="w-4 h-4 text-warning fill-warning" />
                    <h2 className="text-sm font-bold text-foreground">Favorite Services</h2>
                    <span className="text-[10px] font-mono text-muted-foreground/40">{favoriteProducts.length}</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {favoriteProducts.map((p: any) => (
                      <FavoriteCard key={p.id} product={p} isFavorite onToggleFavorite={toggleFavorite} onSelect={handleSelectProduct} />
                    ))}
                  </div>
                </motion.div>
              )}

              <div className="flex items-center gap-2 px-1">
                <div className="w-1 h-5 rounded-full bg-gradient-to-b from-primary to-accent" />
                <h2 className="text-sm font-bold text-foreground">Browse Categories</h2>
                <span className="text-[10px] font-mono text-muted-foreground/40">{products.length} services</span>
              </div>
              <CategoryCardsOverview onCategoryClick={handleCategoryClick} />
            </div>
          )}

          {/* ═══ LIST VIEW (SERVICE GROUPS) ═══ */}
          {(viewMode === "list" || !!searchQuery) && (
            <>
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  {selectedCategory && !searchQuery && (
                    <button onClick={handleBackToCategories} className="p-1.5 rounded-lg bg-secondary/50 border border-border/30 text-muted-foreground hover:text-foreground transition-colors mr-1">
                      <ArrowLeft className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <Package className="w-4 h-4 text-muted-foreground/50" />
                  <h2 className="text-sm font-bold text-foreground">
                    {searchQuery ? "Search Results" : selectedCategory || "All Services"}
                  </h2>
                  <span className="text-[10px] font-mono text-muted-foreground/40">
                    {filteredProducts.length} services · {groupedProducts.length} groups
                  </span>
                </div>
                {groupedProducts.length > 1 && (
                  <div className="flex gap-1">
                    <button onClick={expandAll} className="text-[10px] font-semibold text-primary hover:text-primary/80 px-2 py-1 rounded-md hover:bg-primary/5 transition-colors">
                      Expand all
                    </button>
                    <button onClick={collapseAll} className="text-[10px] font-semibold text-muted-foreground hover:text-foreground px-2 py-1 rounded-md hover:bg-secondary/40 transition-colors">
                      Collapse all
                    </button>
                  </div>
                )}
              </div>

          {/* ═══ ACCORDION GROUPS ═══ */}
          {productsLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="rounded-[var(--radius-card)] border border-border/30 bg-card animate-pulse">
                  <div className="flex items-center gap-3 p-4">
                    <div className="w-8 h-8 rounded-lg bg-muted/30" />
                    <div className="flex-1 h-4 bg-muted/30 rounded w-1/3" />
                    <div className="w-10 h-5 bg-muted/20 rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : groupedProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground/30">
              <Search className="w-8 h-8 mb-3" />
              <p className="text-sm font-medium">No services found</p>
              <p className="text-xs mt-1">Try adjusting your search</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {groupedProducts.map((group, gi) => {
                const isOpen = expandedGroups.includes(group.name);
                const CatIcon = getCategoryIcon(group.name, "");
                const catColor = getCategoryIconColor(group.name, "");

                return (
                  <motion.div
                    key={group.name}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: Math.min(gi * 0.03, 0.2) }}
                    className={cn(
                      "rounded-[var(--radius-card)] border overflow-hidden transition-all duration-200",
                      isOpen
                        ? "border-primary/20 bg-card shadow-[0_4px_24px_-8px_hsl(var(--primary)/0.08)]"
                        : "border-border/40 bg-card hover:border-border/60"
                    )}
                    style={{ boxShadow: isOpen ? undefined : "var(--shadow-card)" }}
                  >
                    {/* Group Header */}
                    <button
                      onClick={() => toggleGroup(group.name)}
                      className={cn(
                        "w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors duration-200",
                        "hover:bg-secondary/20 active:bg-secondary/30",
                        isOpen && "border-b border-border/30"
                      )}
                    >
                      <div className={cn(
                        "shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-transform duration-200",
                        catColor,
                        isOpen && "scale-105"
                      )}>
                        <CatIcon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-[13px] font-bold text-foreground uppercase tracking-wide truncate">
                          {group.name}
                        </h3>
                      </div>
                      <span className={cn(
                        "text-[10px] font-bold font-mono tabular-nums px-2.5 py-1 rounded-full border transition-colors",
                        isOpen
                          ? "bg-primary/10 text-primary border-primary/20"
                          : "bg-secondary/60 text-muted-foreground border-border/30"
                      )}>
                        {group.count}
                      </span>
                      <ChevronDown
                        className={cn(
                          "w-4 h-4 text-muted-foreground/50 transition-transform duration-200 ease-out shrink-0",
                          isOpen && "rotate-180 text-primary/60"
                        )}
                      />
                    </button>

                    {/* Group Content */}
                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2, ease: "easeOut" }}
                          className="overflow-hidden"
                        >
                          <div className="divide-y divide-border/20">
                            {group.items.map((p: any, i: number) => (
                              <ServiceRow
                                key={p.id}
                                product={p}
                                index={i}
                                isFavorite={favorites.includes(p.id)}
                                onToggleFavorite={toggleFavorite}
                                onSelect={handleSelectProduct}
                              />
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>
          )}
            </>
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
                  <DeliveryBadge product={selectedProduct} isInstant={isInstant} deliveryTime={deliveryTime} />
                </DialogDescription>
              </DialogHeader>

              {/* Description */}
              <div className="max-h-[25vh] overflow-y-auto stool-scrollbar rounded-xl bg-secondary/20 border border-border/30 p-3">
                <ServiceDescription product={selectedProduct} />
              </div>

              {/* Custom Fields */}
              {activeFields.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-[11px] uppercase tracking-[0.12em] font-bold text-muted-foreground/50">
                    Order Details
                  </h3>
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
                  "w-full h-12 font-bold text-sm gap-2 rounded-[var(--radius-btn)]",
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
      {result && <SuccessModal result={result} credentialsList={credentialsList} onCopy={copyCredentials} onClose={() => setResult(null)} onNewOrder={() => { setResult(null); setSelectedProductId(""); setCustomFieldValues({}); }} navigate={navigate} />}

      {/* ═══ FAB — Quick Order (Mobile) ═══ */}
      {activeTab === "services" && !quickOrderOpen && !result && (
        <button
          onClick={() => {
            if (products.length > 0) {
              handleSelectProduct(products[0].id);
            }
          }}
          className="fab-quick-order lg:hidden"
        >
          <Zap className="w-4 h-4" />
          Quick Order
        </button>
      )}
    </PageContainer>
  );
}

/* ═══ SERVICE ROW (inside accordion group) ═══ */
function ServiceRow({ product: p, index, isFavorite, onToggleFavorite, onSelect }: {
  product: any; index: number; isFavorite: boolean;
  onToggleFavorite: (id: string, e?: React.MouseEvent) => void;
  onSelect: (id: string) => void;
}) {
  const pType = p.product_type;
  const isOutOfStock = pType === "digital" && p.stock === 0;
  const pTime = p.processing_time || (pType === "api" || pType === "digital" ? "Instant" : "1–24 Hours");
  const CatIcon = getCategoryIcon(p.category, p.name);
  const catColor = getCategoryIconColor(p.category, p.name);

  let badgeLabel = "Manual";
  let badgeClass = "bg-warning/10 text-warning border-warning/20";
  let BadgeIcon = Clock;
  if (pType === "digital") {
    badgeLabel = "Instant";
    badgeClass = "bg-success/10 text-success border-success/20";
    BadgeIcon = Zap;
  } else if (pType === "api") {
    badgeLabel = "API";
    badgeClass = "bg-ice/10 text-ice border-ice/20";
    BadgeIcon = Link2;
  }

  return (
    <button
      onClick={() => !isOutOfStock && onSelect(p.id)}
      disabled={isOutOfStock}
      className={cn(
        "w-full text-left px-4 py-3 transition-colors duration-150 group/row relative",
        isOutOfStock
          ? "opacity-30 cursor-not-allowed"
          : "cursor-pointer hover:bg-secondary/15 active:bg-secondary/25"
      )}
    >
      <div className="flex items-center gap-3">
        <ProductIcon
          imageUrl={p.image_url}
          name={p.name}
          category={p.category}
          size="sm"
          className="transition-transform duration-200 group-hover/row:scale-105"
        />

        {/* Info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="shrink-0 font-mono text-[10px] font-bold text-primary/60">#{p.display_id}</span>
            <p className="text-[13px] text-foreground font-semibold leading-snug truncate group-hover/row:text-primary transition-colors duration-150">
              {sanitizeName(p.name)}
            </p>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className={cn("inline-flex items-center gap-1 text-[10px] font-bold rounded-full px-2 py-0.5 border", badgeClass)}>
              <BadgeIcon className="w-2.5 h-2.5" />
              {badgeLabel}
            </span>
            <span className="text-[10px] text-muted-foreground/50 font-medium flex items-center gap-1">
              <Clock className="w-2.5 h-2.5" />
              {pTime}
            </span>
            {isOutOfStock && <span className="text-[10px] font-bold text-destructive">Out of Stock</span>}
          </div>
        </div>

        {/* Right: Price + Order */}
        <div className="shrink-0 flex items-center gap-2.5">
          <span className="text-sm font-bold font-mono tabular-nums text-foreground">
            <Money amount={p.wholesale_price} compact />
          </span>
          {!isOutOfStock && (
            <span className={cn(
              "inline-flex items-center gap-1 text-[10px] font-bold text-primary-foreground px-3 py-1.5 rounded-full",
              "bg-gradient-to-r from-primary to-primary/80",
              "shadow-[0_2px_8px_hsl(var(--primary)/0.1)]",
              "group-hover/row:shadow-[0_4px_16px_hsl(var(--primary)/0.2)] group-hover/row:scale-105 transition-all duration-200"
            )}>
              Order <ArrowRight className="w-3 h-3 transition-transform duration-200 group-hover/row:translate-x-0.5" />
            </span>
          )}
        </div>
      </div>

      {/* Favorite star */}
      {!isOutOfStock && (
        <button
          onClick={(e) => onToggleFavorite(p.id, e)}
          className={cn(
            "absolute top-2 right-2 p-1 rounded-full transition-all duration-200 z-10",
            isFavorite
              ? "text-warning opacity-100"
              : "text-muted-foreground/20 opacity-0 group-hover/row:opacity-100 hover:text-warning/60"
          )}
        >
          <Star className={cn("w-3.5 h-3.5", isFavorite && "fill-warning")} />
        </button>
      )}
    </button>
  );
}

/* ═══ FAVORITE CARD (compact) ═══ */
function FavoriteCard({ product: p, isFavorite, onToggleFavorite, onSelect }: {
  product: any; isFavorite: boolean;
  onToggleFavorite: (id: string, e?: React.MouseEvent) => void;
  onSelect: (id: string) => void;
}) {
  const CatIcon = getCategoryIcon(p.category, p.name);
  const catColor = getCategoryIconColor(p.category, p.name);

  return (
    <button
      onClick={() => onSelect(p.id)}
      className={cn(
        "w-full text-left rounded-xl border border-warning/20 bg-warning/[0.03] p-3 group/fav",
        "hover:border-warning/40 hover:bg-warning/[0.06] transition-all duration-200 relative"
      )}
    >
      <div className="flex items-center gap-2.5">
        <ProductIcon
          imageUrl={p.image_url}
          name={p.name}
          category={p.category}
          size="sm"
        />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-foreground truncate">{sanitizeName(p.name)}</p>
          <p className="text-[10px] font-mono text-muted-foreground/50 mt-0.5">
            <Money amount={p.wholesale_price} compact />
          </p>
        </div>
      </div>
      <button
        onClick={(e) => onToggleFavorite(p.id, e)}
        className="absolute top-2 right-2 p-0.5 text-warning opacity-60 hover:opacity-100 transition-opacity"
      >
        <Star className="w-3 h-3 fill-warning" />
      </button>
    </button>
  );
}

/* ═══ DELIVERY BADGE ═══ */
function DeliveryBadge({ product, isInstant, deliveryTime }: { product: any; isInstant: boolean; deliveryTime: string }) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <span className={cn(
        "inline-flex items-center gap-1 text-[10px] font-bold rounded-full px-2 py-0.5 border",
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
      {product.description?.toLowerCase().includes("no refund") && (
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
    <div className="space-y-2.5">
      {regularLines.length > 0 && (
        <div className="space-y-1">
          {regularLines.map((line, i) => {
            if (line.startsWith("**") && line.endsWith("**"))
              return <p key={i} className="text-xs font-bold text-foreground">{line.replace(/\*\*/g, "")}</p>;
            return <p key={i} className="text-xs text-muted-foreground leading-relaxed">{line}</p>;
          })}
        </div>
      )}
      {features.length > 0 && (
        <div className="space-y-1">
          {features.map((feat, i) => (
            <div key={i} className="flex items-start gap-2">
              <CheckCircle2 className="w-3 h-3 text-success shrink-0 mt-0.5" />
              <span className="text-xs text-foreground/90">{feat}</span>
            </div>
          ))}
        </div>
      )}
      {warnings.length > 0 && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-2.5 space-y-1">
          <div className="flex items-center gap-1.5 text-destructive font-bold text-[10px] uppercase tracking-wider">
            <ShieldAlert className="w-3 h-3" /> Important
          </div>
          {warnings.map((warn, i) => (
            <p key={i} className="text-[11px] text-destructive/80 font-medium">{warn}</p>
          ))}
        </div>
      )}
      {downloadLines.length > 0 && (
        <div className="space-y-1.5">
          {downloadLines.map((url, i) => (
            <a key={i} href={url} target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-2 rounded-lg bg-primary/8 border border-primary/15 text-primary font-semibold text-xs hover:bg-primary/15 transition-all duration-200">
              <Download className="w-3.5 h-3.5" /> Download Tool{downloadLines.length > 1 ? ` ${i + 1}` : ""}
            </a>
          ))}
        </div>
      )}
      {!description && <p className="text-xs text-muted-foreground/50 italic">No description available.</p>}
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
        <div className="space-y-2 bg-secondary/30 rounded-[var(--radius-card)] p-4">
          <DetailRow label="Product" value={sanitizeName(result.product_name)} />
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
