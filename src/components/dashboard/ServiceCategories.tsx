import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { getCategoryIcon, getCategoryIconColor } from "@/lib/category-icons";
import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

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
        <Skeleton className="h-5 w-32" />
        <div className="flex gap-5 overflow-x-auto pb-1">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex flex-col items-center gap-2 shrink-0">
              <Skeleton className="w-14 h-14 rounded-full" />
              <Skeleton className="h-3 w-12" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!categories || categories.length === 0) return null;

  return (
    <motion.div
      className="space-y-3"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.2 }}
    >
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-foreground">Categories</h2>
        <button
          onClick={() => navigate("/dashboard/place-order")}
          className="text-xs font-bold text-primary flex items-center gap-1 hover:text-primary/80 transition-colors"
        >
          See All <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Horizontal scrollable circular icons — like BNPL reference */}
      <div className="flex gap-4 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1">
        {categories.map((cat, i) => {
          const IconComp = getCategoryIcon(cat.name, cat.name);
          const iconColor = getCategoryIconColor(cat.name, cat.name);

          return (
            <button
              key={cat.name}
              onClick={() => navigate(`/dashboard/place-order/${encodeURIComponent(cat.name)}`)}
              className="flex flex-col items-center gap-1.5 shrink-0 group min-w-[64px]"
            >
              <div
                className={cn(
                  "w-14 h-14 rounded-full flex items-center justify-center",
                  "border border-border/40 bg-card transition-all duration-200",
                  "group-hover:border-primary/30 group-hover:shadow-md",
                  "active:scale-95"
                )}
                style={{ boxShadow: "var(--shadow-card)" }}
              >
                <IconComp className={cn("w-6 h-6", iconColor)} strokeWidth={1.5} />
              </div>
              <span className="text-[11px] font-semibold text-foreground text-center line-clamp-1 max-w-[72px]">
                {cat.name}
              </span>
            </button>
          );
        })}
      </div>
    </motion.div>
  );
}
