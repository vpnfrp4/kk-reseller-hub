import { Skeleton } from "@/components/ui/skeleton";

interface ProductCardSkeletonProps {
  index: number;
}

export default function ProductCardSkeleton({ index }: ProductCardSkeletonProps) {
  return (
    <div
      className="rounded-xl border border-border bg-card overflow-hidden opacity-0 animate-stagger-in"
      style={{ animationDelay: `${index * 0.03}s` }}
    >
      <div className="p-5 sm:p-6 space-y-4">
        {/* Identity row */}
        <div className="flex items-start justify-between">
          <div className="space-y-1.5 flex-1">
            <Skeleton className="h-4 w-3/5 rounded" />
            <Skeleton className="h-3 w-2/5 rounded" />
          </div>
          <Skeleton className="w-16 h-6 rounded-md" />
        </div>
        {/* Pricing row */}
        <Skeleton className="h-16 w-full rounded-lg" />
        {/* Actions row */}
        <div className="flex items-center justify-between">
          <Skeleton className="h-3 w-32 rounded" />
          <div className="flex gap-2">
            <Skeleton className="h-8 w-20 rounded-lg" />
            <Skeleton className="h-8 w-20 rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}
