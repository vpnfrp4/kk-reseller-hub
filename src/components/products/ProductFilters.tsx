import { Search, X, ArrowUpDown, RotateCcw, SlidersHorizontal } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { t, useT } from "@/lib/i18n";
import { useState } from "react";
import { cn } from "@/lib/utils";

const CATEGORIES = ["All", "VPN", "Editing Tools", "AI Accounts", "IMEI Unlock"] as const;

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
}: ProductFiltersProps) {
  const l = useT();
  const [showAdvanced, setShowAdvanced] = useState(false);
  const hasActiveFilters =
    searchQuery ||
    activeCategory !== "All" ||
    sortBy !== "name" ||
    fulfillmentType !== "all" ||
    deliverySpeed !== "all";

  const resetFilters = () => {
    onSearchChange("");
    onCategoryChange("All");
    onSortChange("name");
    onFulfillmentTypeChange?.("all");
    onDeliverySpeedChange?.("all");
  };

  return (
    <div className="glass-card p-[var(--space-default)] space-y-3">
      {/* Primary filters row */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search services..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-8 py-2.5 rounded-[var(--radius-input)] bg-muted/20 border border-border/40 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all duration-200"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded text-muted-foreground hover:text-foreground transition-colors duration-200"
            >
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
            <SelectItem value="rating">Top Rated</SelectItem>
            <SelectItem value="success">Success Rate</SelectItem>
          </SelectContent>
        </Select>

        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className={cn(
            "inline-flex items-center gap-1.5 px-3 py-2.5 rounded-[var(--radius-btn)] text-xs font-medium border transition-all duration-200",
            showAdvanced
              ? "bg-primary/10 text-primary border-primary/30"
              : "bg-muted/20 text-muted-foreground hover:text-foreground border-border/40 hover:bg-muted/40"
          )}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          Filters
        </button>
      </div>

      {/* Category pills */}
      <div className="flex gap-2 flex-wrap">
        {CATEGORIES.map((cat) => {
          const count =
            cat === "All"
              ? products.length
              : products.filter((p: any) => p.category === cat).length;
          if (count === 0 && cat !== "All") return null;
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
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                  activeCategory === cat
                    ? "bg-primary-foreground/20"
                    : "bg-muted/40"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
        {hasActiveFilters && (
          <button
            onClick={resetFilters}
            className="px-3 py-2 rounded-[var(--radius-btn)] text-xs font-medium text-muted-foreground hover:text-foreground bg-muted/20 hover:bg-muted/40 border border-border/40 transition-all duration-200 flex items-center gap-1.5"
          >
            <RotateCcw className="w-3 h-3" />
            {l(t.products.reset)}
          </button>
        )}
      </div>

      {/* Advanced filters */}
      {showAdvanced && (
        <div className="flex flex-col sm:flex-row gap-3 pt-3 border-t border-border/30 animate-fade-in">
          <Select
            value={fulfillmentType}
            onValueChange={(v) => onFulfillmentTypeChange?.(v)}
          >
            <SelectTrigger className="w-[160px] bg-muted/20 border-border/40 text-sm rounded-[var(--radius-input)] h-10">
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
            <SelectTrigger className="w-[160px] bg-muted/20 border-border/40 text-sm rounded-[var(--radius-input)] h-10">
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
        </div>
      )}
    </div>
  );
}
