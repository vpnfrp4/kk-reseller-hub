import { Search, X, ArrowUpDown, RotateCcw } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { t } from "@/lib/i18n";

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
  const hasActiveFilters = searchQuery || activeCategory !== "All" || sortBy !== "name";

  const resetFilters = () => { onSearchChange(""); onCategoryChange("All"); onSortChange("name"); };

  return (
    <div className="bg-card border border-border rounded-2xl p-4 flex flex-col sm:flex-row gap-3 items-start sm:items-center" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder={t.products.search.mm}
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-9 pr-8 py-2.5 rounded-xl bg-muted/30 border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all duration-200"
        />
        {searchQuery && (
          <button onClick={() => onSearchChange("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded text-muted-foreground hover:text-foreground transition-colors duration-200">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      <Select value={sortBy} onValueChange={onSortChange}>
        <SelectTrigger className="w-[160px] bg-muted/30 border-border text-sm rounded-xl h-10">
          <ArrowUpDown className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
          <SelectValue placeholder="Sort by" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="name">{t.products.sortName.mm}</SelectItem>
          <SelectItem value="price-low">{t.products.sortPriceLow.mm}</SelectItem>
          <SelectItem value="price-high">{t.products.sortPriceHigh.mm}</SelectItem>
        </SelectContent>
      </Select>
      <div className="flex gap-2 flex-wrap">
        {CATEGORIES.map((cat) => {
          const count = cat === "All" ? products.length : products.filter((p: any) => p.category === cat).length;
          const label = cat === "All" ? t.products.all.mm : cat;
          return (
            <button
              key={cat}
              onClick={() => onCategoryChange(cat)}
              className={`px-4 py-2 rounded-xl text-xs font-medium transition-all duration-200 flex items-center gap-1.5 ${
                activeCategory === cat
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-muted/60 border border-border"
              }`}
            >
              {label}
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${activeCategory === cat ? "bg-primary-foreground/20" : "bg-border"}`}>{count}</span>
            </button>
          );
        })}
        {hasActiveFilters && (
          <button onClick={resetFilters} className="px-3 py-2 rounded-xl text-xs font-medium text-muted-foreground hover:text-foreground bg-muted/30 hover:bg-muted/50 border border-border transition-all duration-200 flex items-center gap-1.5">
            <RotateCcw className="w-3 h-3" />
            {t.products.reset.mm}
          </button>
        )}
      </div>
    </div>
  );
}
