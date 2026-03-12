import { useState, useMemo, useCallback } from "react";
import { sanitizeName } from "@/lib/sanitize-name";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import {
  Search, X, Star, Sparkles, TrendingUp,
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
      {/* ═══ HEADER ═══ */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="mb-5 lg:mb-7"
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-primary" />
              </div>
              <h1 className="text-xl lg:text-2xl font-extrabold text-foreground tracking-tight">Place Order</h1>
            </div>
            <p className="text-xs text-muted-foreground/60 hidden sm:block pl-[42px]">Browse categories and order services instantly</p>
          </div>
          {products.length > 0 && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-secondary/60 border border-border/30">
              <TrendingUp className="w-3 h-3 text-primary" />
              <span className="text-[11px] font-bold text-muted-foreground tabular-nums">{products.length} services</span>
            </div>
          )}
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
            className="relative group"
          >
            {/* Glow ring on focus */}
            <div className="absolute -inset-0.5 rounded-[18px] bg-gradient-to-r from-primary/20 via-primary/5 to-primary/20 opacity-0 group-focus-within:opacity-100 blur-sm transition-opacity duration-500 pointer-events-none" />
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 w-9 h-9 rounded-xl bg-primary/8 flex items-center justify-center pointer-events-none transition-all duration-300 group-focus-within:bg-primary/15 group-focus-within:scale-110 group-focus-within:shadow-[0_0_12px_-3px_hsl(var(--primary)/0.3)]">
                <Search className="w-4 h-4 text-muted-foreground/50 transition-colors duration-300 group-focus-within:text-primary" />
              </div>
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search IMEI service, iPhone unlock, Samsung FRP..."
                className={cn(
                  "w-full pl-[60px] pr-12 py-3.5 lg:py-4 rounded-2xl text-sm font-medium",
                  "bg-card/90 backdrop-blur-sm border border-border/40 text-foreground placeholder:text-muted-foreground/35",
                  "focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30",
                  "transition-all duration-300",
                  "shadow-card",
                )}
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
              <div className="rounded-2xl border border-border/30 bg-card/80 overflow-hidden divide-y divide-border/15 backdrop-blur-sm">
                {searchResults.map((p: any, i: number) => (
                  <motion.button
                    key={p.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.02 }}
                    onClick={() => navigate(`/dashboard/place-order/${encodeURIComponent(p.category || "Other")}?highlight=${p.id}`)}
                    className="w-full text-left px-4 py-3.5 hover:bg-secondary/20 transition-all duration-150 flex items-center gap-3 group/sr"
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
              <div className="w-6 h-6 rounded-lg bg-warning/10 flex items-center justify-center">
                <Star className="w-3.5 h-3.5 text-warning fill-warning" />
              </div>
              <h2 className="text-sm font-bold text-foreground">Favorites</h2>
              <span className="text-[10px] font-mono text-muted-foreground/30 tabular-nums">{favoriteProducts.length}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {favoriteProducts.map((p: any, i: number) => (
                <motion.button
                  key={p.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  whileHover={{ y: -3, transition: { duration: 0.2 } }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => navigate(`/dashboard/place-order/${encodeURIComponent(p.category || "Other")}?highlight=${p.id}`)}
                  className={cn(
                    "w-full text-left rounded-[var(--radius-card)] border border-warning/15 bg-card/80 backdrop-blur-sm p-3.5 group/fav",
                    "hover:border-warning/30 hover:shadow-[0_8px_24px_-8px_hsl(var(--warning)/0.15)] transition-all duration-300 relative overflow-hidden"
                  )}
                >
                  {/* Top accent */}
                  <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-warning/30 to-transparent opacity-0 group-hover/fav:opacity-100 transition-opacity duration-300" />
                  <div className="flex items-center gap-3">
                    <ProductIcon imageUrl={p.image_url} name={p.name} category={p.category} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-foreground truncate group-hover/fav:text-warning transition-colors duration-200">{sanitizeName(p.name)}</p>
                      <p className="text-[10px] font-mono text-muted-foreground/40 mt-0.5">
                        <Money amount={p.wholesale_price} compact />
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={(e) => toggleFavorite(p.id, e)}
                    className="absolute top-2.5 right-2.5 p-1.5 rounded-full text-warning opacity-50 hover:opacity-100 hover:bg-warning/10 transition-all duration-200"
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
              <div className="w-1 h-5 rounded-full bg-gradient-to-b from-primary to-primary/30" />
              <h2 className="text-sm font-bold text-foreground">Browse Categories</h2>
            </div>
            <CategoryCardsOverview onCategoryClick={handleCategoryClick} />
          </motion.div>
        )}
      </div>
    </PageContainer>
  );
}
