import { useState, useCallback, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { getCategoryIcon, getCategoryIconColor } from "@/lib/category-icons";
import { Skeleton } from "@/components/ui/skeleton";
import { preloaded } from "@/lib/image-preloader";

type IconSize = "sm" | "md" | "lg";

const SIZE_MAP: Record<IconSize, { container: string; img: string; text: string; icon: string }> = {
  sm: { container: "w-10 h-10", img: "w-10 h-10", text: "text-xs", icon: "w-4 h-4" },
  md: { container: "w-12 h-12", img: "w-12 h-12", text: "text-sm", icon: "w-5 h-5" },
  lg: { container: "w-16 h-16", img: "w-16 h-16", text: "text-base", icon: "w-6 h-6" },
};

interface ProductIconProps {
  imageUrl?: string | null;
  name: string;
  category?: string;
  size?: IconSize;
  className?: string;
  /** Mark as high-priority above-fold image */
  priority?: boolean;
}

export default function ProductIcon({
  imageUrl,
  name,
  category = "General",
  size = "md",
  className,
  priority = false,
}: ProductIconProps) {
  // Skip skeleton for preloaded/cached images
  const getInitialStatus = (url?: string | null): "loading" | "loaded" | "error" => {
    if (!url) return "error";
    if (preloaded.has(url)) return "loaded";
    return "loading";
  };

  const [status, setStatus] = useState<"loading" | "loaded" | "error">(
    getInitialStatus(imageUrl)
  );

  // Reset status when imageUrl changes
  useEffect(() => {
    setStatus(getInitialStatus(imageUrl));
  }, [imageUrl]);

  const s = SIZE_MAP[size];
  const IconComp = getCategoryIcon(category, name);

  const handleLoad = useCallback(() => setStatus("loaded"), []);
  const handleError = useCallback(() => setStatus("error"), []);

  const containerBase = cn(
    "shrink-0 rounded-xl flex items-center justify-center overflow-hidden",
    "bg-secondary/50",
    s.container,
    className
  );

  // No image URL — show category icon or letter fallback
  if (!imageUrl) {
    return (
      <div className={containerBase}>
        <IconComp className={cn(s.icon, "text-primary")} />
      </div>
    );
  }

  return (
    <div className={containerBase}>
      {/* Skeleton while loading */}
      {status === "loading" && (
        <Skeleton className={cn("rounded-lg", s.img)} />
      )}

      {/* The image — hidden until loaded, hidden on error */}
      <img
        src={imageUrl}
        alt={name}
        className={cn(
          "object-cover rounded-lg",
          s.img,
          status === "loaded" ? "block" : "hidden"
        )}
        loading="eager"
        decoding={priority ? "sync" : "async"}
        fetchPriority={priority ? "high" : "auto"}
        onLoad={handleLoad}
        onError={handleError}
        referrerPolicy="no-referrer"
      />

      {/* Error fallback: stylized first letter */}
      {status === "error" && (
        <span
          className={cn(
            "font-bold uppercase select-none text-primary",
            s.text
          )}
        >
          {name.replace(/[^a-zA-Z0-9]/g, "").charAt(0) || "?"}
        </span>
      )}
    </div>
  );
}
