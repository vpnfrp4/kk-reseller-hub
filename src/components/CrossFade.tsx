import { ReactNode, useEffect, useRef, useState } from "react";

interface CrossFadeProps {
  /** When true, shows skeleton; when false, crossfades to children */
  isLoading: boolean;
  skeleton: ReactNode;
  children: ReactNode;
  /** Duration in ms (default 400) */
  duration?: number;
  className?: string;
}

export default function CrossFade({ isLoading, skeleton, children, duration = 400, className = "" }: CrossFadeProps) {
  const [showSkeleton, setShowSkeleton] = useState(isLoading);
  const [phase, setPhase] = useState<"skeleton" | "fading" | "content">(isLoading ? "skeleton" : "content");
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!isLoading && phase === "skeleton") {
      // Start crossfade: fade out skeleton, then show content
      setPhase("fading");
      timeoutRef.current = setTimeout(() => {
        setShowSkeleton(false);
        setPhase("content");
      }, duration);
    } else if (isLoading) {
      setShowSkeleton(true);
      setPhase("skeleton");
    }
    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
  }, [isLoading, duration]);

  return (
    <div className={`relative ${className}`}>
      {/* Skeleton layer */}
      {showSkeleton && (
        <div
          className="transition-opacity"
          style={{
            opacity: phase === "fading" ? 0 : 1,
            transitionDuration: `${duration}ms`,
            position: phase === "fading" ? "absolute" : "relative",
            inset: phase === "fading" ? 0 : undefined,
            width: "100%",
          }}
        >
          {skeleton}
        </div>
      )}
      {/* Content layer */}
      {!showSkeleton && (
        <div
          className="transition-opacity"
          style={{
            opacity: phase === "content" ? 1 : 0,
            transitionDuration: `${duration}ms`,
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
}
