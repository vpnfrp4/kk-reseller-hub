import { useState, useMemo, useCallback } from "react";
import { sanitizeName } from "@/lib/sanitize-name";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import {
  ShoppingCart, Search, X, Smartphone, Star,
} from "lucide-react";
import CategoryCardsOverview from "@/components/products/CategoryCardsOverview";
import ProductIcon from "@/components/products/ProductIcon";
import { cn } from "@/lib/utils";
import { Money, PageContainer } from "@/components/shared";
import { motion } from "framer-motion";
import IFreeImeiCheck from "@/components/imei/IFreeImeiCheck";
import IFreeCheckHistory from "@/components/imei/IFreeCheckHistory";

/* ═══ FAVORITES STORAGE ═══ */
const FAVORITES_KEY = "kktech_favorite_services";
function getFavorites(): string[] {
  try { return JSON.parse(localStorage.getItem(FAVORITES_KEY) || "[]"); } catch { return []; }
}
function setFavorites(ids: string[]) {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(ids));
}

export default function PlaceOrderPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"services" | "ifree">("services");
  const [searchQuery, setSearchQuery] = useState("");
  const [favorites, setFavoritesState] = useState<string[]>(getFavorites);

  /* Navigate to the dedicated category detail page */
  const handleCategoryClick = useCallback((category: string) => {
    navigate(`/dashboard/place-order/${encodeURIComponent(category)}`);
  }, [navigate]);

  /* Products for favorites & search results */
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

  /* Search results — when user types, show matching products across all categories */
  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return products.filter((p: any) =>
      p.name.toLowerCase().includes(q) ||
      String(p.display_id).includes(q) ||
      (p.brand && p.brand.toLowerCase().includes(q)) ||
      (p.category && p.category.toLowerCase().includes(q))
    ).slice(0, 20);
  }, [products, searchQuery]);

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
              <p className="page-header-subtitle hidden sm:block">Browse categories and order services</p>
            </div>
          </div>
          <div className="flex gap-1 p-1 rounded-btn bg-secondary/50 border border-border">
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
          {/* ═══ SEARCH BAR ═══ */}
          <div className="sticky top-0 z-20 -mx-3 px-3 py-2 lg:static lg:mx-0 lg:px-0 lg:py-0"
            style={{ background: 'hsl(var(--background) / 0.9)', backdropFilter: 'blur(16px)' }}>
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/40 pointer-events-none transition-colors group-focus-within:text-primary/60" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
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
                <button onClick={() => setSearchQuery("")} className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 rounded-full text-muted-foreground/50 hover:text-foreground hover:bg-secondary/60 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* ═══ SEARCH RESULTS (inline dropdown) ═══ */}
          {searchQuery.trim() && (
            <div className="space-y-2">
              <p className="text-xs font-bold text-muted-foreground/60 px-1">
                {searchResults.length} result{searchResults.length !== 1 ? "s" : ""} for "{searchQuery}"
              </p>
              {searchResults.length === 0 ? (
                <div className="flex flex-col items-center py-12 text-muted-foreground/30">
                  <Search className="w-8 h-8 mb-2" />
                  <p className="text-sm font-medium">No services found</p>
                </div>
              ) : (
                <div className="rounded-card border border-border/40 bg-card overflow-hidden divide-y divide-border/20">
                  {searchResults.map((p: any) => (
                    <button
                      key={p.id}
                      onClick={() => navigate(`/dashboard/place-order/${encodeURIComponent(p.category || "Other")}?highlight=${p.id}`)}
                      className="w-full text-left px-4 py-3 hover:bg-secondary/15 transition-colors flex items-center gap-3 group/sr"
                    >
                      <ProductIcon imageUrl={p.image_url} name={p.name} category={p.category} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-semibold text-foreground truncate group-hover/sr:text-primary transition-colors">
                          {sanitizeName(p.name)}
                        </p>
                        <p className="text-[10px] text-muted-foreground/50">{p.category} · #{p.display_id}</p>
                      </div>
                      <span className="text-sm font-bold font-mono tabular-nums text-foreground shrink-0">
                        <Money amount={p.wholesale_price} compact />
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ═══ FAVORITES ═══ */}
          {!searchQuery.trim() && favoriteProducts.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
              <div className="flex items-center gap-2 px-1">
                <Star className="w-4 h-4 text-warning fill-warning" />
                <h2 className="text-sm font-bold text-foreground">Favorite Services</h2>
                <span className="text-[10px] font-mono text-muted-foreground/40">{favoriteProducts.length}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {favoriteProducts.map((p: any) => (
                  <button
                    key={p.id}
                    onClick={() => navigate(`/dashboard/place-order/${encodeURIComponent(p.category || "Other")}?highlight=${p.id}`)}
                    className={cn(
                      "w-full text-left rounded-xl border border-warning/20 bg-warning/[0.03] p-3 group/fav",
                      "hover:border-warning/40 hover:bg-warning/[0.06] transition-all duration-200 relative"
                    )}
                  >
                    <div className="flex items-center gap-2.5">
                      <ProductIcon imageUrl={p.image_url} name={p.name} category={p.category} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-foreground truncate">{sanitizeName(p.name)}</p>
                        <p className="text-[10px] font-mono text-muted-foreground/50 mt-0.5">
                          <Money amount={p.wholesale_price} compact />
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={(e) => toggleFavorite(p.id, e)}
                      className="absolute top-2 right-2 p-0.5 text-warning opacity-60 hover:opacity-100 transition-opacity"
                    >
                      <Star className="w-3 h-3 fill-warning" />
                    </button>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* ═══ CATEGORY CARDS ═══ */}
          {!searchQuery.trim() && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 px-1">
                <div className="w-1 h-5 rounded-full bg-gradient-to-b from-primary to-accent" />
                <h2 className="text-sm font-bold text-foreground">Browse Categories</h2>
                <span className="text-[10px] font-mono text-muted-foreground/40">{products.length} services</span>
              </div>
              <CategoryCardsOverview onCategoryClick={handleCategoryClick} />
            </div>
          )}
        </div>
      )}
    </PageContainer>
  );
}
