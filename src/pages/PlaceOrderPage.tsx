import { useState, useMemo, useCallback } from "react";
import { sanitizeName } from "@/lib/sanitize-name";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import {
  Search, X, Star, TrendingUp, ShoppingBag, ChevronRight,
} from "lucide-react";
import CategoryCardsOverview from "@/components/products/CategoryCardsOverview";
import ProductIcon from "@/components/products/ProductIcon";
import { cn } from "@/lib/utils";
import { Money, PageContainer } from "@/components/shared";
import { motion } from "framer-motion";

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
  const [searchQuery, setSearchQuery] = useState("");
  const [favorites, setFavoritesState] = useState<string[]>(getFavorites);

  const handleCategoryClick = useCallback((category: string) => {
    navigate(`/dashboard/place-order/${encodeURIComponent(category)}`);
  }, [navigate]);

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

  const isSearching = searchQuery.trim().length > 0;

  return (
    <PageContainer maxWidth="max-w-5xl">
      {/* ═══ BNPL HERO HEADER ═══ */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="relative overflow-hidden rounded-[var(--radius-modal)] p-6 lg:p-8 mb-5"
      >
        <div className="absolute inset-0 bnpl-hero-gradient" />
        <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-white/[0.05] blur-3xl pointer-events-none" />
        <div className="relative z-10">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2.5 mb-1.5">
                <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center backdrop-blur-sm">
                  <ShoppingBag className="w-4.5 h-4.5 text-white" />
                </div>
                <h1 className="text-xl lg:text-2xl font-extrabold text-white tracking-tight">Place Order</h1>
              </div>
              <p className="text-xs text-white/50 hidden sm:block pl-[46px]">Browse categories and order services instantly</p>
            </div>
            {products.length > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-pill bg-white/10 backdrop-blur-sm">
                <TrendingUp className="w-3 h-3 text-white/70" />
                <span className="text-[11px] font-bold text-white/70 tabular-nums">{products.length} services</span>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      <div className="space-y-5">
        {/* ═══ SEARCH BAR ═══ */}
        <div className="sticky top-0 z-20 -mx-3 px-3 py-2 lg:static lg:mx-0 lg:px-0 lg:py-0"
          style={{ background: 'hsl(var(--background) / 0.92)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}>
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="relative"
          >
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-muted-foreground/40" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search IMEI service, iPhone unlock, Samsung FRP..."
                className={cn(
                  "w-full pl-12 pr-12 py-3.5 lg:py-4 rounded-2xl text-sm font-medium",
                  "bg-card border border-border/40 text-foreground placeholder:text-muted-foreground/35",
                  "focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30",
                  "transition-all duration-200",
                )}
                style={{ boxShadow: "var(--shadow-card)" }}
              />
              {searchQuery && (
                <motion.button
                  initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                  onClick={() => setSearchQuery("")}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 rounded-full text-muted-foreground/40 hover:text-foreground hover:bg-destructive/10 transition-all duration-200"
                >
                  <X className="w-4 h-4" />
                </motion.button>
              )}
            </div>
          </motion.div>
        </div>

        {/* ═══ SEARCH RESULTS ═══ */}
        {isSearching && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-2.5"
          >
            <p className="text-[11px] font-bold text-muted-foreground/50 uppercase tracking-wider px-1">
              {searchResults.length} result{searchResults.length !== 1 ? "s" : ""} for "{searchQuery}"
            </p>
            {searchResults.length === 0 ? (
              <div className="flex flex-col items-center py-16 text-muted-foreground/25">
                <Search className="w-10 h-10 mb-3" />
                <p className="text-sm font-semibold">No services found</p>
                <p className="text-xs mt-1">Try different keywords</p>
              </div>
            ) : (
              <div className="rounded-2xl border border-border/30 bg-card overflow-hidden divide-y divide-border/15" style={{ boxShadow: "var(--shadow-card)" }}>
                {searchResults.map((p: any, i: number) => (
                  <motion.button
                    key={p.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.02 }}
                    onClick={() => navigate(`/dashboard/place-order/${encodeURIComponent(p.category || "Other")}?highlight=${p.id}`)}
                    className="w-full text-left px-4 py-3.5 hover:bg-secondary/30 transition-all duration-150 flex items-center gap-3 group/sr"
                  >
                    <ProductIcon imageUrl={p.image_url} name={p.name} category={p.category} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-semibold text-foreground truncate group-hover/sr:text-primary transition-colors">
                        {sanitizeName(p.name)}
                      </p>
                      <p className="text-[10px] text-muted-foreground/40 mt-0.5">{p.category} · #{p.display_id}</p>
                    </div>
                    <span className="text-sm font-bold font-mono tabular-nums text-foreground shrink-0">
                      <Money amount={p.wholesale_price} compact />
                    </span>
                    <ChevronRight className="w-4 h-4 text-muted-foreground/20" />
                  </motion.button>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* ═══ FAVORITES ═══ */}
        {!isSearching && favoriteProducts.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
            <div className="flex items-center gap-2.5 px-1">
              <div className="w-7 h-7 rounded-xl bg-warning/10 flex items-center justify-center">
                <Star className="w-3.5 h-3.5 text-warning fill-warning" />
              </div>
              <h2 className="text-sm font-bold text-foreground">Favorites</h2>
              <span className="text-[10px] font-mono text-muted-foreground/30 tabular-nums bg-secondary/60 px-2 py-0.5 rounded-pill">{favoriteProducts.length}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {favoriteProducts.map((p: any, i: number) => (
                <motion.button
                  key={p.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => navigate(`/dashboard/place-order/${encodeURIComponent(p.category || "Other")}?highlight=${p.id}`)}
                  className={cn(
                    "w-full text-left rounded-2xl border border-border/30 bg-card p-4 group/fav",
                    "hover:border-warning/25 transition-all duration-200 relative overflow-hidden"
                  )}
                  style={{ boxShadow: "var(--shadow-card)" }}
                >
                  <div className="flex items-center gap-3">
                    <ProductIcon imageUrl={p.image_url} name={p.name} category={p.category} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-foreground truncate group-hover/fav:text-warning transition-colors duration-200">{sanitizeName(p.name)}</p>
                      <p className="text-[10px] font-mono text-muted-foreground/40 mt-0.5">
                        <Money amount={p.wholesale_price} compact />
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground/20 group-hover/fav:text-warning/50 transition-colors" />
                  </div>
                  <button
                    onClick={(e) => toggleFavorite(p.id, e)}
                    className="absolute top-3 right-3 p-1.5 rounded-full text-warning opacity-40 hover:opacity-100 hover:bg-warning/10 transition-all duration-200"
                  >
                    <Star className="w-3 h-3 fill-warning" />
                  </button>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}

        {/* ═══ CATEGORY CARDS ═══ */}
        {!isSearching && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
            className="space-y-3"
          >
            <div className="flex items-center gap-2.5 px-1">
              <div className="w-1.5 h-5 rounded-full bg-primary" />
              <h2 className="text-sm font-bold text-foreground">Browse Categories</h2>
            </div>
            <CategoryCardsOverview onCategoryClick={handleCategoryClick} />
          </motion.div>
        )}
      </div>
    </PageContainer>
  );
}
