import { Skeleton } from "@/components/ui/skeleton";

interface ProductCardSkeletonProps {
  index: number;
}

export default function ProductCardSkeleton({ index }: ProductCardSkeletonProps) {
  return (
    <div
      className="bg-card border border-border rounded-2xl p-5 flex flex-col"
      style={{
        animationDelay: `${index * 0.04}s`,
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
      }}
    >
      <div className="flex items-start justify-between mb-4">
        <Skeleton className="w-12 h-12 rounded-xl" />
        <Skeleton className="w-20 h-5 rounded-lg" />
      </div>
      <Skeleton className="h-5 w-3/4 rounded mb-2" />
      <Skeleton className="h-4 w-1/3 rounded mb-5" />
      <div className="mt-auto space-y-3">
        <div className="flex items-end justify-between">
          <div className="space-y-1.5">
            <Skeleton className="h-3 w-20 rounded" />
            <Skeleton className="h-7 w-28 rounded" />
          </div>
          <Skeleton className="h-3 w-16 rounded" />
        </div>
        <Skeleton className="h-11 w-full rounded-xl" />
      </div>
    </div>
  );
}
