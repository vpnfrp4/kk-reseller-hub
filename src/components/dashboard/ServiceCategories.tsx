import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { getCategoryIcon, getCategoryIconColor } from "@/lib/category-icons";
import { ArrowRight } from "lucide-react";

export default function ServiceCategories() {
  const navigate = useNavigate();

  const { data: categories, isLoading } = useQuery({
    queryKey: ["service-categories-dashboard"],
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("category")
        .gt("stock", 0);

      if (!data) return [];

      const counts: Record<string, number> = {};
      data.forEach((p) => {
        const cat = p.category || "Other";
        counts[cat] = (counts[cat] || 0) + 1;
      });

      return Object.entries(counts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 6)
        .map(([name, count]) => ({ name, count }));
    },
    staleTime: 60000,
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-5 w-40" />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="rounded-card border border-border/50 bg-card p-4 animate-pulse h-24">
              <Skeleton className="w-10 h-10 rounded-xl mb-2" />
              <Skeleton className="h-3 w-20" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!categories || categories.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="w-1 h-5 rounded-full bg-gradient-to-b from-accent to-primary" />
        <h2 className="text-sm lg:text-base font-bold text-foreground">Service Categories</h2>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {categories.map((cat, i) => {
          const IconComp = getCategoryIcon(cat.name, cat.name);
          const iconColor = getCategoryIconColor(cat.name, cat.name);

          return (
            <button
              key={cat.name}
              onClick={() => navigate("/dashboard/place-order")}
              className={cn(
                "relative overflow-hidden rounded-card border border-border/50 bg-card",
                "p-4 text-left transition-all duration-300 group",
                "hover:border-primary/20 hover:shadow-elevated hover:-translate-y-0.5",
                "active:scale-[0.98]",
                "opacity-0 animate-stagger-in"
              )}
              style={{ animationDelay: `${0.15 + i * 0.05}s` }}
            >
              <div
                className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center mb-2.5",
                  "transition-all duration-200 group-hover:scale-105",
                  iconColor
                )}
              >
                <IconComp className="w-5 h-5" strokeWidth={1.8} />
              </div>
              <p className="text-xs font-bold text-foreground line-clamp-1">{cat.name}</p>
              <div className="flex items-center justify-between mt-1">
                <p className="text-[10px] font-mono text-muted-foreground">
                  {cat.count} {cat.count === 1 ? "service" : "services"}
                </p>
                <ArrowRight className="w-3 h-3 text-muted-foreground/40 group-hover:text-primary transition-colors" />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
