import { Skeleton } from "@/components/ui/skeleton";

interface ProductCardSkeletonProps {
  index: number;
}

export default function ProductCardSkeleton({ index }: ProductCardSkeletonProps) {
  return (
    <div
      className="opacity-0 animate-stagger-in rounded-2xl border border-border/30 bg-card/70 backdrop-blur-sm overflow-hidden"
      style={{ animationDelay: `${index * 0.05}s` }}
    >
      <div className="h-[2px] bg-gradient-to-r from-transparent via-border/20 to-transparent" />
      <div className="p-5 space-y-3.5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-4/5 rounded-md" />
            <Skeleton className="h-3 w-1/3 rounded-md" />
          </div>
          <Skeleton className="w-14 h-6 rounded-lg" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-5 w-20 rounded-md" />
          <Skeleton className="h-5 w-14 rounded-md" />
        </div>
        <div className="pt-3 border-t border-border/15 flex items-end justify-between">
          <Skeleton className="h-7 w-28 rounded-md" />
          <div className="flex gap-1.5">
            <Skeleton className="h-9 w-20 rounded-xl" />
            <Skeleton className="h-9 w-9 rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}
