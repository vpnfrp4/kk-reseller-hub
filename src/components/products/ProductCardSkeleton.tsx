import { Skeleton } from "@/components/ui/skeleton";

interface ProductCardSkeletonProps {
  index: number;
}

export default function ProductCardSkeleton({ index }: ProductCardSkeletonProps) {
  return (
    <div
      className="flex flex-col rounded-2xl border border-border/60 bg-card overflow-hidden opacity-0 animate-stagger-in shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
      style={{ animationDelay: `${index * 0.04}s` }}
    >
      {/* Image skeleton */}
      <Skeleton className="h-[160px] w-full rounded-none" />

      {/* Content skeleton */}
      <div className="p-5 space-y-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1.5 flex-1">
            <Skeleton className="h-4 w-3/4 rounded" />
            <Skeleton className="h-3 w-1/3 rounded" />
          </div>
          <Skeleton className="w-14 h-5 rounded-lg" />
        </div>
        <Skeleton className="h-7 w-28 rounded" />
        <Skeleton className="h-3 w-36 rounded" />
        <div className="pt-2">
          <Skeleton className="h-10 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}
