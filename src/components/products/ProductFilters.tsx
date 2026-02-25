import { Search, X, ArrowUpDown, RotateCcw } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { t, useT } from "@/lib/i18n";

const CATEGORIES = ["All", "VPN", "Editing Tools", "AI Accounts"] as const;

interface ProductFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  sortBy: string;
  onSortChange: (sort: string) => void;
  activeCategory: string;
  onCategoryChange: (category: string) => void;
  products: any[];
}

export default function ProductFilters({ searchQuery, onSearchChange, sortBy, onSortChange, activeCategory, onCategoryChange, products }: ProductFiltersProps) {
  const l = useT();
  const hasActiveFilters = searchQuery || activeCategory !== "All" || sortBy !== "name";

  const resetFilters = () => { onSearchChange(""); onCategoryChange("All"); onSortChange("name"); };

  return (
    <div className="glass-card p-[var(--space-default)] flex flex-col sm:flex-row gap-3 items-start sm:items-center">
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder={l(t.products.search)}
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-9 pr-8 py-2.5 rounded-[var(--radius-input)] bg-muted/20 border border-border/40 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all duration-200"
        />
        {searchQuery && (
          <button onClick={() => onSearchChange("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded text-muted-foreground hover:text-foreground transition-colors duration-200">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      <Select value={sortBy} onValueChange={onSortChange}>
        <SelectTrigger className="w-[160px] bg-muted/20 border-border/40 text-sm rounded-[var(--radius-input)] h-10">
          <ArrowUpDown className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
          <SelectValue placeholder="Sort by" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="name">{l(t.products.sortName)}</SelectItem>
          <SelectItem value="price-low">{l(t.products.sortPriceLow)}</SelectItem>
          <SelectItem value="price-high">{l(t.products.sortPriceHigh)}</SelectItem>
        </SelectContent>
      </Select>
      <div className="flex gap-2 flex-wrap">
        {CATEGORIES.map((cat) => {
          const count = cat === "All" ? products.length : products.filter((p: any) => p.category === cat).length;
          const label = cat === "All" ? l(t.products.all) : cat;
          return (
            <button
              key={cat}
              onClick={() => onCategoryChange(cat)}
              className={`px-4 py-2 rounded-[var(--radius-btn)] text-xs font-medium transition-all duration-200 flex items-center gap-1.5 ${
                activeCategory === cat
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/20 text-muted-foreground hover:text-foreground hover:bg-muted/40 border border-border/40"
              }`}
            >
              {label}
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${activeCategory === cat ? "bg-primary-foreground/20" : "bg-muted/40"}`}>{count}</span>
            </button>
          );
        })}
        {hasActiveFilters && (
          <button onClick={resetFilters} className="px-3 py-2 rounded-[var(--radius-btn)] text-xs font-medium text-muted-foreground hover:text-foreground bg-muted/20 hover:bg-muted/40 border border-border/40 transition-all duration-200 flex items-center gap-1.5">
            <RotateCcw className="w-3 h-3" />
            {l(t.products.reset)}
          </button>
        )}
      </div>
    </div>
  );
}
