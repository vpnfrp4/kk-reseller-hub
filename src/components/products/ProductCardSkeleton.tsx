import { Skeleton } from "@/components/ui/skeleton";

interface ProductCardSkeletonProps {
  index: number;
}

export default function ProductCardSkeleton({ index }: ProductCardSkeletonProps) {
  return (
    <div
      className="opacity-0 animate-stagger-in rounded-[var(--radius-card)] border border-border/40 bg-card overflow-hidden"
      style={{ animationDelay: `${index * 0.05}s` }}
    >
      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-4 w-4/5 rounded" />
            <Skeleton className="h-3 w-1/3 rounded" />
          </div>
          <Skeleton className="w-14 h-5 rounded" />
        </div>
        <div className="flex gap-3">
          <Skeleton className="h-3 w-20 rounded" />
          <Skeleton className="h-3 w-12 rounded" />
        </div>
        <div className="pt-2 border-t border-border/20 flex items-end justify-between">
          <Skeleton className="h-6 w-24 rounded" />
          <div className="flex gap-1.5">
            <Skeleton className="h-8 w-16 rounded-[var(--radius-btn)]" />
            <Skeleton className="h-8 w-8 rounded-[var(--radius-btn)]" />
          </div>
        </div>
      </div>
    </div>
  );
}
