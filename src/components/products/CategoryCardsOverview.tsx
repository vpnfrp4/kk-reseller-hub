import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { getCategoryIcon, getCategoryIconColor } from "@/lib/category-icons";
import { ArrowRight, Wifi } from "lucide-react";
import { motion } from "framer-motion";

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

  const isLoading = productsLoading;

  const categories = (() => {
    if (!productCategories) return [];
    const managedMap = new Map((managedCategories || []).map(mc => [mc.name, mc as { name: string; sort_order: number; is_active: boolean; image_url: string | null }]));
    const activeSet = managedCategories?.length
      ? new Set((managedCategories).filter(mc => mc.is_active).map(mc => mc.name))
      : null;

    let cats = productCategories.map(c => {
      const managed = managedMap.get(c.name);
      return { ...c, image_url: managed?.image_url || null };
    });

    if (activeSet) {
      cats = cats.filter(c => activeSet.has(c.name) || !managedMap.has(c.name));
    }

    cats = cats.filter(c => c.name !== "IMEI Check");

    return cats.sort((a, b) => {
      const aManaged = managedMap.get(a.name);
      const bManaged = managedMap.get(b.name);
      if (aManaged && bManaged) return aManaged.sort_order - bManaged.sort_order;
      if (aManaged) return -1;
      if (bManaged) return 1;
      return b.count - a.count;
    });
  })();

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="rounded-2xl bg-card p-5 animate-pulse space-y-3 border border-border/10">
            <Skeleton className="w-12 h-12 rounded-full" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-3 w-14" />
          </div>
        ))}
      </div>
    );
  }

  const CategoryIcon = ({ imageUrl, iconColor, IconComp }: { imageUrl?: string | null; iconColor: string; IconComp: any }) => {
    const [imgError, setImgError] = useState(false);
    const handleError = useCallback(() => setImgError(true), []);

    if (imageUrl && !imgError) {
      return (
        <div className="w-12 h-12 rounded-full flex items-center justify-center overflow-hidden bg-secondary border border-border/15">
          <img src={imageUrl} alt="" className="w-full h-full object-contain p-1.5" onError={handleError} loading="lazy" />
        </div>
      );
    }

    return (
      <div className={cn("w-12 h-12 rounded-full flex items-center justify-center bg-secondary")}>
        <IconComp className={cn("w-5 h-5", iconColor)} strokeWidth={1.3} />
      </div>
    );
  };

  if (!categories || categories.length === 0) return null;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {categories.map((cat) => {
        const IconComp = getCategoryIcon(cat.name, cat.name);
        const iconColor = getCategoryIconColor(cat.name, cat.name);

        return (
          <button
            key={cat.name}
            onClick={() => onCategoryClick(cat.name)}
            className={cn(
              "rounded-2xl border border-border/15 bg-card",
              "p-4 sm:p-5 text-left transition-all duration-200 group",
              "hover:border-primary/15 hover:bg-secondary/30",
              "min-h-[140px] flex flex-col relative",
              "active:scale-[0.98]"
            )}
          >
            {/* Count badge */}
            <span className="absolute top-3.5 right-3.5 text-[10px] font-semibold tabular-nums text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
              {cat.count}
            </span>

            <div className="mb-3">
              <CategoryIcon imageUrl={cat.image_url} iconColor={iconColor} IconComp={IconComp} />
            </div>

            <p className="text-[13px] font-semibold text-foreground line-clamp-2 mb-auto leading-snug group-hover:text-primary transition-colors">{cat.name}</p>

            {cat.sampleProducts.length > 0 && (
              <div className="mt-2.5 pt-2 border-t border-border/10 space-y-0.5">
                {cat.sampleProducts.slice(0, 2).map((name, j) => (
                  <p key={j} className="text-[10px] text-muted-foreground/50 truncate">{name}</p>
                ))}
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
