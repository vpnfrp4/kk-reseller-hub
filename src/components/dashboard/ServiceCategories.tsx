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
        .slice(0, 8)
        .map(([name, count]) => ({ name, count }));
    },
    staleTime: 60000,
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-5 w-28" />
        <div className="flex gap-5 overflow-x-auto pb-1">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex flex-col items-center gap-2 shrink-0">
              <Skeleton className="w-[60px] h-[60px] rounded-full" />
              <Skeleton className="h-3 w-12" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!categories || categories.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-[15px] font-semibold text-foreground">Categories</h2>
        <button
          onClick={() => navigate("/dashboard/place-order")}
          className="text-xs font-medium text-primary flex items-center gap-1 hover:text-primary/80 transition-colors"
        >
          See All
        </button>
      </div>

      {/* Horizontal scroll — circular icons like BNPL reference */}
      <div className="flex gap-5 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1">
        {categories.map((cat) => {
          const IconComp = getCategoryIcon(cat.name, cat.name);
          const iconColor = getCategoryIconColor(cat.name, cat.name);

          return (
            <button
              key={cat.name}
              onClick={() => navigate(`/dashboard/place-order/${encodeURIComponent(cat.name)}`)}
              className="flex flex-col items-center gap-1.5 shrink-0 min-w-[60px] group"
            >
              <div
                className={cn(
                  "w-[60px] h-[60px] rounded-full flex items-center justify-center",
                  "bg-secondary border border-border/20 transition-all duration-200",
                  "group-hover:border-primary/20 group-active:scale-95"
                )}
              >
                <IconComp className={cn("w-6 h-6", iconColor)} strokeWidth={1.3} />
              </div>
              <span className="text-[11px] font-medium text-foreground text-center line-clamp-1 max-w-[68px]">
                {cat.name}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
