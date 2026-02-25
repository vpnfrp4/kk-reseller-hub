import { Skeleton } from "@/components/ui/skeleton";

interface ProductCardSkeletonProps {
  index: number;
}

export default function ProductCardSkeleton({ index }: ProductCardSkeletonProps) {
  return (
    <div
      className="glass-card overflow-hidden opacity-0 animate-stagger-in"
      style={{ animationDelay: `${index * 0.07}s` }}
    >
      <div className="p-5 md:p-6 space-y-5">
        {/* Row 1: Service Identity */}
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2 flex-1">
            <Skeleton className="h-5 md:h-6 w-3/5 rounded bg-muted/30" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-14 rounded-md bg-muted/25" />
              <Skeleton className="h-3 w-16 rounded bg-muted/15" />
            </div>
          </div>
          <Skeleton className="w-20 h-6 rounded-[var(--radius-btn)] bg-muted/25" />
        </div>

        {/* Row 2: Pricing — with border-t separator */}
        <div className="grid grid-cols-3 gap-4 md:gap-6 pt-4 border-t border-border/30">
          <div className="space-y-1.5">
            <Skeleton className="h-2.5 w-16 rounded bg-muted/20" />
            <Skeleton className="h-7 md:h-8 w-20 rounded bg-muted/30" />
          </div>
          <div className="space-y-1.5">
            <Skeleton className="h-2.5 w-12 rounded bg-muted/20" />
            <Skeleton className="h-5 md:h-6 w-16 rounded bg-muted/20" />
          </div>
          <div className="space-y-1.5">
            <Skeleton className="h-2.5 w-14 rounded bg-muted/20" />
            <Skeleton className="h-5 md:h-6 w-16 rounded bg-muted/25" />
          </div>
        </div>

        {/* Row 3: Actions */}
        <div className="flex items-center justify-between pt-1">
          <Skeleton className="h-3 w-32 rounded bg-muted/15" />
          <div className="flex gap-2">
            <Skeleton className="h-9 w-22 rounded-[var(--radius-btn)] bg-muted/30" />
            <Skeleton className="h-9 w-20 rounded-[var(--radius-btn)] bg-muted/20" />
          </div>
        </div>
      </div>
    </div>
  );
}
