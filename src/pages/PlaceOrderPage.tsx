import { useState, useMemo, useEffect } from "react";
import { sanitizeName } from "@/lib/sanitize-name";
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
  ArrowLeft,
  Smartphone,
  Globe,
  Monitor,
  Link2,
  Package,
  ChevronRight,
  ArrowRight,
} from "lucide-react";
import { getCategoryIcon, getCategoryIconColor } from "@/lib/category-icons";
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

/* ═══ CATEGORY CONFIG ═══ */
// Now using shared getCategoryIcon from @/lib/category-icons

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

  const categories = useMemo(() => {
    const cats = new Map<string, { count: number; minPrice: number }>();
    products.forEach((p: any) => {
      const cat = p.category || "Other";
      const existing = cats.get(cat);
      if (existing) {
        existing.count++;
        existing.minPrice = Math.min(existing.minPrice, p.wholesale_price || 0);
      } else {
        cats.set(cat, { count: 1, minPrice: p.wholesale_price || 0 });
      }
    });
    return Array.from(cats.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .map(([name, info]) => ({ name, ...info }));
  }, [products]);

  const allCategories = useMemo(() => {
    return [{ name: "All", count: products.length }, ...categories.map(c => ({ name: c.name, count: c.count }))];
  }, [categories, products.length]);

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
  };

  const handleBack = () => {
    setSelectedProductId("");
    setCustomFieldValues({});
    setResult(null);
  };

  const handleCategoryClick = (catName: string) => {
    setActiveCategory(catName);
    setSearchQuery("");
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

  // Quick stats
  const instantCount = useMemo(() => products.filter((p: any) => p.product_type === "digital").length, [products]);
  const apiCount = useMemo(() => products.filter((p: any) => p.product_type === "api").length, [products]);

  return (
    <PageContainer maxWidth="max-w-5xl">
      <div className="page-header-card mb-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="page-header-icon">
              <ShoppingCart className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="gradient-text">Place Order</h1>
              <p className="page-header-subtitle">Search and order services quickly</p>
            </div>
          </div>

          {/* Tab Switcher */}
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
      <AnimatePresence mode="wait">
        {!selectedProduct ? (
          <motion.div
            key="marketplace"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="space-y-5"
          >
            {/* ═══ QUICK STATS — dashboard-style stat cards ═══ */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Available Services", value: products.length, icon: Package, color: "text-primary", bg: "bg-primary/10", borderColor: "border-primary/10" },
                { label: "Instant Services", value: instantCount, icon: Zap, color: "text-success", bg: "bg-success/10", borderColor: "border-success/10" },
                { label: "API Services", value: apiCount, icon: Link2, color: "text-ice", bg: "bg-ice/10", borderColor: "border-ice/10" },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className={cn(
                    "rounded-[var(--radius-card)] border bg-card p-3.5 sm:p-4 transition-all duration-200",
                    stat.borderColor
                  )}
                  style={{ boxShadow: "var(--shadow-card)" }}
                >
                  <div className="flex items-center gap-2.5">
                    <div className={cn("w-8 h-8 rounded-[var(--radius-btn)] flex items-center justify-center shrink-0", stat.bg)}>
                      <stat.icon className={cn("w-4 h-4", stat.color)} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-lg sm:text-xl font-extrabold font-mono tabular-nums text-foreground leading-none">{stat.value}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{stat.label}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* ═══ SEARCH + FILTERS + LIST — unified glass card ═══ */}
            <div className="rounded-[var(--radius-card)] border border-border bg-card overflow-hidden" style={{ boxShadow: "var(--shadow-card)" }}>
              {/* Search Bar */}
              <div className="px-4 sm:px-5 py-3.5 border-b border-border">
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40 pointer-events-none" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by service name or #ID..."
                    className="pl-10 pr-9 h-10 bg-secondary/30 border-border text-sm rounded-[var(--radius-input)] placeholder:text-muted-foreground/40 focus:bg-secondary/50 transition-colors"
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full text-muted-foreground/50 hover:text-foreground hover:bg-secondary/50 transition-colors">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Category Tabs */}
              <div className="px-4 sm:px-5 py-2.5 border-b border-border flex gap-1.5 overflow-x-auto stool-scrollbar">
                {allCategories.map((cat) => {
                  const CatIcon = cat.name === "All" ? Package : getCategoryIcon(cat.name, "");
                  return (
                  <button
                    key={cat.name}
                    onClick={() => setActiveCategory(cat.name)}
                    className={cn(
                      "shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded-full border transition-all duration-200",
                      activeCategory === cat.name
                        ? "bg-primary text-primary-foreground border-primary shadow-[0_0_12px_hsl(var(--primary)/0.15)]"
                        : "bg-secondary/30 text-muted-foreground border-border hover:border-primary/20 hover:text-foreground"
                    )}
                  >
                    <CatIcon className="w-3 h-3" />
                    {cat.name}
                    <span className="opacity-50 font-mono text-[10px]">{cat.count}</span>
                  </button>
                  );
                })}
              </div>

              {/* Results bar */}
              <div className="px-4 sm:px-5 py-2 border-b border-border/50 flex items-center justify-between">
                <span className="text-[11px] font-semibold text-muted-foreground/60">
                  {activeCategory === "All" ? "All Services" : activeCategory}
                </span>
                <span className="text-[10px] font-mono text-muted-foreground/40">{filteredProducts.length} results</span>
              </div>

              {/* ═══ SERVICE LIST ═══ */}
              <div className="max-h-[62vh] overflow-y-auto stool-scrollbar" style={{ WebkitOverflowScrolling: 'touch' }}>
                {filteredProducts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-muted-foreground/30">
                    <Search className="w-8 h-8 mb-3" />
                    <p className="text-sm font-medium">No services found</p>
                    <p className="text-xs mt-1">Try adjusting your search or filters</p>
                  </div>
                ) : (
                  <div className="p-3 space-y-2">
                    {filteredProducts.map((p: any) => {
                      const pType = p.product_type;
                      const isAuto = pType === "api" || pType === "digital";
                      const isOutOfStock = pType === "digital" && p.stock === 0;
                      const pTime = p.processing_time || (isAuto ? "Instant" : "1–24 Hours");

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
                          key={p.id}
                          onClick={() => !isOutOfStock && handleSelectProduct(p.id)}
                          disabled={isOutOfStock}
                          className={cn(
                            "w-full text-left px-4 py-3.5 rounded-[var(--radius-card)] border transition-all duration-200 group",
                            isOutOfStock
                              ? "opacity-30 cursor-not-allowed border-border/30 bg-muted/5"
                              : "border-border bg-card hover:border-primary/25 hover:shadow-[0_0_20px_hsl(var(--primary)/0.06)] cursor-pointer"
                          )}
                          style={!isOutOfStock ? { boxShadow: "var(--shadow-card)" } : undefined}
                        >
                          <div className="flex items-start gap-3">
                            {/* Category Icon */}
                            {(() => {
                              const CatIcon = getCategoryIcon(p.category, p.name);
                              const catColor = getCategoryIconColor(p.category, p.name);
                              return (
                                <div className={cn("shrink-0 w-9 h-9 rounded-xl flex items-center justify-center mt-0.5", catColor)}>
                                  <CatIcon className="w-4 h-4" />
                                </div>
                              );
                            })()}
                            {/* Left */}
                            <div className="min-w-0 flex-1">
                              <div className="flex items-start gap-2">
                                <span className="shrink-0 font-mono text-[10px] font-bold text-primary bg-primary/8 px-1.5 py-0.5 rounded-[var(--radius-btn)] mt-0.5 border border-primary/10">
                                  #{p.display_id}
                                </span>
                                <p className="text-[13px] text-foreground font-semibold leading-snug line-clamp-2 break-words">
                                  {sanitizeName(p.name)}
                                </p>
                              </div>
                              <div className="flex items-center gap-2 mt-2 flex-wrap">
                                <span className={cn(
                                  "inline-flex items-center gap-1 text-[10px] font-bold rounded-full px-2 py-0.5 border",
                                  badgeClass
                                )}>
                                  <BadgeIcon className="w-2.5 h-2.5" />
                                  {badgeLabel}
                                </span>
                                <span className="text-[10px] text-muted-foreground/50 font-medium flex items-center gap-1">
                                  <Clock className="w-2.5 h-2.5" />
                                  {pTime}
                                </span>
                                {isOutOfStock && (
                                  <span className="text-[10px] font-bold text-destructive">Out of Stock</span>
                                )}
                              </div>
                            </div>

                            {/* Right */}
                            <div className="shrink-0 flex flex-col items-end gap-2 pt-0.5">
                              <span className="text-sm font-bold font-mono tabular-nums text-foreground">
                                <Money amount={p.wholesale_price} compact />
                              </span>
                              {!isOutOfStock && (
                                <span className={cn(
                                  "inline-flex items-center gap-1 text-[10px] font-bold text-primary-foreground px-3 py-1 rounded-full",
                                  "bg-gradient-to-r from-primary to-primary/80",
                                  "shadow-[0_0_10px_hsl(var(--primary)/0.12)]",
                                  "group-hover:shadow-[0_0_20px_hsl(var(--primary)/0.25)] transition-all duration-300"
                                )}>
                                  Order <ArrowRight className="w-3 h-3" />
                                </span>
                              )}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        ) : (
          /* ═══ MODE 2: SERVICE DETAIL ═══ */
          <motion.div
            key={`detail-${selectedProduct.id}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="space-y-4"
          >
            <button
              onClick={handleBack}
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors duration-150"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="font-medium">Change Service</span>
            </button>

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

                <div className="flex items-center gap-2 mt-3 flex-wrap">
                  <span className={cn(
                    "inline-flex items-center gap-1 text-[10px] font-bold rounded-full px-2.5 py-1 border",
                    isInstant ? "bg-success/10 text-success border-success/20" : "bg-warning/10 text-warning border-warning/20"
                  )}>
                    {isInstant ? <Zap className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                    {isInstant ? "Auto Instant" : "Manual"}
                  </span>
                  {selectedProduct.product_type === "digital" && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold rounded-full px-2.5 py-1 bg-primary/10 text-primary border border-primary/20">
                      <Zap className="w-3 h-3" /> AUTO-INSTANT
                    </span>
                  )}
                  {deliveryTime && deliveryTime !== "Instant" && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold rounded-full px-2.5 py-1 bg-ice/10 text-ice border border-ice/20">
                      <Clock className="w-3 h-3" /> {deliveryTime}
                    </span>
                  )}
                  {selectedProduct.description?.toLowerCase().includes("no refund") && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold rounded-full px-2.5 py-1 bg-destructive/10 text-destructive border border-destructive/20">
                      <ShieldAlert className="w-3 h-3" /> NO REFUND
                    </span>
                  )}
                </div>
              </div>

              {/* Description */}
              <div className="px-5 py-4 border-b border-border stool-scrollbar max-h-[40vh] overflow-y-auto">
                <ServiceDescription product={selectedProduct} />
              </div>

              {/* Order Form */}
              <div className="px-5 py-5 space-y-4">
                <h3 className="text-[11px] uppercase tracking-[0.12em] font-bold text-muted-foreground/50">
                  Order Details
                </h3>

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
                <div className="rounded-[var(--radius-card)] bg-secondary/20 border border-border p-4 space-y-2.5">
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
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      )}

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
