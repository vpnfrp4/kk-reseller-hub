/**
 * Skeleton placeholder shown during lazy-loaded page transitions.
 * Mirrors a typical dashboard page structure: heading + stat cards + table rows.
 */
export default function PageSkeleton() {
  return (
    <div className="animate-fade-in space-y-6 p-1">
      {/* Page heading skeleton */}
      <div className="space-y-2">
        <div className="h-6 w-40 rounded-lg bg-muted animate-pulse" />
        <div className="h-3.5 w-64 rounded-md bg-muted/60 animate-pulse" />
      </div>

      {/* Stat cards row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-card border border-border/40 bg-card/50 p-4 space-y-3"
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <div className="flex items-center justify-between">
              <div className="h-3 w-16 rounded bg-muted/70 animate-pulse" />
              <div className="h-8 w-8 rounded-lg bg-muted/40 animate-pulse" />
            </div>
            <div className="h-6 w-24 rounded-md bg-muted animate-pulse" />
            <div className="h-2.5 w-20 rounded bg-muted/50 animate-pulse" />
          </div>
        ))}
      </div>

      {/* Content area — table-like rows */}
      <div className="rounded-card border border-border/40 bg-card/50 overflow-hidden">
        {/* Table header */}
        <div className="flex items-center gap-4 px-4 py-3 border-b border-border/30">
          {[80, 120, 100, 60].map((w, i) => (
            <div
              key={i}
              className="h-3 rounded bg-muted/50 animate-pulse"
              style={{ width: w }}
            />
          ))}
        </div>
        {/* Table rows */}
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 px-4 py-3.5 border-b border-border/20 last:border-b-0"
            style={{ animationDelay: `${(i + 4) * 60}ms` }}
          >
            <div className="h-8 w-8 rounded-lg bg-muted/40 animate-pulse shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3.5 w-3/4 rounded bg-muted/60 animate-pulse" />
              <div className="h-2.5 w-1/2 rounded bg-muted/40 animate-pulse" />
            </div>
            <div className="h-6 w-16 rounded-full bg-muted/50 animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}
