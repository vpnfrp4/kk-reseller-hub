import Breadcrumb from "@/components/Breadcrumb";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Package, Loader2, ArrowUp } from "lucide-react";
import { toast } from "sonner";
import { useState, useEffect, useRef, useCallback } from "react";
import ProductFilters from "@/components/products/ProductFilters";
import ProductCard from "@/components/products/ProductCard";
import ProductCardSkeleton from "@/components/products/ProductCardSkeleton";
import PurchaseConfirmModal from "@/components/products/PurchaseConfirmModal";
import PurchaseSuccessModal from "@/components/products/PurchaseSuccessModal";
import TopUpDialog from "@/components/wallet/TopUpDialog";

interface PurchaseResult {
  order_id: string;
  credentials: string;
  product_name: string;
  price: number;
  quantity?: number;
  unit_price?: number;
}

const PAGE_SIZE = 9;

export default function ProductsPage() {
  const { user, profile, refreshProfile } = useAuth();
  const queryClient = useQueryClient();
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [result, setResult] = useState<PurchaseResult | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<string>("name");
  const [confirmProduct, setConfirmProduct] = useState<any | null>(null);
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [lastSavings, setLastSavings] = useState(0);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);

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

  const getTiersForProduct = (productId: string) => {
    return (allTiers || []).filter((t: any) => t.product_id === productId);
  };

  const filtered = (products || [])
    .filter((p: any) => activeCategory === "All" || p.category === activeCategory)
    .filter((p: any) => !searchQuery.trim() || p.name.toLowerCase().includes(searchQuery.trim().toLowerCase()))
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

  const mapErrorMessage = (msg: string): string => {
    const lower = msg.toLowerCase();
    if (lower.includes("out of stock") || lower.includes("no credentials available") || lower.includes("not enough stock")) {
      return "လက်ကျန်မရှိသေးပါ။ ခေတ္တစောင့်ဆိုင်းပေးပါရန်။ (Out of Stock)";
    }
    if (lower.includes("insufficient balance")) {
      return "လက်ကျန်ငွေ မလုံလောက်ပါ။ ငွေအရင်ဖြည့်ပေးပါရန်။ (Insufficient Balance)";
    }
    return msg;
  };

  const handleBuyClick = (product: any) => {
    if (product.stock <= 0) {
      toast.error("လက်ကျန်မရှိသေးပါ။ ခေတ္တစောင့်ဆိုင်းပေးပါရန်။ (Out of Stock)");
      return;
    }
    setConfirmProduct(product);
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

  return (
    <>
    <div className="space-y-8">
      <Breadcrumb items={[
        { label: "Dashboard", path: "/dashboard" },
        { label: "Products" },
      ]} />

      <div>
        <h1 className="text-2xl font-bold text-foreground">Products</h1>
        <p className="text-muted-foreground text-sm mt-1">Wholesale catalog</p>
      </div>

      <ProductFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        sortBy={sortBy}
        onSortChange={setSortBy}
        activeCategory={activeCategory}
        onCategoryChange={setActiveCategory}
        products={products || []}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <ProductCardSkeleton key={i} index={i} />
          ))
        ) : filtered.length === 0 ? (
          <div className="col-span-full bg-card border border-border rounded-2xl p-12 text-center" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <Package className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-foreground font-medium">No products found</p>
            <p className="text-sm text-muted-foreground mt-1">Try adjusting your search or filter</p>
          </div>
        ) : (
          visibleProducts.map((product: any, i: number) => (
            <ProductCard
              key={product.id}
              product={product}
              index={i}
              isPurchasing={purchasing === product.id}
              onBuyClick={handleBuyClick}
              pricingTiers={getTiersForProduct(product.id)}
            />
          ))
        )}
      </div>

      {!isLoading && hasMore && (
        <div ref={sentinelRef} className="flex justify-center py-6">
          <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
        </div>
      )}

      {!isLoading && filtered.length > 0 && (
        <p className="text-center text-xs text-muted-foreground">
          Showing {visibleProducts.length} of {filtered.length} products
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

      <PurchaseSuccessModal
        result={result}
        onClose={() => { setResult(null); setLastSavings(0); }}
        totalSavings={lastSavings}
      />

      {/* Hidden TopUpDialog triggered from insufficient balance prompt */}
      <TopUpDialog
        userId={user?.id}
        defaultAmount={topUpDefaultAmount}
        open={topUpOpen}
        onOpenChange={setTopUpOpen}
        hideTrigger
      />
    </div>

    <button
      onClick={scrollToTop}
      className={`fixed bottom-6 right-6 z-50 p-3 rounded-full bg-primary text-primary-foreground shadow-md transition-all duration-300 ${
        showScrollTop ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
      }`}
      aria-label="Scroll to top"
    >
      <ArrowUp className="w-5 h-5" />
    </button>
    </>
  );
}
