import { Search, X, ArrowUpDown, RotateCcw, SlidersHorizontal } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { t, useT } from "@/lib/i18n";
import { useRef, useState } from "react";
import { cn } from "@/lib/utils";

const FULFILLMENT_TYPES = [
  { value: "all", label: "All Types" },
  { value: "instant", label: "Instant" },
  { value: "manual", label: "Manual" },
  { value: "api", label: "Auto (API)" },
] as const;

const DELIVERY_SPEEDS = [
  { value: "all", label: "Any Speed" },
  { value: "instant", label: "Instant" },
  { value: "fast", label: "< 1 Hour" },
  { value: "standard", label: "1-24 Hours" },
  { value: "slow", label: "1-3 Days" },
] as const;

interface ProductFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  sortBy: string;
  onSortChange: (sort: string) => void;
  activeCategory: string;
  onCategoryChange: (category: string) => void;
  products: any[];
  fulfillmentType?: string;
  onFulfillmentTypeChange?: (type: string) => void;
  deliverySpeed?: string;
  onDeliverySpeedChange?: (speed: string) => void;
  providerId?: string;
  onProviderIdChange?: (id: string) => void;
  providers?: { id: string; name: string }[];
}

export default function ProductFilters({
  searchQuery,
  onSearchChange,
  sortBy,
  onSortChange,
  activeCategory,
  onCategoryChange,
  products,
  fulfillmentType = "all",
  onFulfillmentTypeChange,
  deliverySpeed = "all",
  onDeliverySpeedChange,
  providerId = "all",
  onProviderIdChange,
  providers = [],
}: ProductFiltersProps) {
  const l = useT();
  const [showAdvanced, setShowAdvanced] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const hasActiveFilters =
    searchQuery ||
    activeCategory !== "All" ||
    sortBy !== "name" ||
    fulfillmentType !== "all" ||
    deliverySpeed !== "all" ||
    providerId !== "all";

  const resetFilters = () => {
    onSearchChange("");
    onCategoryChange("All");
    onSortChange("name");
    onFulfillmentTypeChange?.("all");
    onDeliverySpeedChange?.("all");
    onProviderIdChange?.("all");
  };

  // Derive categories from products
  const categories = (() => {
    const cats = new Set<string>();
    products.forEach((p: any) => { if (p.category) cats.add(p.category); });
    return ["All", ...Array.from(cats).sort()];
  })();

  return (
    <div className="space-y-3">
      {/* ─── Search bar ─── */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
          <input
            type="text"
            placeholder="Search services..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className={cn(
              "w-full pl-10 pr-9 py-3 rounded-xl",
              "bg-card/80 backdrop-blur-sm border border-border/40",
              "text-sm text-foreground placeholder:text-muted-foreground/50",
              "focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30",
              "transition-all duration-200",
            )}
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Select value={sortBy} onValueChange={onSortChange}>
            <SelectTrigger className="w-[150px] bg-card/80 backdrop-blur-sm border-border/40 text-sm rounded-xl h-[46px]">
              <ArrowUpDown className="w-3.5 h-3.5 mr-1.5 text-muted-foreground/60" />
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">{l(t.products.sortName)}</SelectItem>
              <SelectItem value="price-low">{l(t.products.sortPriceLow)}</SelectItem>
              <SelectItem value="price-high">{l(t.products.sortPriceHigh)}</SelectItem>
            </SelectContent>
          </Select>

          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className={cn(
              "h-[46px] px-3.5 rounded-xl text-xs font-medium border transition-all duration-200 inline-flex items-center gap-1.5",
              showAdvanced
                ? "bg-primary/10 text-primary border-primary/30"
                : "bg-card/80 backdrop-blur-sm text-muted-foreground hover:text-foreground border-border/40 hover:border-primary/20"
            )}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Filters</span>
          </button>

          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="h-[46px] px-3 rounded-xl text-xs font-medium text-muted-foreground hover:text-foreground bg-card/80 border border-border/40 hover:border-primary/20 transition-all duration-200 inline-flex items-center gap-1.5"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* ─── Category chips — horizontal scrollable ─── */}
      <div
        ref={scrollRef}
        className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 -mx-1 px-1"
      >
        {categories.map((cat) => {
          const count =
            cat === "All"
              ? products.length
              : products.filter((p: any) => p.category === cat).length;
          if (count === 0 && cat !== "All") return null;
          const isActive = activeCategory === cat;
          const label = cat === "All" ? l(t.products.all) : cat;

          return (
            <button
              key={cat}
              onClick={() => onCategoryChange(cat)}
              className={cn(
                "shrink-0 px-4 py-2 rounded-xl text-xs font-medium transition-all duration-200 flex items-center gap-2 border",
                isActive
                  ? "bg-primary/15 text-primary border-primary/30 shadow-[0_0_12px_-3px_hsl(var(--primary)/0.3)]"
                  : "bg-card/60 text-muted-foreground hover:text-foreground border-border/30 hover:border-primary/20 hover:bg-card/80"
              )}
            >
              {label}
              <span
                className={cn(
                  "text-[10px] font-mono px-1.5 py-0.5 rounded-md",
                  isActive ? "bg-primary/20 text-primary" : "bg-muted/30 text-muted-foreground/70"
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ─── Advanced filters ─── */}
      {showAdvanced && (
        <div className="flex flex-col sm:flex-row gap-3 pt-3 border-t border-border/20 animate-fade-in">
          <Select
            value={fulfillmentType}
            onValueChange={(v) => onFulfillmentTypeChange?.(v)}
          >
            <SelectTrigger className="w-[160px] bg-card/80 backdrop-blur-sm border-border/40 text-sm rounded-xl h-10">
              <SelectValue placeholder="Fulfillment" />
            </SelectTrigger>
            <SelectContent>
              {FULFILLMENT_TYPES.map((ft) => (
                <SelectItem key={ft.value} value={ft.value}>
                  {ft.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={deliverySpeed}
            onValueChange={(v) => onDeliverySpeedChange?.(v)}
          >
            <SelectTrigger className="w-[160px] bg-card/80 backdrop-blur-sm border-border/40 text-sm rounded-xl h-10">
              <SelectValue placeholder="Delivery Speed" />
            </SelectTrigger>
            <SelectContent>
              {DELIVERY_SPEEDS.map((ds) => (
                <SelectItem key={ds.value} value={ds.value}>
                  {ds.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {providers.length > 0 && (
            <Select
              value={providerId}
              onValueChange={(v) => onProviderIdChange?.(v)}
            >
              <SelectTrigger className="w-[180px] bg-card/80 backdrop-blur-sm border-border/40 text-sm rounded-xl h-10">
                <SelectValue placeholder="Provider" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Providers</SelectItem>
                {providers.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      )}
    </div>
  );
}
