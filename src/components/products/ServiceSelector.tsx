import { useState, useRef, useEffect, useMemo } from "react";
import { Search, ChevronDown, Zap, Clock, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { getCategoryIcon, getCategoryIconColor } from "@/lib/category-icons";
import ProductIcon from "@/components/products/ProductIcon";

interface ServiceItem {
  id: string;
  slug: string | null;
  name: string;
  wholesale_price: number;
  category: string;
  product_type: string;
  stock: number;
  type: string;
  image_url?: string | null;
}

interface ServiceSelectorProps {
  services: ServiceItem[];
  isLoading?: boolean;
  onSelect: (service: ServiceItem) => void;
}

export default function ServiceSelector({ services, isLoading, onSelect }: ServiceSelectorProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return services;
    const q = search.trim().toLowerCase();
    return services.filter((s) => {
      if (s.name.toLowerCase().includes(q)) return true;
      // Search by display_id number
      const did = (s as any).display_id;
      if (did && String(did).includes(q)) return true;
      if (did && `#${did}`.includes(q)) return true;
      return false;
    });
  }, [services, search]);

  // Group by category
  const grouped = useMemo(() => {
    const map = new Map<string, ServiceItem[]>();
    for (const s of filtered) {
      const cat = s.category || "Other";
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(s);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filtered]);

  const handleSelect = (service: ServiceItem) => {
    setOpen(false);
    setSearch("");
    onSelect(service);
  };

  const handleInputFocus = () => {
    setOpen(true);
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-full overflow-visible overflow-x-hidden">
      {/* ─── Trigger / Search Input ─── */}
      <div
        className={cn(
          "relative flex items-center w-full rounded-2xl border transition-all duration-200",
          "bg-secondary/20 border-border/30",
          open && "ring-1 ring-primary/30 border-primary/30 bg-secondary/30"
        )}
      >
        <Search className="absolute left-5 w-4 h-4 text-muted-foreground/50" />
        <input
          ref={inputRef}
          type="text"
          placeholder="Select a service..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); if (!open) setOpen(true); }}
          onFocus={handleInputFocus}
          className={cn(
            "w-full pl-12 pr-12 py-4 rounded-2xl bg-transparent",
            "text-base sm:text-sm text-foreground placeholder:text-muted-foreground/40",
            "focus:outline-none",
          )}
        />
        <div className="absolute right-4 flex items-center gap-2">
          {search && (
            <button
              onClick={() => { setSearch(""); inputRef.current?.focus(); }}
              className="p-1 rounded-md text-muted-foreground/50 hover:text-foreground transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <ChevronDown className={cn(
            "w-4 h-4 text-muted-foreground/40 transition-transform duration-200",
            open && "rotate-180"
          )} />
        </div>
      </div>

      {/* ─── Dropdown ─── */}
      {open && (
        <div
          style={{ zIndex: 9999, backgroundColor: 'hsl(var(--card))' }}
          className={cn(
            "absolute mt-2 rounded-2xl border border-border/30",
            "shadow-[0_8px_60px_-4px_rgba(0,0,0,0.9),0_0_0_1px_rgba(255,255,255,0.06)]",
            "overflow-hidden animate-fade-in",
            "max-h-[60vh] sm:max-h-[420px] overflow-y-auto scrollbar-hide",
            "left-0 right-0 w-auto mx-0 sm:mx-0 sm:w-full"
          )}
        >
          {isLoading ? (
            <div className="p-8 text-center text-sm text-muted-foreground/50">
              <div className="w-5 h-5 mx-auto mb-3 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              Loading services...
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground/50">
              No services found
            </div>
          ) : (
            grouped.map(([category, items]) => (
              <div key={category}>
                {/* Category header */}
                <div style={{ backgroundColor: 'hsl(var(--card))' }} className="sticky top-0 z-10 px-5 py-2.5 text-[10px] uppercase tracking-[0.12em] font-bold text-muted-foreground/50 border-b border-border/10">
                  {category}
                  <span className="ml-2 text-muted-foreground/30 font-mono">{items.length}</span>
                </div>

                {/* Service items */}
                {items.map((service) => {
                  const isDigital = service.product_type === "digital";
                  const isAuto = service.product_type === "api" || isDigital;
                  const isOutOfStock = isDigital && service.stock === 0;
                  const IconComp = getCategoryIcon(service.category, service.name);
                  const iconColor = getCategoryIconColor(service.category, service.name);

                  return (
                    <button
                      key={service.id}
                      onClick={() => !isOutOfStock && handleSelect(service)}
                      disabled={isOutOfStock}
                      className={cn(
                        "w-full flex items-center gap-3 px-5 py-3.5 text-left",
                        "transition-all duration-150 border-b border-border/5 last:border-0",
                        isOutOfStock
                          ? "opacity-40 cursor-not-allowed"
                          : "hover:bg-primary/5 cursor-pointer"
                      )}
                    >
                      <ProductIcon
                        imageUrl={service.image_url}
                        name={service.name}
                        category={service.category}
                        size="sm"
                      />

                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-foreground truncate leading-snug">
                          {(service as any).display_id && (
                            <span className="font-mono font-bold text-primary/70 mr-1.5">#{(service as any).display_id}</span>
                          )}
                          {service.name}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={cn(
                            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold",
                            isAuto
                              ? "bg-success/15 text-success"
                              : "bg-warning/15 text-warning"
                          )}>
                            {isAuto ? <Zap className="w-2.5 h-2.5" /> : <Clock className="w-2.5 h-2.5" />}
                            {isAuto ? "Instant" : "Manual"}
                          </span>
                          {isOutOfStock && (
                            <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold bg-destructive/15 text-destructive">Out of Stock</span>
                          )}
                        </div>
                      </div>

                      <span className="shrink-0 text-sm font-bold font-mono tabular-nums text-success">
                        {service.wholesale_price.toLocaleString()}
                        <span className="text-[9px] font-normal text-muted-foreground/40 ml-0.5">MMK</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
