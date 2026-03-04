import { Link, type LinkProps } from "react-router-dom";
import { prefetchRoute } from "@/lib/prefetch";
import { useCallback, useRef } from "react";

/**
 * A drop-in replacement for react-router's <Link> that prefetches
 * the target route's JS chunk on hover (desktop) or touchstart (mobile).
 */
export default function PrefetchLink({ to, children, onMouseEnter, onTouchStart, ...rest }: LinkProps) {
  const prefetched = useRef(false);

  const handlePrefetch = useCallback(() => {
    if (prefetched.current) return;
    prefetched.current = true;
    const path = typeof to === "string" ? to : to.pathname || "";
    prefetchRoute(path);
  }, [to]);

  return (
    <Link
      to={to}
      onMouseEnter={(e) => {
        handlePrefetch();
        onMouseEnter?.(e);
      }}
      onTouchStart={(e) => {
        handlePrefetch();
        onTouchStart?.(e);
      }}
      {...rest}
    >
      {children}
    </Link>
  );
}
