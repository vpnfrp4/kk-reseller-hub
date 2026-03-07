import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { getCategoryIcon, getCategoryIconColor } from "@/lib/category-icons";
import { Skeleton } from "@/components/ui/skeleton";

type IconSize = "sm" | "md" | "lg";

const SIZE_MAP: Record<IconSize, { container: string; img: string; text: string; icon: string; padding: string }> = {
  sm: { container: "w-8 h-8", img: "w-8 h-8", text: "text-xs", icon: "w-3.5 h-3.5", padding: "p-1" },
  md: { container: "w-10 h-10", img: "w-10 h-10", text: "text-sm", icon: "w-4 h-4", padding: "p-1.5" },
  lg: { container: "w-11 h-11", img: "w-11 h-11", text: "text-base", icon: "w-4.5 h-4.5", padding: "p-1.5" },
};

interface ProductIconProps {
  imageUrl?: string | null;
  name: string;
  category?: string;
  size?: IconSize;
  className?: string;
}

export default function ProductIcon({
  imageUrl,
  name,
  category = "General",
  size = "md",
  className,
}: ProductIconProps) {
  const [status, setStatus] = useState<"loading" | "loaded" | "error">(
    imageUrl ? "loading" : "error"
  );

  const s = SIZE_MAP[size];
  const IconComp = getCategoryIcon(category, name);
  const iconColor = getCategoryIconColor(category, name);

  const handleLoad = useCallback(() => setStatus("loaded"), []);
  const handleError = useCallback(() => setStatus("error"), []);

  const containerBase = cn(
    "shrink-0 rounded-xl border border-white/10 flex items-center justify-center overflow-hidden",
    "bg-[#1A1F2E]",
    s.container,
    className
  );

  // No image URL — show category icon or letter fallback
  if (!imageUrl) {
    return (
      <div className={cn(containerBase, iconColor)}>
        <IconComp className={s.icon} />
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
          "object-contain rounded-lg",
          s.img,
          s.padding,
          status === "loaded" ? "block" : "hidden"
        )}
        loading="lazy"
        decoding="async"
        onLoad={handleLoad}
        onError={handleError}
        referrerPolicy="no-referrer"
      />

      {/* Error fallback: stylized first letter */}
      {status === "error" && (
        <span
          className={cn(
            "font-bold uppercase select-none bg-gradient-to-br from-primary/80 to-primary/40 bg-clip-text text-transparent",
            s.text
          )}
        >
          {name.replace(/[^a-zA-Z0-9]/g, "").charAt(0) || "?"}
        </span>
      )}
    </div>
  );
}
