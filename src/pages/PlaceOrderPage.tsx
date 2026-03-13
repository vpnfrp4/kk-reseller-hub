import { useState, useMemo, useCallback } from "react";
import { sanitizeName } from "@/lib/sanitize-name";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import {
  Search, X, Star, ChevronRight,
} from "lucide-react";
import CategoryCardsOverview from "@/components/products/CategoryCardsOverview";
import ProductIcon from "@/components/products/ProductIcon";
import { cn } from "@/lib/utils";
import { Money, PageContainer } from "@/components/shared";

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
      <div className="space-y-6">

        {/* ═══ SEARCH BAR — rounded, soft, embedded ═══ */}
        <div className="sticky top-0 z-20 -mx-1 px-1 py-2 lg:static lg:mx-0 lg:px-0 lg:py-0 bg-background">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/30" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search services..."
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

        {/* ═══ SEARCH RESULTS ═══ */}
        {isSearching && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground px-1">
              {searchResults.length} result{searchResults.length !== 1 ? "s" : ""} for "{searchQuery}"
            </p>
            {searchResults.length === 0 ? (
              <div className="flex flex-col items-center py-16 text-muted-foreground/30">
                <Search className="w-10 h-10 mb-3" />
                <p className="text-sm font-medium">No services found</p>
              </div>
            ) : (
              <div className="rounded-2xl border border-border/15 bg-card overflow-hidden divide-y divide-border/10">
                {searchResults.map((p: any) => (
                  <button
                    key={p.id}
                    onClick={() => navigate(`/dashboard/place-order/${encodeURIComponent(p.category || "Other")}?highlight=${p.id}`)}
                    className="w-full text-left px-4 py-3.5 hover:bg-secondary/30 transition-colors flex items-center gap-3 group"
                  >
                    <ProductIcon imageUrl={p.image_url} name={p.name} category={p.category} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-medium text-foreground truncate group-hover:text-primary transition-colors">
                        {sanitizeName(p.name)}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{p.category}</p>
                    </div>
                    <span className="text-sm font-semibold tabular-nums text-foreground shrink-0" style={{ fontFamily: "'Space Grotesk', monospace" }}>
                      <Money amount={p.wholesale_price} compact />
                    </span>
                    <ChevronRight className="w-4 h-4 text-muted-foreground/20" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ═══ FAVORITES ═══ */}
        {!isSearching && favoriteProducts.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 px-1">
              <Star className="w-4 h-4 text-warning fill-warning" />
              <h2 className="text-[15px] font-semibold text-foreground">Favorites</h2>
            </div>
            <div className="space-y-1.5">
              {favoriteProducts.map((p: any) => (
                <button
                  key={p.id}
                  onClick={() => navigate(`/dashboard/place-order/${encodeURIComponent(p.category || "Other")}?highlight=${p.id}`)}
                  className="w-full text-left rounded-2xl border border-border/15 bg-card p-3.5 flex items-center gap-3 hover:bg-secondary/30 transition-all duration-150 active:scale-[0.99] group"
                >
                  <ProductIcon imageUrl={p.image_url} name={p.name} category={p.category} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-medium text-foreground truncate group-hover:text-primary transition-colors">{sanitizeName(p.name)}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      <Money amount={p.wholesale_price} compact />
                    </p>
                  </div>
                  <button
                    onClick={(e) => toggleFavorite(p.id, e)}
                    className="p-1 text-warning opacity-50 hover:opacity-100 transition-opacity"
                  >
                    <Star className="w-3.5 h-3.5 fill-warning" />
                  </button>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ═══ CATEGORY CARDS — two-column grid ═══ */}
        {!isSearching && (
          <div className="space-y-3">
            <h2 className="text-[15px] font-semibold text-foreground px-1">Browse Categories</h2>
            <CategoryCardsOverview onCategoryClick={handleCategoryClick} />
          </div>
        )}
      </div>
    </PageContainer>
  );
}
