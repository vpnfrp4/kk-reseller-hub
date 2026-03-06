import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { getCategoryIcon, getCategoryIconColor } from "@/lib/category-icons";
import { ArrowRight } from "lucide-react";

interface CategoryCardData {
  name: string;
  count: number;
  sampleProducts: string[];
}

interface CategoryCardsOverviewProps {
  onCategoryClick: (category: string) => void;
}

export default function CategoryCardsOverview({ onCategoryClick }: CategoryCardsOverviewProps) {
  const { data: categories, isLoading } = useQuery({
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
        .sort(([, a], [, b]) => b.count - a.count)
        .map(([name, data]): CategoryCardData => ({
          name,
          count: data.count,
          sampleProducts: data.samples,
        }));
    },
    staleTime: 60000,
  });

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
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {categories.map((cat, i) => {
        const IconComp = getCategoryIcon(cat.name, cat.name);
        const iconColor = getCategoryIconColor(cat.name, cat.name);

        return (
          <button
            key={cat.name}
            onClick={() => onCategoryClick(cat.name)}
            className={cn(
              "relative overflow-hidden rounded-card border border-border/40 bg-card",
              "p-4 text-left transition-all duration-300 group",
              "hover:border-primary/25 hover:shadow-elevated hover:-translate-y-1",
              "active:scale-[0.97]",
              "opacity-0 animate-stagger-in"
            )}
            style={{ animationDelay: `${i * 0.04}s` }}
          >
            {/* Subtle gradient accent */}
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-primary/40 via-accent/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

            <div className={cn(
              "w-11 h-11 rounded-xl flex items-center justify-center mb-3",
              "transition-all duration-200 group-hover:scale-110",
              iconColor
            )}>
              <IconComp className="w-5 h-5" strokeWidth={1.8} />
            </div>

            <p className="text-xs font-bold text-foreground line-clamp-1 mb-0.5">{cat.name}</p>

            <div className="flex items-center justify-between">
              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-primary/8 text-[10px] font-bold font-mono tabular-nums text-primary">
                {cat.count}
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/30 group-hover:text-primary group-hover:translate-x-0.5 transition-all duration-200" />
            </div>

            {/* Sample products tooltip */}
            {cat.sampleProducts.length > 0 && (
              <div className="mt-2 pt-2 border-t border-border/20">
                {cat.sampleProducts.slice(0, 2).map((name, j) => (
                  <p key={j} className="text-[10px] text-muted-foreground/60 truncate leading-relaxed">
                    • {name}
                  </p>
                ))}
                {cat.count > 2 && (
                  <p className="text-[10px] text-primary/60 font-medium mt-0.5">
                    +{cat.count - 2} more
                  </p>
                )}
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
