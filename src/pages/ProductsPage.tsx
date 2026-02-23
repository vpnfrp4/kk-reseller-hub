import Breadcrumb from "@/components/Breadcrumb";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Package } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import ProductFilters from "@/components/products/ProductFilters";
import ProductCard from "@/components/products/ProductCard";
import ProductCardSkeleton from "@/components/products/ProductCardSkeleton";
import PurchaseConfirmModal from "@/components/products/PurchaseConfirmModal";
import PurchaseSuccessModal from "@/components/products/PurchaseSuccessModal";

interface PurchaseResult {
  order_id: string;
  credentials: string;
  product_name: string;
  price: number;
}

export default function ProductsPage() {
  const { profile, refreshProfile } = useAuth();
  const queryClient = useQueryClient();
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [result, setResult] = useState<PurchaseResult | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<string>("name");
  const [confirmProduct, setConfirmProduct] = useState<any | null>(null);
  const [agreedTerms, setAgreedTerms] = useState(false);

  const { data: products, isLoading } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("*")
        .order("category", { ascending: true });
      return data || [];
    },
  });

  const handleBuyClick = (product: any) => {
    if ((profile?.balance || 0) < product.wholesale_price) {
      toast.error("Insufficient balance. Please top up your wallet.");
      return;
    }
    if (product.stock <= 0) {
      toast.error("This product is currently out of stock.");
      return;
    }
    setConfirmProduct(product);
    setAgreedTerms(false);
  };

  const handleBuy = async (product: any) => {
    setConfirmProduct(null);
    setPurchasing(product.id);

    try {
      const { data, error } = await supabase.functions.invoke("purchase", {
        body: { product_id: product.id },
      });

      if (error) throw new Error(error.message);
      if (data?.error) {
        toast.error(data.error);
        return;
      }

      setResult(data as PurchaseResult);
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["recent-orders"] });
      queryClient.invalidateQueries({ queryKey: ["wallet-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["recent-transactions"] });
      refreshProfile();
    } catch (err: any) {
      toast.error(err.message || "Purchase failed. Please try again.");
    } finally {
      setPurchasing(null);
    }
  };

  const filtered = (products || [])
    .filter((p: any) => activeCategory === "All" || p.category === activeCategory)
    .filter((p: any) => !searchQuery.trim() || p.name.toLowerCase().includes(searchQuery.trim().toLowerCase()))
    .sort((a: any, b: any) => {
      if (sortBy === "price-low") return a.wholesale_price - b.wholesale_price;
      if (sortBy === "price-high") return b.wholesale_price - a.wholesale_price;
      return a.name.localeCompare(b.name);
    });

  return (
    <div className="space-y-8">
      <Breadcrumb items={[
        { label: "Dashboard", path: "/dashboard" },
        { label: "Products" },
      ]} />

      <div className="animate-fade-in">
        <h1 className="text-2xl font-bold text-foreground">Products</h1>
        <p className="text-muted-foreground text-sm">Browse digital services at wholesale prices</p>
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <ProductCardSkeleton key={i} index={i} />
          ))
        ) : filtered.length === 0 ? (
          <div className="col-span-full glass-card p-12 text-center animate-fade-in">
            <Package className="w-10 h-10 text-muted-foreground/50 mx-auto mb-3" />
            <p className="text-foreground font-medium">No products found</p>
            <p className="text-sm text-muted-foreground mt-1">Try adjusting your search or filter</p>
          </div>
        ) : (
          filtered.map((product: any, i: number) => (
            <ProductCard
              key={product.id}
              product={product}
              index={i}
              isPurchasing={purchasing === product.id}
              onBuyClick={handleBuyClick}
            />
          ))
        )}
      </div>

      <PurchaseConfirmModal
        product={confirmProduct}
        agreedTerms={agreedTerms}
        onAgreedTermsChange={setAgreedTerms}
        onConfirm={handleBuy}
        onClose={() => setConfirmProduct(null)}
      />

      <PurchaseSuccessModal
        result={result}
        onClose={() => setResult(null)}
      />
    </div>
  );
}
