import { useNavigate } from "react-router-dom";
import Breadcrumb from "@/components/Breadcrumb";
import { supabase } from "@/integrations/supabase/client";
import { t, useT } from "@/lib/i18n";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Package } from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import ServiceSelector from "@/components/products/ServiceSelector";
import { cn } from "@/lib/utils";
import { preloadImages } from "@/lib/image-preloader";

export default function ProductsPage() {
  const l = useT();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeCategory, setActiveCategory] = useState<string>("All");

  // Realtime: auto-refresh when admin changes products
  useEffect(() => {
    const channel = supabase
      .channel("products-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "products" }, () => {
        queryClient.invalidateQueries({ queryKey: ["products"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  const { data: products, isLoading } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true });
      return data || [];
    },
  });

  // Derive categories with counts
  const categories = useMemo(() => {
    const cats = new Map<string, number>();
    (products || []).forEach((p: any) => {
      const cat = p.category || "Other";
      cats.set(cat, (cats.get(cat) || 0) + 1);
    });
    return [
      { name: "All", count: (products || []).length },
      ...Array.from(cats.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([name, count]) => ({ name, count })),
    ];
  }, [products]);

  // Filter products by active category
  const filteredProducts = useMemo(() => {
    const all = products || [];
    if (activeCategory === "All") return all;
    return all.filter((p: any) => (p.category || "Other") === activeCategory);
  }, [products, activeCategory]);

  // Navigate to order flow when a service is selected
  const handleServiceSelect = (service: any) => {
    const pt = service.product_type || "digital";
    if (pt === "imei") {
      navigate("/imei-marketplace");
      return;
    }
    // Navigate directly to order flow page
    navigate(`/dashboard/order/${service.slug || service.id}`);
  };

  return (
    <div className="space-y-8 max-w-3xl mx-auto w-full max-w-[92vw] sm:max-w-3xl">
      <Breadcrumb items={[
        { label: l(t.nav.dashboard), path: "/dashboard" },
        { label: l(t.products.title) },
      ]} />

      {/* ─── Header ─── */}
      <div className="animate-fade-in">
        <h1 className="text-xl font-bold text-foreground tracking-tight">{l(t.products.title)}</h1>
        <p className="text-xs text-muted-foreground/60 mt-1">{l(t.products.subtitle)}</p>
      </div>

      {/* ─── Category Tabs ─── */}
      <div className="animate-fade-in" style={{ animationDelay: "0.05s" }}>
        <div className="flex gap-1.5 overflow-x-auto scrollbar-hide p-1.5 rounded-2xl bg-secondary/20 border border-border/15">
          {categories.map((cat) => {
            if (cat.count === 0 && cat.name !== "All") return null;
            const isActive = activeCategory === cat.name;

            return (
              <button
                key={cat.name}
                onClick={() => setActiveCategory(cat.name)}
                className={cn(
                  "shrink-0 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 flex items-center gap-2",
                  isActive
                    ? "bg-success text-success-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/15"
                )}
              >
                {cat.name === "All" ? l(t.products.all) : cat.name}
                <span
                  className={cn(
                    "text-[10px] font-mono tabular-nums px-1.5 py-0.5 rounded-md",
                    isActive ? "bg-success-foreground/20" : "bg-muted/20"
                  )}
                >
                  {cat.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── Service Selection ─── */}
      <div className="animate-fade-in relative z-[39]" style={{ animationDelay: "0.1s" }}>
        <div className="glass-card p-4 sm:p-6 space-y-4 bg-background border-border/30">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-[11px] uppercase tracking-[0.12em] font-bold text-muted-foreground/60">
                Service Selection
              </h2>
              <p className="text-[10px] text-muted-foreground/40 mt-0.5">
                {filteredProducts.length} services available
              </p>
            </div>
            {activeCategory !== "All" && (
              <span className="text-[10px] font-semibold text-success px-2.5 py-1 rounded-lg bg-success/10 border border-success/15">
                {activeCategory}
              </span>
            )}
          </div>

          <ServiceSelector
            services={filteredProducts}
            isLoading={isLoading}
            onSelect={handleServiceSelect}
          />
        </div>
      </div>

      {/* ─── Quick stats ─── */}
      {!isLoading && (products || []).length > 0 && (
        <div className="animate-fade-in grid grid-cols-3 gap-3" style={{ animationDelay: "0.15s" }}>
          {[
            { label: "Total Services", value: (products || []).length },
            { label: "Categories", value: categories.length - 1 },
            { label: "Auto Delivery", value: (products || []).filter((p: any) => p.product_type === "api" || p.product_type === "digital").length },
          ].map((stat) => (
            <div key={stat.label} className="rounded-xl bg-secondary/15 border border-border/10 p-4 text-center">
              <p className="text-lg font-bold font-mono tabular-nums text-foreground">{stat.value}</p>
              <p className="text-[9px] uppercase tracking-widest text-muted-foreground/40 mt-1 font-semibold">{stat.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* ─── Empty state ─── */}
      {!isLoading && (products || []).length === 0 && (
        <div className="rounded-2xl border border-border/20 bg-card p-12 text-center animate-fade-in">
          <Package className="mx-auto mb-4 h-8 w-8 text-muted-foreground/20" />
          <p className="font-medium text-foreground text-sm">{l(t.products.noProducts)}</p>
          <p className="mt-1.5 text-xs text-muted-foreground/60">{l(t.products.adjustFilter)}</p>
        </div>
      )}
    </div>
  );
}
