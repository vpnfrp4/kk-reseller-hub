/**
 * Mobile-first skeleton placeholders for lazy-loaded page transitions.
 * Each variant mirrors the real page layout to prevent layout shifts.
 */

import { cn } from "@/lib/utils";

/* ─── Pulse block helper ─── */
function Pulse({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return <div className={cn("rounded-lg bg-muted/50 animate-pulse", className)} style={style} />;
}

/* ═══ HOME SKELETON ═══ */
function HomeSkeleton() {
  return (
    <div className="space-y-4 lg:space-y-6 p-1">
      {/* Mobile greeting */}
      <div className="lg:hidden space-y-1.5">
        <Pulse className="h-3.5 w-28" />
        <Pulse className="h-6 w-44" />
      </div>

      {/* Desktop header */}
      <div className="hidden lg:block rounded-[var(--radius-card)] border border-border/40 bg-card/50 p-5">
        <div className="flex items-center gap-3.5">
          <Pulse className="w-11 h-11 rounded-[var(--radius-card)]" />
          <div className="space-y-2">
            <Pulse className="h-5 w-48" />
            <Pulse className="h-3 w-32" />
          </div>
        </div>
      </div>

      {/* Wallet hero (mobile) */}
      <div className="lg:hidden rounded-[var(--radius-modal)] border border-border/40 bg-card/50 p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Pulse className="w-4 h-4 rounded" />
          <Pulse className="h-3 w-24" />
        </div>
        <Pulse className="h-9 w-40" />
        <Pulse className="h-10 w-32 rounded-[var(--radius-btn)]" />
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 lg:grid-cols-4 gap-2.5 lg:gap-4">
        <div className="hidden lg:block rounded-[var(--radius-card)] border border-border/40 bg-card/50 p-6 space-y-4">
          <div className="flex items-center gap-3">
            <Pulse className="w-11 h-11 rounded-xl" />
            <Pulse className="h-3 w-14" />
          </div>
          <Pulse className="h-8 w-28" />
          <Pulse className="h-3.5 w-20" />
        </div>
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded-[var(--radius-card)] border border-border/40 bg-card/50 p-4 lg:p-6 space-y-2 lg:space-y-4">
            <Pulse className="w-9 h-9 lg:w-11 lg:h-11 rounded-xl" />
            <Pulse className="h-6 lg:h-8 w-10 lg:w-14" />
            <Pulse className="h-2.5 w-12" />
          </div>
        ))}
      </div>

      {/* Quick actions (mobile) */}
      <div className="grid grid-cols-2 gap-2.5 lg:hidden">
        {[0, 1].map((i) => (
          <div key={i} className="rounded-2xl border border-border/40 bg-card/50 p-4 flex items-center gap-3">
            <Pulse className="w-10 h-10 rounded-xl" />
            <div className="space-y-1.5">
              <Pulse className="h-3.5 w-20" />
              <Pulse className="h-2.5 w-16" />
            </div>
          </div>
        ))}
      </div>

      {/* Recent orders */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Pulse className="h-4 w-28" />
          <Pulse className="h-3.5 w-16" />
        </div>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="rounded-2xl border border-border/40 bg-card/50 p-3.5 space-y-2.5" style={{ animationDelay: `${i * 60}ms` }}>
            <div className="flex items-start justify-between">
              <div className="space-y-1.5">
                <Pulse className="h-3.5 w-40" />
                <Pulse className="h-3 w-20" />
              </div>
              <Pulse className="h-5 w-18 rounded-full" />
            </div>
            <div className="flex items-center justify-between pt-2.5 border-t border-border/20">
              <Pulse className="h-3 w-24" />
              <Pulse className="h-3.5 w-20" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══ PLACE ORDER SKELETON ═══ */
function PlaceOrderSkeleton() {
  return (
    <div className="space-y-4 lg:space-y-5 p-1 max-w-5xl mx-auto">
      {/* Header */}
      <div className="rounded-[var(--radius-card)] border border-border/40 bg-card/50 p-4 lg:p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <Pulse className="w-11 h-11 rounded-[var(--radius-card)] hidden lg:block" />
            <div className="space-y-2">
              <Pulse className="h-5 w-28" />
              <Pulse className="h-3 w-44 hidden sm:block" />
            </div>
          </div>
          <Pulse className="h-8 w-36 rounded-[var(--radius-btn)]" />
        </div>
      </div>

      {/* Search bar */}
      <Pulse className="h-12 lg:h-14 w-full rounded-2xl" />

      {/* Group controls */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <Pulse className="w-4 h-4 rounded" />
          <Pulse className="h-3.5 w-28" />
          <Pulse className="h-3 w-32" />
        </div>
        <Pulse className="h-6 w-28" />
      </div>

      {/* Accordion groups */}
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="rounded-[var(--radius-card)] border border-border/40 bg-card/50 overflow-hidden" style={{ animationDelay: `${i * 50}ms` }}>
          <div className="flex items-center gap-3 px-4 py-3.5">
            <Pulse className="w-9 h-9 rounded-xl" />
            <Pulse className="h-3.5 w-32 lg:w-48 flex-1" />
            <Pulse className="h-5 w-8 rounded-full" />
            <Pulse className="w-4 h-4 rounded" />
          </div>
          {i === 0 && (
            <div className="border-t border-border/20 divide-y divide-border/10">
              {[0, 1, 2].map((j) => (
                <div key={j} className="flex items-center gap-3 px-4 py-3">
                  <Pulse className="w-9 h-9 rounded-xl" />
                  <div className="flex-1 space-y-1.5">
                    <Pulse className="h-3.5 w-3/5" />
                    <div className="flex items-center gap-2">
                      <Pulse className="h-4 w-14 rounded-full" />
                      <Pulse className="h-3 w-20" />
                    </div>
                  </div>
                  <Pulse className="h-4 w-16" />
                  <Pulse className="h-7 w-16 rounded-full" />
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/* ═══ ORDERS SKELETON ═══ */
function OrdersSkeleton() {
  return (
    <div className="space-y-4 lg:space-y-5 p-1">
      {/* Breadcrumb */}
      <Pulse className="h-3.5 w-32" />

      {/* Header */}
      <div className="rounded-[var(--radius-card)] border border-border/40 bg-card/50 p-4 lg:p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <Pulse className="w-11 h-11 rounded-[var(--radius-card)]" />
            <div className="space-y-2">
              <Pulse className="h-5 w-32" />
              <Pulse className="h-3 w-52 hidden sm:block" />
            </div>
          </div>
          <Pulse className="h-9 w-28 rounded-[var(--radius-btn)]" />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="rounded-[var(--radius-card)] border border-border/40 bg-card/50 p-4 flex items-center gap-3">
            <Pulse className="w-10 h-10 rounded-xl" />
            <div className="space-y-1.5">
              <Pulse className="h-6 w-10" />
              <Pulse className="h-2.5 w-16" />
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="rounded-[var(--radius-card)] border border-border/40 bg-card/50 p-4">
        <div className="flex flex-wrap gap-3">
          <Pulse className="h-9 flex-1 min-w-[180px] rounded-[var(--radius-input)]" />
          <Pulse className="h-9 w-32 rounded-[var(--radius-input)]" />
          <Pulse className="h-9 w-28 rounded-[var(--radius-input)] hidden lg:block" />
        </div>
      </div>

      {/* Mobile order cards */}
      <div className="md:hidden space-y-2.5">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-[var(--radius-card)] border border-border/40 bg-card/50 p-4 space-y-3" style={{ animationDelay: `${i * 50}ms` }}>
            <div className="flex items-start justify-between">
              <div className="space-y-1.5">
                <Pulse className="h-3.5 w-44" />
                <Pulse className="h-3 w-24" />
              </div>
              <Pulse className="h-5 w-18 rounded-full" />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Pulse className="h-4 w-14 rounded-full" />
                <Pulse className="h-3 w-24" />
              </div>
              <Pulse className="h-4 w-20" />
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-border/20">
              <Pulse className="h-3.5 w-20" />
              <Pulse className="w-4 h-4 rounded" />
            </div>
          </div>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block rounded-[var(--radius-card)] border border-border/40 bg-card/50 overflow-hidden">
        <div className="flex items-center gap-4 px-5 py-3.5 border-b border-border/30">
          {[80, 140, 60, 120, 80, 80, 70, 50].map((w, i) => (
            <Pulse key={i} className="h-3" style={{ width: w }} />
          ))}
        </div>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center gap-4 px-5 py-3.5 border-b border-border/10 last:border-0" style={{ animationDelay: `${i * 40}ms` }}>
            <Pulse className="h-3.5 w-20" />
            <Pulse className="h-3.5 w-36" />
            <Pulse className="h-4 w-14 rounded-full" />
            <Pulse className="h-3.5 w-28" />
            <Pulse className="h-3.5 w-20" />
            <Pulse className="h-3.5 w-24" />
            <Pulse className="h-5 w-20 rounded-full" />
            <Pulse className="h-3.5 w-12" />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══ WALLET SKELETON ═══ */
function WalletSkeleton() {
  return (
    <div className="space-y-5 p-1">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Pulse className="w-10 h-10 rounded-[var(--radius-card)]" />
          <div className="space-y-2">
            <Pulse className="h-5 w-36" />
            <Pulse className="h-3 w-52" />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Pulse className="h-9 w-28 rounded-[var(--radius-card)] hidden sm:block" />
          <Pulse className="h-9 w-20 rounded-[var(--radius-btn)]" />
        </div>
      </div>

      {/* Steps */}
      <div className="flex items-center justify-between px-8">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex flex-col items-center gap-2">
            <Pulse className="w-10 h-10 rounded-full" />
            <Pulse className="h-3 w-20" />
          </div>
        ))}
      </div>

      {/* Quick amounts */}
      <div className="space-y-3">
        <Pulse className="h-3.5 w-28" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {[0, 1, 2, 3].map((i) => (
            <Pulse key={i} className="h-12 rounded-2xl" />
          ))}
        </div>
      </div>

      {/* Payment methods */}
      <div className="space-y-3">
        <Pulse className="h-3.5 w-36" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="rounded-2xl border border-border/40 bg-card/50 p-4 flex items-center gap-3" style={{ animationDelay: `${i * 60}ms` }}>
              <Pulse className="w-12 h-12 rounded-xl" />
              <div className="flex-1 space-y-1.5">
                <Pulse className="h-3.5 w-24" />
                <Pulse className="h-3 w-36" />
              </div>
              <Pulse className="w-5 h-5 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ═══ SETTINGS / ACCOUNT SKELETON ═══ */
function SettingsSkeleton() {
  return (
    <div className="space-y-5 p-1">
      {/* Breadcrumb */}
      <Pulse className="h-3.5 w-36" />

      {/* Header */}
      <div className="space-y-2">
        <Pulse className="h-6 w-28" />
        <Pulse className="h-3.5 w-52" />
      </div>

      {/* Tab bar (mobile) */}
      <div className="flex gap-1.5 overflow-x-auto lg:hidden pb-1">
        {[0, 1, 2, 3, 4].map((i) => (
          <Pulse key={i} className="h-8 w-24 rounded-[var(--radius-btn)] shrink-0" />
        ))}
      </div>

      <div className="flex flex-col lg:flex-row gap-5">
        {/* Sidebar (desktop) */}
        <div className="hidden lg:block w-56 shrink-0">
          <div className="rounded-[var(--radius-card)] border border-border/40 bg-card/50 p-2 space-y-1">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <Pulse key={i} className="h-10 w-full rounded-[var(--radius-btn)]" />
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 max-w-2xl space-y-5">
          {/* Profile card */}
          <div className="rounded-[var(--radius-card)] border border-border/40 bg-card/50 p-5 space-y-4">
            <div className="flex items-center gap-4">
              <Pulse className="w-16 h-16 rounded-full" />
              <div className="space-y-2">
                <Pulse className="h-4 w-32" />
                <Pulse className="h-3 w-48" />
              </div>
            </div>
            <div className="space-y-3 pt-4 border-t border-border/20">
              {[0, 1, 2].map((i) => (
                <div key={i} className="space-y-1.5">
                  <Pulse className="h-3 w-16" />
                  <Pulse className="h-9 w-full rounded-[var(--radius-input)]" />
                </div>
              ))}
            </div>
            <Pulse className="h-10 w-28 rounded-[var(--radius-btn)]" />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══ GENERIC FALLBACK ═══ */
function GenericSkeleton() {
  return (
    <div className="space-y-5 p-1">
      <div className="rounded-[var(--radius-card)] border border-border/40 bg-card/50 p-5">
        <div className="flex items-center gap-3.5">
          <Pulse className="w-11 h-11 rounded-[var(--radius-card)]" />
          <div className="space-y-2">
            <Pulse className="h-5 w-36" />
            <Pulse className="h-3 w-52" />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="rounded-[var(--radius-card)] border border-border/40 bg-card/50 p-4 space-y-3">
            <Pulse className="w-10 h-10 rounded-xl" />
            <Pulse className="h-6 w-14" />
            <Pulse className="h-2.5 w-20" />
          </div>
        ))}
      </div>
      <div className="rounded-[var(--radius-card)] border border-border/40 bg-card/50 overflow-hidden">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3.5 border-b border-border/10 last:border-0">
            <Pulse className="w-9 h-9 rounded-xl" />
            <div className="flex-1 space-y-1.5">
              <Pulse className="h-3.5 w-3/4" />
              <Pulse className="h-2.5 w-1/2" />
            </div>
            <Pulse className="h-5 w-16 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══ DEFAULT EXPORT — legacy compatibility ═══ */
export default function PageSkeleton({ variant }: { variant?: "home" | "place-order" | "orders" | "wallet" | "settings" }) {
  switch (variant) {
    case "home": return <HomeSkeleton />;
    case "place-order": return <PlaceOrderSkeleton />;
    case "orders": return <OrdersSkeleton />;
    case "wallet": return <WalletSkeleton />;
    case "settings": return <SettingsSkeleton />;
    default: return <GenericSkeleton />;
  }
}

export { HomeSkeleton, PlaceOrderSkeleton, OrdersSkeleton, WalletSkeleton, SettingsSkeleton, GenericSkeleton };
