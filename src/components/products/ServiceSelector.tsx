import { useState, useRef, useEffect, useMemo } from "react";
import { Search, ChevronDown, Zap, Clock, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ServiceItem {
  id: string;
  slug: string | null;
  name: string;
  wholesale_price: number;
  category: string;
  product_type: string;
  stock: number;
  type: string;
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
    return services.filter((s) => s.name.toLowerCase().includes(q));
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
    <div ref={containerRef} className="relative w-full">
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
            "text-sm text-foreground placeholder:text-muted-foreground/40",
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
          className={cn(
            "absolute z-50 mt-2 w-full rounded-2xl border border-border/30 bg-card",
            "shadow-[0_8px_40px_-8px_rgba(0,0,0,0.5)] overflow-hidden animate-fade-in",
            "max-h-[420px] overflow-y-auto scrollbar-hide"
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
                <div className="sticky top-0 z-10 px-5 py-2.5 text-[10px] uppercase tracking-[0.12em] font-bold text-muted-foreground/50 bg-card/95 backdrop-blur-sm border-b border-border/10">
                  {category}
                  <span className="ml-2 text-muted-foreground/30 font-mono">{items.length}</span>
                </div>

                {/* Service items */}
                {items.map((service) => {
                  const isDigital = service.product_type === "digital";
                  const isAuto = service.product_type === "api" || isDigital;
                  const isOutOfStock = isDigital && service.stock === 0;

                  return (
                    <button
                      key={service.id}
                      onClick={() => !isOutOfStock && handleSelect(service)}
                      disabled={isOutOfStock}
                      className={cn(
                        "w-full flex items-center justify-between gap-4 px-5 py-3.5 text-left",
                        "transition-all duration-150 border-b border-border/5 last:border-0",
                        isOutOfStock
                          ? "opacity-40 cursor-not-allowed"
                          : "hover:bg-primary/5 cursor-pointer"
                      )}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-foreground truncate leading-snug">{service.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={cn(
                            "inline-flex items-center gap-1 text-[10px] font-semibold",
                            isAuto ? "text-primary/70" : "text-muted-foreground/50"
                          )}>
                            {isAuto ? <Zap className="w-2.5 h-2.5" /> : <Clock className="w-2.5 h-2.5" />}
                            {isAuto ? "Auto" : "Manual"}
                          </span>
                          {isOutOfStock && (
                            <span className="text-[10px] text-destructive font-semibold">Out of Stock</span>
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
