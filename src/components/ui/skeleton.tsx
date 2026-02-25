import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-md bg-muted/40 animate-shimmer",
        className
      )}
      style={{
        backgroundImage:
          "linear-gradient(90deg, transparent 0%, hsl(var(--muted-foreground) / 0.06) 40%, hsl(var(--muted-foreground) / 0.12) 50%, hsl(var(--muted-foreground) / 0.06) 60%, transparent 100%)",
        backgroundSize: "200% 100%",
      }}
      {...props}
    />
  );
}

export { Skeleton };
