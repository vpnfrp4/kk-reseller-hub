import { Skeleton } from "@/components/ui/skeleton";

interface ProductCardSkeletonProps {
  index: number;
}

export default function ProductCardSkeleton({ index }: ProductCardSkeletonProps) {
  return (
    <div
      className="overflow-hidden opacity-0 animate-stagger-in rounded-[var(--radius-card)] border border-border/40"
      style={{
        animationDelay: `${index * 0.07}s`,
        background: "linear-gradient(145deg, #15151C 0%, #111116 100%)",
        boxShadow: "0 6px 16px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.02)",
      }}
    >
      <div className="p-5 md:p-6 space-y-4">
        {/* Row 1: Service Identity */}
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2 flex-1">
            <Skeleton className="h-5 md:h-6 w-3/5 rounded" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-14 rounded-md" />
              <Skeleton className="h-3 w-16 rounded" />
            </div>
          </div>
          <Skeleton className="w-20 h-6 rounded-md" />
        </div>

        {/* Row 2: Stats Grid with separators */}
        <div className="grid grid-cols-2 sm:grid-cols-4 pt-3 border-t border-border/20">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={`px-3 py-1.5 space-y-1.5 ${i < 3 ? "sm:border-r sm:border-border/15" : ""}`}
            >
              <Skeleton className="h-2 w-12 rounded" />
              <Skeleton className="h-5 w-16 rounded" />
            </div>
          ))}
        </div>

        {/* Row 3: Price container + Actions */}
        <div className="flex items-end justify-between gap-4 pt-1">
          <div
            className="space-y-2 rounded-lg px-4 py-3 border border-primary/10"
            style={{ background: "linear-gradient(135deg, hsl(43 65% 52% / 0.04) 0%, transparent 100%)" }}
          >
            <Skeleton className="h-px w-8 rounded bg-primary/30" />
            <Skeleton className="h-2 w-10 rounded" />
            <Skeleton className="h-8 w-28 rounded" />
            <Skeleton className="h-3 w-24 rounded" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-10 w-24 rounded-[var(--radius-btn)]" />
            <Skeleton className="h-10 w-20 rounded-[var(--radius-btn)]" />
          </div>
        </div>
      </div>
    </div>
  );
}
