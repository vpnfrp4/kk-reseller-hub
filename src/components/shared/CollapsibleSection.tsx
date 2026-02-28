import { useState, useRef, useEffect, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface CollapsibleSectionProps {
  title: string;
  totalCount: number;
  previewCount?: number;
  children: ReactNode;
  /** Render function for collapsed summary line */
  summary?: ReactNode;
  className?: string;
  headerRight?: ReactNode;
}

export default function CollapsibleSection({
  title,
  totalCount,
  previewCount = 3,
  children,
  summary,
  className,
  headerRight,
}: CollapsibleSectionProps) {
  const [expanded, setExpanded] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const [contentHeight, setContentHeight] = useState<number | undefined>(undefined);

  const needsCollapse = totalCount > previewCount;

  // Measure full content height for smooth animation
  useEffect(() => {
    if (!contentRef.current || !needsCollapse) return;
    const observer = new ResizeObserver(() => {
      if (contentRef.current) {
        setContentHeight(contentRef.current.scrollHeight);
      }
    });
    observer.observe(contentRef.current);
    return () => observer.disconnect();
  }, [needsCollapse, totalCount]);

  // Calculate collapsed height based on preview items
  const collapsedHeight = needsCollapse && contentRef.current
    ? (() => {
        const items = contentRef.current.children;
        let h = 0;
        for (let i = 0; i < Math.min(previewCount, items.length); i++) {
          h += (items[i] as HTMLElement).offsetHeight;
        }
        return h;
      })()
    : undefined;

  const isOpen = expanded || !needsCollapse;

  return (
    <div className={cn("glass-card overflow-hidden", className)}>
      {/* Header */}
      <button
        onClick={() => needsCollapse && setExpanded(!expanded)}
        className={cn(
          "w-full flex items-center justify-between p-6 border-b border-border text-left",
          needsCollapse && "cursor-pointer hover:bg-secondary/20 transition-colors active:bg-secondary/30"
        )}
        disabled={!needsCollapse}
        type="button"
      >
        <div className="flex items-center gap-3">
          <h3 className="text-base font-semibold text-foreground">{title}</h3>
          {totalCount > 0 && (
            <span className="text-[11px] font-bold tabular-nums px-2 py-0.5 rounded-md bg-secondary text-muted-foreground">
              {totalCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {headerRight}
          {needsCollapse && (
            <ChevronDown
              className={cn(
                "w-4 h-4 text-muted-foreground transition-transform duration-200 ease-out",
                isOpen && "rotate-180"
              )}
            />
          )}
        </div>
      </button>

      {/* Collapsible content */}
      <div
        className="transition-[max-height] duration-200 ease-out overflow-hidden"
        style={{
          maxHeight: !needsCollapse
            ? "none"
            : isOpen
              ? `${contentHeight || 9999}px`
              : `${collapsedHeight || 0}px`,
        }}
      >
        <div ref={contentRef}>{children}</div>
      </div>

      {/* Collapsed footer: summary + expand hint */}
      {needsCollapse && !isOpen && (
        <button
          onClick={() => setExpanded(true)}
          className="w-full flex items-center justify-between px-6 py-3 border-t border-border/40 hover:bg-secondary/20 transition-colors group"
          type="button"
        >
          <span className="text-xs text-muted-foreground truncate">
            {summary || `+${totalCount - previewCount} more records`}
          </span>
          <span className="text-[11px] font-semibold text-primary group-hover:underline shrink-0 ml-3">
            Show all
          </span>
        </button>
      )}

      {/* Expanded footer: collapse */}
      {needsCollapse && isOpen && (
        <button
          onClick={() => setExpanded(false)}
          className="w-full flex items-center justify-center px-6 py-3 border-t border-border/40 hover:bg-secondary/20 transition-colors group"
          type="button"
        >
          <span className="text-[11px] font-semibold text-muted-foreground group-hover:text-foreground flex items-center gap-1.5">
            Show less
            <ChevronDown className="w-3 h-3 rotate-180" />
          </span>
        </button>
      )}
    </div>
  );
}
