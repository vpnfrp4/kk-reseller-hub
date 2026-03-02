import { useNavigate } from "react-router-dom";
import Breadcrumb from "@/components/Breadcrumb";
import { supabase } from "@/integrations/supabase/client";
import { t, useT } from "@/lib/i18n";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Package, Loader2, ArrowUp, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import ProductFilters from "@/components/products/ProductFilters";
import ProductCard from "@/components/products/ProductCard";
import ProductCardSkeleton from "@/components/products/ProductCardSkeleton";
import PurchaseConfirmModal from "@/components/products/PurchaseConfirmModal";
import PurchaseSuccessModal from "@/components/products/PurchaseSuccessModal";
import ImportantNoticeModal from "@/components/products/ImportantNoticeModal";
import TopUpDialog from "@/components/wallet/TopUpDialog";
import { cn } from "@/lib/utils";

interface PurchaseResult {
  order_id: string;
  credentials: string;
  product_name: string;
  price: number;
  quantity?: number;
  unit_price?: number;
}

const PAGE_SIZE = 24;

export default function ProductsPage() {
  const l = useT();
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [result, setResult] = useState<PurchaseResult | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<string>("name");
  const [fulfillmentType, setFulfillmentType] = useState("all");
  const [deliverySpeed, setDeliverySpeed] = useState("all");
  const [providerId, setProviderId] = useState("all");
  const [confirmProduct, setConfirmProduct] = useState<any | null>(null);
  const [noticeProduct, setNoticeProduct] = useState<any | null>(null);
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [lastSavings, setLastSavings] = useState(0);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());

  // Smart top-up state
  const [topUpOpen, setTopUpOpen] = useState(false);
  const [topUpDefaultAmount, setTopUpDefaultAmount] = useState<number | undefined>();

  useEffect(() => {
    const handleScroll = () => setShowScrollTop(window.scrollY > 400);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  const { data: products, isLoading } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("*")
        .eq("type", "auto")
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true });
      return data || [];
    },
  });

  const { data: allTiers } = useQuery({
    queryKey: ["pricing-tiers"],
    queryFn: async () => {
      const { data } = await supabase
        .from("pricing_tiers")
        .select("*")
        .order("min_qty", { ascending: true });
      return data || [];
    },
  });

  const { data: usdRateSetting } = useQuery({
    queryKey: ["usd-mmk-rate-updated"],
    queryFn: async () => {
      const { data } = await (supabase as any).from("system_settings").select("*").eq("key", "usd_mmk_rate").single();
      return data;
    },
  });

  const lastRateUpdate = usdRateSetting?.updated_at || null;
  const usdRate = usdRateSetting?.value?.rate ? Number(usdRateSetting.value.rate) : null;

  const getTiersForProduct = (productId: string) => {
    return (allTiers || []).filter((t: any) => t.product_id === productId);
  };

  const providers = useMemo(() => {
    const map = new Map<string, string>();
    (products || []).forEach((p: any) => {
      if (p.imei_providers?.id && p.imei_providers?.name) {
        map.set(p.imei_providers.id, p.imei_providers.name);
      }
    });
    return Array.from(map, ([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [products]);

  const filtered = (products || [])
    .filter((p: any) => activeCategory === "All" || p.category === activeCategory)
    .filter((p: any) => !searchQuery.trim() || p.name.toLowerCase().includes(searchQuery.trim().toLowerCase()))
    .filter((p: any) => providerId === "all" || p.imei_providers?.id === providerId)
    .sort((a: any, b: any) => {
      if (sortBy === "price-low") return a.wholesale_price - b.wholesale_price;
      if (sortBy === "price-high") return b.wholesale_price - a.wholesale_price;
      return a.name.localeCompare(b.name);
    });

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [activeCategory, searchQuery, sortBy]);

  const hasMore = visibleCount < filtered.length;
  const visibleProducts = filtered.slice(0, visibleCount);

  const loadMore = useCallback(() => {
    setVisibleCount((prev) => Math.min(prev + PAGE_SIZE, filtered.length));
  }, [filtered.length]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore) loadMore();
      },
      { rootMargin: "200px" }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loadMore]);

  // Group visible products by category
  const groupedProducts = useMemo(() => {
    const groups = new Map<string, any[]>();
    for (const p of visibleProducts) {
      const cat = p.category || "Other";
      if (!groups.has(cat)) groups.set(cat, []);
      groups.get(cat)!.push(p);
    }
    return Array.from(groups, ([category, items]) => ({ category, items }));
  }, [visibleProducts]);

  const toggleCategory = (cat: string) => {
    setCollapsedCategories((prev) => {
      const next = new Set(prev);
      next.has(cat) ? next.delete(cat) : next.add(cat);
      return next;
    });
  };

  const mapErrorMessage = (msg: string): string => {
    const lower = msg.toLowerCase();
    if (lower.includes("out of stock") || lower.includes("no credentials available") || lower.includes("not enough stock")) {
      return l(t.products.outOfStockToast);
    }
    if (lower.includes("insufficient balance")) {
      return l(t.products.insufficientBalanceToast);
    }
    return msg;
  };

  const handleBuyClick = (product: any) => {
    const pt = product.product_type || "digital";
    if (pt === "imei") { navigate("/imei-marketplace"); return; }
    if (pt === "manual" || pt === "api") { navigate(`/dashboard/products/${product.id}`); return; }
    if (product.stock <= 0) { toast.error(l(t.products.outOfStockToast)); return; }
    setNoticeProduct(product);
  };

  const handleNoticeConfirm = () => {
    setConfirmProduct(noticeProduct);
    setNoticeProduct(null);
    setAgreedTerms(false);
  };

  const handleTopUp = (amount: number) => {
    setTopUpDefaultAmount(amount);
    setTopUpOpen(true);
  };

  const handleBuy = async (product: any, quantity: number = 1) => {
    const tiers = getTiersForProduct(product.id);
    const highestTierPrice = tiers.length > 0 ? Math.max(...tiers.map((t: any) => t.unit_price)) : product.wholesale_price;
    const sortedTiers = [...tiers].sort((a: any, b: any) => b.min_qty - a.min_qty);
    const activeTier = sortedTiers.find((t: any) => quantity >= t.min_qty && (t.max_qty === null || quantity <= t.max_qty));
    const unitPrice = activeTier ? activeTier.unit_price : product.wholesale_price;
    const savings = (highestTierPrice - unitPrice) * quantity;

    setConfirmProduct(null);
    setPurchasing(product.id);

    try {
      const { data, error } = await supabase.functions.invoke("purchase", {
        body: { product_id: product.id, quantity },
      });

      if (error) throw new Error(error.message);
      if (data && !data.success) {
        toast.error(mapErrorMessage(data.error as string));
        return;
      }

      setLastSavings(savings);
      setResult(data as PurchaseResult);
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["recent-orders"] });
      queryClient.invalidateQueries({ queryKey: ["wallet-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["recent-transactions"] });
      refreshProfile();
    } catch (err: any) {
      toast.error(mapErrorMessage(err.message || "Purchase failed. Please try again."));
    } finally {
      setPurchasing(null);
    }
  };

  // Running card index for stagger animation across groups
  let globalIndex = 0;

  return (
    <>
    <div className="space-y-[var(--space-default)]">
      <Breadcrumb items={[
        { label: l(t.nav.dashboard), path: "/dashboard" },
        { label: l(t.products.title) },
      ]} />

      <div className="animate-fade-in">
        <p className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground mb-[var(--space-micro)]">{l(t.products.title)}</p>
        <p className="text-[11px] text-muted-foreground">{l(t.products.subtitle)}</p>
      </div>

      <ProductFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        sortBy={sortBy}
        onSortChange={setSortBy}
        activeCategory={activeCategory}
        onCategoryChange={setActiveCategory}
        products={products || []}
        fulfillmentType={fulfillmentType}
        onFulfillmentTypeChange={setFulfillmentType}
        deliverySpeed={deliverySpeed}
        onDeliverySpeedChange={setDeliverySpeed}
        providerId={providerId}
        onProviderIdChange={setProviderId}
        providers={providers}
      />

      {/* Categorized product grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <ProductCardSkeleton key={i} index={i} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-[var(--radius-card)] border border-border/40 bg-card p-[var(--space-page)] text-center">
          <Package className="mx-auto mb-3 h-8 w-8 text-muted-foreground/30" />
          <p className="font-medium text-foreground text-sm">{l(t.products.noProducts)}</p>
          <p className="mt-1 text-xs text-muted-foreground">{l(t.products.adjustFilter)}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {groupedProducts.map(({ category, items }) => {
            const isCollapsed = collapsedCategories.has(category);
            const startIndex = globalIndex;
            globalIndex += items.length;

            return (
              <div key={category} className="animate-fade-in">
                {/* Category header — collapsible */}
                <button
                  onClick={() => toggleCategory(category)}
                  className="w-full flex items-center gap-3 mb-3 group/cat"
                >
                  <span className="text-[11px] uppercase tracking-widest font-semibold text-foreground">
                    {category}
                  </span>
                  <span className="text-[10px] font-mono text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
                    {items.length}
                  </span>
                  <div className="flex-1 h-px bg-border/30" />
                  <ChevronDown
                    className={cn(
                      "w-4 h-4 text-muted-foreground transition-transform duration-200",
                      isCollapsed && "-rotate-90"
                    )}
                  />
                </button>

                {/* Grid — smooth collapse */}
                <div
                  className={cn(
                    "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 transition-all duration-300 ease-out",
                    isCollapsed ? "max-h-0 overflow-hidden opacity-0" : "max-h-[5000px] opacity-100"
                  )}
                >
                  {items.map((product: any, i: number) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      index={startIndex + i}
                      isPurchasing={purchasing === product.id}
                      onBuyClick={handleBuyClick}
                      pricingTiers={getTiersForProduct(product.id)}
                      lastRateUpdate={product.base_currency === "USD" ? lastRateUpdate : null}
                      usdRate={product.base_currency === "USD" ? usdRate : null}
                      provider={(product as any).imei_providers || null}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!isLoading && hasMore && (
        <div ref={sentinelRef} className="flex justify-center py-[var(--space-card)]">
          <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
        </div>
      )}

      {!isLoading && filtered.length > 0 && (
        <p className="text-center text-xs text-muted-foreground">
          {l(t.products.showing)} {visibleProducts.length} / {filtered.length}
        </p>
      )}

      <PurchaseConfirmModal
        product={confirmProduct}
        agreedTerms={agreedTerms}
        onAgreedTermsChange={setAgreedTerms}
        onConfirm={handleBuy}
        onClose={() => setConfirmProduct(null)}
        pricingTiers={confirmProduct ? getTiersForProduct(confirmProduct.id) : []}
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
    </div>

    <button
      onClick={scrollToTop}
      className={`fixed bottom-6 right-6 z-50 p-3 rounded-full bg-primary text-primary-foreground transition-all duration-300 ${
        showScrollTop ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
      }`}
      style={{ boxShadow: "var(--shadow-elevated)" }}
      aria-label="Scroll to top"
    >
      <ArrowUp className="w-5 h-5" />
    </button>
    </>
  );
}
