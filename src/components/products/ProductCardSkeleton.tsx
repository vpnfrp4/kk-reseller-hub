import { Skeleton } from "@/components/ui/skeleton";

interface ProductCardSkeletonProps {
  index: number;
}

export default function ProductCardSkeleton({ index }: ProductCardSkeletonProps) {
  return (
    <div
      className="glass-card p-card flex flex-col opacity-0 animate-stagger-in"
      style={{ animationDelay: `${index * 0.04}s` }}
    >
      <div className="flex items-start justify-between mb-compact">
        <div className="space-y-1.5 flex-1">
          <Skeleton className="h-4 w-3/4 rounded" />
          <Skeleton className="h-3 w-1/3 rounded" />
        </div>
        <Skeleton className="w-14 h-5 rounded-md" />
      </div>
      <Skeleton className="h-3 w-20 rounded mb-compact" />
      <div className="mt-auto space-y-compact pt-card">
        <Skeleton className="h-7 w-28 rounded" />
        <Skeleton className="h-3 w-36 rounded" />
        <Skeleton className="h-10 w-full rounded-xl" />
      </div>
    </div>
  );
}
