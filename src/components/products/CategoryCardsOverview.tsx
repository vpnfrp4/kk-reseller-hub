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

const container = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.045, delayChildren: 0.05 } },
};
const item = {
  hidden: { opacity: 0, y: 18, scale: 0.96 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
};

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

    // Hide IMEI Check category
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
          <div key={i} className="rounded-2xl border border-border/30 bg-card p-4 sm:p-5 animate-pulse space-y-3">
            <Skeleton className="w-12 h-12 rounded-xl" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-16" />
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
        <div className={cn(
          "w-12 h-12 rounded-xl flex items-center justify-center overflow-hidden",
          "transition-all duration-300 group-hover:scale-110 group-hover:rotate-3",
          "bg-secondary/40 border border-border/20"
        )}>
          <img
            src={imageUrl}
            alt=""
            className="w-full h-full object-contain p-1.5"
            onError={handleError}
            loading="lazy"
          />
        </div>
      );
    }

    return (
      <div className={cn(
        "w-12 h-12 rounded-xl flex items-center justify-center relative",
        "transition-all duration-300 group-hover:scale-110 group-hover:rotate-3",
        iconColor
      )}>
        <IconComp className="w-5 h-5 relative z-10" strokeWidth={1.7} />
        {/* Icon inner glow */}
        <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
          style={{ boxShadow: "inset 0 0 12px hsl(var(--primary) / 0.15)" }} />
      </div>
    );
  };

  if (!categories || categories.length === 0) return null;

  return (
    <motion.div
      className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3"
      variants={container}
      initial="hidden"
      animate="visible"
    >
      {categories.map((cat) => {
        const IconComp = getCategoryIcon(cat.name, cat.name);
        const iconColor = getCategoryIconColor(cat.name, cat.name);

        return (
          <motion.button
            key={cat.name}
            variants={item}
            whileHover={{ y: -4, transition: { duration: 0.25, ease: [0.22, 1, 0.36, 1] } }}
            whileTap={{ scale: 0.97 }}
            onClick={() => onCategoryClick(cat.name)}
            className={cn(
              "relative overflow-hidden rounded-2xl border border-border/30 bg-card/90",
              "p-4 sm:p-5 text-left transition-all duration-300 group",
              "hover:border-primary/30",
              "hover:shadow-[0_8px_32px_-8px_hsl(var(--primary)/0.15),0_0_0_1px_hsl(var(--primary)/0.08)]",
              "min-h-[148px] sm:min-h-[160px] flex flex-col",
              "backdrop-blur-sm"
            )}
          >
            {/* Animated corner glow */}
            <div className="absolute -top-20 -right-20 w-40 h-40 rounded-full bg-primary/[0.03] blur-3xl opacity-0 group-hover:opacity-100 transition-all duration-700 pointer-events-none group-hover:bg-primary/[0.08]" />
            <div className="absolute -bottom-16 -left-16 w-32 h-32 rounded-full bg-primary-glow/[0.02] blur-2xl opacity-0 group-hover:opacity-100 transition-all duration-700 delay-100 pointer-events-none" />

            {/* Top accent line with glow */}
            <div className="absolute top-0 left-0 right-0 h-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <div className="h-full bg-gradient-to-r from-primary/60 via-primary/30 to-transparent" />
              <div className="h-1 bg-gradient-to-r from-primary/20 via-transparent to-transparent blur-sm -mt-0.5" />
            </div>

            {/* Badge — top-right */}
            <div className="absolute top-3.5 right-3.5 flex items-center gap-1.5">
              {cat.isApi && (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-success/8 border border-success/15 text-[9px] font-bold text-success uppercase tracking-wider">
                  <Wifi className="w-2.5 h-2.5" />
                  API
                </span>
              )}
              <span className="inline-flex items-center justify-center min-w-[24px] h-[24px] px-1.5 rounded-lg bg-primary/8 text-[10px] font-bold font-mono tabular-nums text-primary border border-primary/12 group-hover:bg-primary/15 group-hover:border-primary/25 transition-all duration-300">
                {cat.count}
              </span>
            </div>

            <div className="mb-3">
              <CategoryIcon imageUrl={cat.image_url} iconColor={iconColor} IconComp={IconComp} />
            </div>

            <p className="text-[13px] sm:text-sm font-bold text-foreground line-clamp-2 mb-auto leading-snug font-display group-hover:text-primary/90 transition-colors duration-300">{cat.name}</p>

            {/* Sample products */}
            {cat.sampleProducts.length > 0 && (
              <div className="mt-2.5 pt-2 border-t border-border/15 space-y-0.5 group-hover:border-primary/10 transition-colors">
                {cat.sampleProducts.slice(0, 2).map((name, j) => (
                  <p key={j} className="text-[10px] text-muted-foreground/45 truncate leading-relaxed">
                    {name}
                  </p>
                ))}
                {cat.count > 2 && (
                  <p className="text-[10px] text-primary/50 font-semibold mt-0.5 group-hover:text-primary/70 transition-colors">
                    +{cat.count - 2} more
                  </p>
                )}
              </div>
            )}

            {/* Hover arrow with glow */}
            <div className="absolute bottom-3.5 right-3.5 w-7 h-7 rounded-lg bg-primary/8 flex items-center justify-center opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all duration-300 group-hover:shadow-[0_0_12px_hsl(var(--primary)/0.15)]">
              <ArrowRight className="w-3.5 h-3.5 text-primary" />
            </div>
          </motion.button>
        );
      })}
    </motion.div>
  );
}
