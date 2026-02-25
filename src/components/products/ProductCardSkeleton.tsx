import { Skeleton } from "@/components/ui/skeleton";

interface ProductCardSkeletonProps {
  index: number;
}

export default function ProductCardSkeleton({ index }: ProductCardSkeletonProps) {
  return (
    <div
      className="glass-card overflow-hidden opacity-0 animate-stagger-in"
      style={{ animationDelay: `${index * 0.03}s` }}
    >
      <div className="p-[var(--space-card)] space-y-[var(--space-default)]">
        {/* Identity row */}
        <div className="flex items-start justify-between">
          <div className="space-y-1.5 flex-1">
            <Skeleton className="h-4 w-3/5 rounded bg-muted/30" />
            <Skeleton className="h-3 w-2/5 rounded bg-muted/20" />
          </div>
          <Skeleton className="w-16 h-6 rounded-[var(--radius-btn)] bg-muted/30" />
        </div>
        {/* Pricing row */}
        <Skeleton className="h-16 w-full rounded-[var(--radius-btn)] bg-muted/20" />
        {/* Actions row */}
        <div className="flex items-center justify-between">
          <Skeleton className="h-3 w-32 rounded bg-muted/20" />
          <div className="flex gap-2">
            <Skeleton className="h-8 w-20 rounded-[var(--radius-btn)] bg-muted/30" />
            <Skeleton className="h-8 w-20 rounded-[var(--radius-btn)] bg-muted/20" />
          </div>
        </div>
      </div>
    </div>
  );
}
