import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-md bg-muted/40 animate-gold-shimmer",
        className
      )}
      style={{
        backgroundImage:
          "linear-gradient(90deg, transparent 0%, hsl(43 65% 52% / 0.06) 30%, hsl(43 65% 52% / 0.14) 50%, hsl(43 65% 52% / 0.06) 70%, transparent 100%)",
        backgroundSize: "200% 100%",
      }}
      {...props}
    />
  );
}

export { Skeleton };
