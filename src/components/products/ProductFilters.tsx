import { Search, X, ArrowUpDown, RotateCcw, SlidersHorizontal } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { t, useT } from "@/lib/i18n";
import { useState } from "react";
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

  // Derive categories
  const categories = (() => {
    const cats = new Set<string>();
    products.forEach((p: any) => { if (p.category) cats.add(p.category); });
    return ["All", ...Array.from(cats).sort()];
  })();

  return (
    <div className="space-y-5">
      {/* ─── Tab switches ─── */}
      <div className="flex gap-1 overflow-x-auto scrollbar-hide p-1 rounded-2xl bg-secondary/30 border border-border/20">
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
                "shrink-0 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all duration-250 flex items-center gap-2",
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/20"
              )}
            >
              {label}
              <span
                className={cn(
                  "text-[10px] font-mono tabular-nums px-1.5 py-0.5 rounded-md",
                  isActive ? "bg-primary-foreground/20" : "bg-muted/30"
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ─── Search + Sort row ─── */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
          <input
            type="text"
            placeholder="Select a service..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className={cn(
              "w-full pl-11 pr-9 py-3.5 rounded-xl",
              "bg-secondary/20 border border-border/30",
              "text-sm text-foreground placeholder:text-muted-foreground/40",
              "focus:outline-none focus:ring-1 focus:ring-primary/30 focus:border-primary/30 focus:bg-secondary/30",
              "transition-all duration-200",
            )}
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange("")}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 rounded-md text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Select value={sortBy} onValueChange={onSortChange}>
            <SelectTrigger className="w-[150px] bg-secondary/20 border-border/30 text-sm rounded-xl h-[50px]">
              <ArrowUpDown className="w-3.5 h-3.5 mr-1.5 text-muted-foreground/50" />
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
              "h-[50px] px-4 rounded-xl text-xs font-medium border transition-all duration-200 inline-flex items-center gap-1.5",
              showAdvanced
                ? "bg-primary/10 text-primary border-primary/30"
                : "bg-secondary/20 text-muted-foreground hover:text-foreground border-border/30 hover:border-primary/20"
            )}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Filters</span>
          </button>

          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="h-[50px] px-3.5 rounded-xl text-xs font-medium text-muted-foreground hover:text-foreground bg-secondary/20 border border-border/30 hover:border-primary/20 transition-all duration-200 inline-flex items-center gap-1.5"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* ─── Advanced filters ─── */}
      {showAdvanced && (
        <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-border/15 animate-fade-in">
          <Select value={fulfillmentType} onValueChange={(v) => onFulfillmentTypeChange?.(v)}>
            <SelectTrigger className="w-[160px] bg-secondary/20 border-border/30 text-sm rounded-xl h-10">
              <SelectValue placeholder="Fulfillment" />
            </SelectTrigger>
            <SelectContent>
              {FULFILLMENT_TYPES.map((ft) => (
                <SelectItem key={ft.value} value={ft.value}>{ft.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={deliverySpeed} onValueChange={(v) => onDeliverySpeedChange?.(v)}>
            <SelectTrigger className="w-[160px] bg-secondary/20 border-border/30 text-sm rounded-xl h-10">
              <SelectValue placeholder="Delivery Speed" />
            </SelectTrigger>
            <SelectContent>
              {DELIVERY_SPEEDS.map((ds) => (
                <SelectItem key={ds.value} value={ds.value}>{ds.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {providers.length > 0 && (
            <Select value={providerId} onValueChange={(v) => onProviderIdChange?.(v)}>
              <SelectTrigger className="w-[180px] bg-secondary/20 border-border/30 text-sm rounded-xl h-10">
                <SelectValue placeholder="Provider" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Providers</SelectItem>
                {providers.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      )}
    </div>
  );
}
