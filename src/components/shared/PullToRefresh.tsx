import { useState, useRef, useCallback, type ReactNode } from "react";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: ReactNode;
  threshold?: number;
}

/** Trigger a short haptic vibration if supported */
function haptic(pattern: number | number[] = 10) {
  try {
    navigator?.vibrate?.(pattern);
  } catch {
    // Not supported — silently ignore
  }
}

export default function PullToRefresh({ onRefresh, children, threshold = 80 }: PullToRefreshProps) {
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(0);
  const pulling = useRef(false);
  const hitThreshold = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const mainEl = containerRef.current?.closest("[data-scroll-area]");
    const scrollTop = mainEl ? mainEl.scrollTop : window.scrollY;
    if (scrollTop <= 0 && !refreshing) {
      startY.current = e.touches[0].clientY;
      pulling.current = true;
      hitThreshold.current = false;
    }
  }, [refreshing]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!pulling.current || refreshing) return;
    const delta = e.touches[0].clientY - startY.current;
    if (delta > 0) {
      const damped = Math.min(delta * 0.45, threshold * 1.6);
      setPullDistance(damped);

      // Haptic tick when crossing threshold
      if (damped >= threshold && !hitThreshold.current) {
        hitThreshold.current = true;
        haptic(12);
      } else if (damped < threshold && hitThreshold.current) {
        hitThreshold.current = false;
      }
    }
  }, [refreshing, threshold]);

  const handleTouchEnd = useCallback(async () => {
    if (!pulling.current) return;
    pulling.current = false;

    if (pullDistance >= threshold && !refreshing) {
      haptic([8, 40, 15]); // Success pattern
      setRefreshing(true);
      setPullDistance(threshold * 0.55);
      try {
        await onRefresh();
      } finally {
        haptic(6);
        setRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
  }, [pullDistance, threshold, refreshing, onRefresh]);

  const progress = Math.min(pullDistance / threshold, 1);

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="relative"
    >
      {/* Pull indicator */}
      <div
        className="flex items-center justify-center overflow-hidden transition-[height] duration-200 ease-out"
        style={{ height: pullDistance > 5 ? pullDistance * 0.55 : 0 }}
      >
        <div
          className={cn(
            "flex flex-col items-center gap-1.5 transition-opacity duration-150",
            progress > 0.2 ? "opacity-100" : "opacity-0"
          )}
        >
          {/* Spinner ring */}
          <div className="relative w-8 h-8">
            <svg className="w-8 h-8 -rotate-90" viewBox="0 0 32 32">
              <circle
                cx="16" cy="16" r="13"
                fill="none"
                stroke="hsl(var(--primary) / 0.15)"
                strokeWidth="2.5"
              />
              <circle
                cx="16" cy="16" r="13"
                fill="none"
                stroke="hsl(var(--primary))"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeDasharray={`${progress * 81.7} 81.7`}
                className={cn(refreshing && "animate-spin origin-center")}
                style={{ transition: refreshing ? undefined : "stroke-dasharray 0.15s ease-out" }}
              />
            </svg>
            <RefreshCw
              className={cn(
                "w-3.5 h-3.5 text-primary absolute inset-0 m-auto transition-transform duration-200",
                refreshing && "animate-spin"
              )}
              style={{
                transform: refreshing ? undefined : `rotate(${progress * 360}deg)`,
              }}
            />
          </div>
          <span className="text-[11px] font-semibold text-muted-foreground tracking-wide">
            {refreshing ? "Refreshing…" : progress >= 1 ? "Release ↑" : "Pull to refresh"}
          </span>
        </div>
      </div>

      {/* Content with subtle push-down */}
      <div
        className="transition-transform duration-200 ease-out will-change-transform"
        style={{
          transform: pullDistance > 5 ? `translateY(${pullDistance * 0.1}px)` : undefined,
        }}
      >
        {children}
      </div>
    </div>
  );
}
