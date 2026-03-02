import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Smartphone,
  Wifi,
  Key,
  Monitor,
  Globe,
  Zap,
  Package,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface QuickService {
  name: string;
  icon: React.ElementType;
  category: string;
  color: string;
  count: number;
}

const CATEGORY_ICONS: Record<string, { icon: React.ElementType; color: string }> = {
  imei: { icon: Smartphone, color: "text-primary" },
  vpn: { icon: Wifi, color: "text-emerald-500" },
  subscription: { icon: Key, color: "text-blue-500" },
  streaming: { icon: Monitor, color: "text-purple-500" },
  server: { icon: Globe, color: "text-orange-500" },
  default: { icon: Zap, color: "text-primary" },
};

function getCategoryMeta(category: string) {
  const lower = category.toLowerCase();
  if (lower.includes("imei") || lower.includes("unlock")) return CATEGORY_ICONS.imei;
  if (lower.includes("vpn")) return CATEGORY_ICONS.vpn;
  if (lower.includes("subscri") || lower.includes("key") || lower.includes("license")) return CATEGORY_ICONS.subscription;
  if (lower.includes("stream") || lower.includes("netflix") || lower.includes("spotify")) return CATEGORY_ICONS.streaming;
  if (lower.includes("server") || lower.includes("credit")) return CATEGORY_ICONS.server;
  return CATEGORY_ICONS.default;
}

export default function QuickServiceHub() {
  const navigate = useNavigate();

  const { data: services, isLoading } = useQuery({
    queryKey: ["quick-services-hub"],
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("id, name, category, product_type")
        .gt("stock", 0)
        .order("sort_order")
        .limit(200);

      if (!data) return [];

      const categoryMap: Record<string, { count: number; firstId: string; name: string }> = {};
      data.forEach((p) => {
        const cat = p.category || p.product_type || "Other";
        if (!categoryMap[cat]) {
          categoryMap[cat] = { count: 0, firstId: p.id, name: cat };
        }
        categoryMap[cat].count++;
      });

      return Object.values(categoryMap)
        .sort((a, b) => b.count - a.count)
        .slice(0, 8)
        .map((cat) => {
          const meta = getCategoryMeta(cat.name);
          return {
            name: cat.name,
            icon: meta.icon || Package,
            color: meta.color,
            category: cat.name,
            count: cat.count,
          } as QuickService;
        });
    },
    staleTime: 60000,
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-4 w-28 rounded bg-secondary" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="glass-card p-4 flex flex-col items-center gap-2.5 min-h-[100px]">
              <Skeleton className="w-11 h-11 rounded-xl bg-secondary" />
              <Skeleton className="h-3 w-16 rounded bg-secondary" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!services || services.length === 0) return null;

  return (
    <div className="space-y-3">
      <h3 className="text-[11px] font-bold uppercase tracking-[0.15em] text-muted-foreground">
        Quick Services
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {services.map((service, i) => {
          const IconComponent = service.icon || Package;
          return (
            <button
              key={service.category}
              onClick={() => navigate("/dashboard/products")}
              className={cn(
                "glass-card flex flex-col items-center justify-center gap-2.5 text-center",
                "min-h-[110px] p-4",
                "border border-border/40 rounded-[var(--radius-card)]",
                "transition-all duration-200",
                "hover:border-primary/30 hover:bg-primary/[0.03] hover:-translate-y-0.5 hover:shadow-[0_4px_16px_rgba(212,175,55,0.08)]",
                "active:translate-y-0 active:shadow-none",
                "group cursor-pointer",
                "opacity-0 animate-stagger-in"
              )}
              style={{ animationDelay: `${0.05 + i * 0.04}s` }}
            >
              <div className="w-11 h-11 aspect-square rounded-xl bg-secondary flex items-center justify-center shrink-0 transition-all duration-200 group-hover:bg-primary/10 group-hover:shadow-[0_0_12px_rgba(212,175,55,0.1)]">
                <IconComponent
                  className={cn("w-5 h-5 transition-colors", service.color, "group-hover:text-primary")}
                  strokeWidth={1.5}
                />
              </div>
              <div className="space-y-0.5 w-full min-w-0 px-1">
                <p className="text-xs font-semibold text-foreground leading-tight line-clamp-2">
                  {service.name}
                </p>
                <p className="text-[10px] text-muted-foreground font-mono tabular-nums">
                  {service.count} {service.count === 1 ? "service" : "services"}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}