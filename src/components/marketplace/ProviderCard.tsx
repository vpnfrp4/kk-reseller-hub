import { cn } from "@/lib/utils";
import { Star, ShieldCheck, TrendingUp, User } from "lucide-react";
import TopProviderBadge from "./TopProviderBadge";

interface ProviderCardProps {
  provider: {
    id: string;
    name: string;
    avg_rating?: number;
    total_reviews?: number;
    total_completed?: number;
    success_rate?: number;
    is_verified?: boolean;
    fulfillment_type?: string;
  };
  /** Whether this provider has the highest rating */
  isTop?: boolean;
  className?: string;
}

export default function ProviderCard({ provider, isTop = false, className }: ProviderCardProps) {
  const rating = provider.avg_rating || 0;
  const successRate = provider.success_rate || 0;
  const completed = provider.total_completed || 0;
  const reviews = provider.total_reviews || 0;

  return (
    <div className={cn("glass-card p-4 space-y-3", className)}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-muted/40 border border-border/40 flex items-center justify-center shrink-0">
            <User className="w-5 h-5 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">{provider.name}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
              {provider.fulfillment_type === "api" ? "Automated" : "Manual"} Provider
            </p>
          </div>
        </div>
        <TopProviderBadge
          isVerified={provider.is_verified}
          isTopProvider={isTop}
          compact
        />
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-3 pt-3 border-t border-border/30">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-0.5">Rating</p>
          <div className="flex items-center gap-1">
            <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
            <span className="text-sm font-bold text-foreground font-mono">{rating > 0 ? rating : "—"}</span>
            <span className="text-[10px] text-muted-foreground">({reviews})</span>
          </div>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-0.5">Success</p>
          <span className={cn(
            "text-sm font-bold font-mono",
            successRate >= 95 ? "text-primary" : successRate >= 80 ? "text-amber-500" : "text-destructive"
          )}>
            {successRate}%
          </span>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-0.5">Completed</p>
          <div className="flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-muted-foreground" />
            <span className="text-sm font-bold text-foreground font-mono">{completed.toLocaleString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
