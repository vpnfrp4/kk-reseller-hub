import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { getCategoryIcon, getCategoryIconColor } from "@/lib/category-icons";
import { ArrowRight, Wifi } from "lucide-react";

interface CategoryCardData {
  name: string;
  count: number;
  sampleProducts: string[];
  isApi?: boolean;
  image_url?: string | null;
}

interface CategoryCardsOverviewProps {
  onCategoryClick: (category: string) => void;
}

export default function CategoryCardsOverview({ onCategoryClick }: CategoryCardsOverviewProps) {
  // Fetch admin-managed categories for ordering & visibility
  const { data: managedCategories } = useQuery({
    queryKey: ["managed-categories"],
    queryFn: async () => {
      const { data } = await supabase
        .from("categories")
        .select("name, sort_order, is_active, image_url")
        .order("sort_order", { ascending: true });
      return data || [];
    },
    staleTime: 60000,
  });

  // Fetch product categories
  const { data: productCategories, isLoading: productsLoading } = useQuery({
    queryKey: ["place-order-categories"],
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("name, category")
        .neq("type", "disabled")
        .gt("stock", 0)
        .order("sort_order")
        .limit(500);

      if (!data) return [];

      const catMap: Record<string, { count: number; samples: string[] }> = {};
      data.forEach((p) => {
        const cat = p.category || "Other";
        if (!catMap[cat]) catMap[cat] = { count: 0, samples: [] };
        catMap[cat].count++;
        if (catMap[cat].samples.length < 3) catMap[cat].samples.push(p.name);
      });

      return Object.entries(catMap)
        .map(([name, data]): CategoryCardData => ({
          name,
          count: data.count,
          sampleProducts: data.samples,
          image_url: null,
        }));
    },
    staleTime: 60000,
  });

  // Fetch iFree IMEI services count
  const { data: ifreeCount = 0 } = useQuery({
    queryKey: ["ifree-services-count"],
    queryFn: async () => {
      const { data } = await supabase
        .from("ifree_services_cache")
        .select("id, name, is_enabled")
        .eq("is_enabled", true);
      return data?.length || 0;
    },
    staleTime: 60000,
  });

  // Fetch a few sample iFree service names
  const { data: ifreeSamples = [] } = useQuery({
    queryKey: ["ifree-services-samples"],
    queryFn: async () => {
      const { data } = await supabase
        .from("ifree_services_cache")
        .select("name")
        .eq("is_enabled", true)
        .limit(3);
      return (data || []).map((s) => s.name);
    },
    staleTime: 60000,
  });

  const isLoading = productsLoading;

  // Merge: inject IMEI Check category with iFree services
  const categories = (() => {
    if (!productCategories) return [];

    // Build active set from managed categories
    const managedMap = new Map((managedCategories || []).map(mc => [mc.name, mc as { name: string; sort_order: number; is_active: boolean; image_url: string | null }]));
    const activeSet = managedCategories?.length
      ? new Set((managedCategories).filter(mc => mc.is_active).map(mc => mc.name))
      : null; // null = no managed categories yet, show all

    // Enrich with managed category image_url
    let cats = productCategories.map(c => {
      const managed = managedMap.get(c.name);
      return { ...c, image_url: managed?.image_url || null };
    });

    // Filter out inactive categories (only if we have managed categories)
    if (activeSet) {
      cats = cats.filter(c => activeSet.has(c.name) || !managedMap.has(c.name));
    }

    // Find existing "IMEI Check" category from products
    const existingIdx = cats.findIndex((c) => c.name === "IMEI Check");

    if (ifreeCount > 0) {
      // Skip if IMEI Check is explicitly inactive
      const imeiCheckActive = !activeSet || activeSet.has("IMEI Check") || !managedMap.has("IMEI Check");
      if (imeiCheckActive) {
        if (existingIdx >= 0) {
          cats[existingIdx] = {
            ...cats[existingIdx],
            count: cats[existingIdx].count + ifreeCount,
            sampleProducts: [...ifreeSamples, ...cats[existingIdx].sampleProducts].slice(0, 3),
            isApi: true,
          };
        } else {
          cats.unshift({
            name: "IMEI Check",
            count: ifreeCount,
            sampleProducts: ifreeSamples,
            isApi: true,
            image_url: managedMap.get("IMEI Check")?.image_url || null,
          });
        }
      }
    }

    // Sort by managed sort_order, then IMEI Check first, then by count
    return cats.sort((a, b) => {
      const aManaged = managedMap.get(a.name);
      const bManaged = managedMap.get(b.name);
      if (aManaged && bManaged) return aManaged.sort_order - bManaged.sort_order;
      if (aManaged) return -1;
      if (bManaged) return 1;
      if (a.name === "IMEI Check") return -1;
      if (b.name === "IMEI Check") return 1;
      return b.count - a.count;
    });
  })();

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="rounded-card border border-border/40 bg-card p-4 animate-pulse">
            <Skeleton className="w-11 h-11 rounded-xl mb-3" />
            <Skeleton className="h-4 w-24 mb-1" />
            <Skeleton className="h-3 w-16" />
          </div>
        ))}
      </div>
    );
  }

  if (!categories || categories.length === 0) return null;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
      {categories.map((cat, i) => {
        const IconComp = getCategoryIcon(cat.name, cat.name);
        const iconColor = getCategoryIconColor(cat.name, cat.name);

        return (
          <button
            key={cat.name}
            onClick={() => onCategoryClick(cat.name)}
            className={cn(
              "relative overflow-hidden rounded-card border border-border/40 bg-card",
              "p-4 sm:p-5 text-left transition-all duration-300 group",
              "hover:border-primary/30 hover:-translate-y-1",
              "hover:shadow-[0_8px_30px_-8px_hsl(var(--primary)/0.15),0_0_0_1px_hsl(var(--primary)/0.08)]",
              "active:scale-[0.97]",
              "opacity-0 animate-stagger-in",
              "min-h-[140px] sm:min-h-[160px] flex flex-col"
            )}
            style={{ animationDelay: `${i * 0.04}s` }}
          >
            {/* Ambient glow orb — visible on hover */}
            <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-primary/[0.06] blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
            <div className="absolute -bottom-10 -left-10 w-24 h-24 rounded-full bg-accent/[0.05] blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />

            {/* Top gradient accent bar */}
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-primary/60 via-accent/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

            {/* Badge — top-right */}
            <div className="absolute top-3 right-3 flex items-center gap-1.5">
              {cat.isApi && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-success/10 border border-success/20 text-[9px] font-bold text-success uppercase tracking-wider">
                  <Wifi className="w-2.5 h-2.5" />
                  API
                </span>
              )}
              <span className="inline-flex items-center justify-center min-w-[24px] h-6 px-2 rounded-full bg-primary/10 text-[11px] font-bold font-mono tabular-nums text-primary border border-primary/15 group-hover:bg-primary/15 group-hover:border-primary/25 transition-colors duration-300">
                {cat.count}
              </span>
            </div>

            <CategoryIcon imageUrl={cat.image_url} iconColor={iconColor} IconComp={IconComp} />

            <p className="text-sm sm:text-[15px] font-bold text-foreground line-clamp-2 mb-auto leading-snug">{cat.name}</p>

            {/* Sample products */}
            {cat.sampleProducts.length > 0 && (
              <div className="mt-2.5 pt-2 border-t border-border/20">
                {cat.sampleProducts.slice(0, 2).map((name, j) => (
                  <p key={j} className="text-[10px] sm:text-[11px] text-muted-foreground/60 truncate leading-relaxed">
                    • {name}
                  </p>
                ))}
                {cat.count > 2 && (
                  <p className="text-[10px] sm:text-[11px] text-primary/60 font-medium mt-0.5">
                    +{cat.count - 2} more
                  </p>
                )}
              </div>
            )}

            {/* Hover arrow */}
            <div className="absolute bottom-3 right-3 w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center opacity-0 group-hover:opacity-100 group-hover:translate-x-0 -translate-x-1 transition-all duration-300">
              <ArrowRight className="w-3.5 h-3.5 text-primary" />
            </div>
          </button>
        );
      })}
    </div>
  );
}
