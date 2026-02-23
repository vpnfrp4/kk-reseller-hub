import { Skeleton } from "@/components/ui/skeleton";

interface ProductCardSkeletonProps {
  index: number;
}

export default function ProductCardSkeleton({ index }: ProductCardSkeletonProps) {
  return (
    <div className="glass-card p-6 flex flex-col animate-fade-in" style={{ animationDelay: `${index * 0.05}s` }}>
      <div className="flex items-start justify-between mb-4">
        <Skeleton className="w-12 h-12 rounded-2xl" />
        <Skeleton className="w-20 h-5 rounded-full" />
      </div>
      <Skeleton className="h-5 w-3/4 rounded mb-2" />
      <Skeleton className="h-4 w-1/3 rounded mb-4" />
      <div className="mt-auto space-y-3">
        <div className="flex items-end justify-between">
          <div className="space-y-1.5">
            <Skeleton className="h-3 w-20 rounded" />
            <Skeleton className="h-6 w-28 rounded" />
          </div>
          <Skeleton className="h-3 w-14 rounded" />
        </div>
        <Skeleton className="h-10 w-full rounded-lg" />
      </div>
    </div>
  );
}
