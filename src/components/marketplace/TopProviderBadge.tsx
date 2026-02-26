import { cn } from "@/lib/utils";
import { ShieldCheck, Star } from "lucide-react";

interface TopProviderBadgeProps {
  isVerified?: boolean;
  isTopProvider?: boolean;
  rating?: number;
  className?: string;
  compact?: boolean;
}

export default function TopProviderBadge({
  isVerified = false,
  isTopProvider = false,
  rating = 0,
  className,
  compact = false,
}: TopProviderBadgeProps) {
  if (!isVerified && !isTopProvider) return null;

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      {isTopProvider && (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-500 border border-amber-500/20">
          <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
          {!compact && "Top Provider"}
        </span>
      )}
      {isVerified && (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
          <ShieldCheck className="w-3 h-3" />
          {!compact && "Verified"}
        </span>
      )}
    </div>
  );
}
