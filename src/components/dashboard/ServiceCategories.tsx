import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { getCategoryIcon, getCategoryIconColor } from "@/lib/category-icons";
import { cn } from "@/lib/utils";

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
      <div className="cd-card cd-reveal">
        <Skeleton className="h-5 w-28 mb-3" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-20 rounded-[0.92rem]" />
          ))}
        </div>
      </div>
    );
  }

  if (!categories || categories.length === 0) return null;

  return (
    <div className="cd-card cd-reveal">
      <div className="cd-section-title">
        <h2>Categories</h2>
        <span
          className="text-primary cursor-pointer hover:underline"
          onClick={() => navigate("/dashboard/place-order")}
        >
          See all →
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {categories.map((cat) => {
          const IconComp = getCategoryIcon(cat.name, cat.name);
          const iconColor = getCategoryIconColor(cat.name, cat.name);

          return (
            <button
              key={cat.name}
              onClick={() => navigate(`/dashboard/place-order/${encodeURIComponent(cat.name)}`)}
              className="cd-service-card flex flex-col items-center gap-2 py-3"
            >
              <div className="w-10 h-10 rounded-xl grid place-items-center bg-secondary">
                <IconComp className={cn("w-5 h-5", iconColor)} strokeWidth={1.3} />
              </div>
              <div className="text-center">
                <strong className="text-[0.82rem] font-semibold block">{cat.name}</strong>
                <p className="text-[0.7rem] text-muted-foreground">{cat.count} items</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
