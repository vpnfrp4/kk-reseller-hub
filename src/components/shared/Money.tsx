import { cn } from "@/lib/utils";

interface MoneyProps {
  amount: number;
  currency?: string;
  className?: string;
  /** Show currency label smaller */
  compact?: boolean;
  /** Show as muted (e.g. for old prices) */
  muted?: boolean;
  /** Show line-through (for original price display) */
  strikethrough?: boolean;
}

export default function Money({
  amount,
  currency = "MMK",
  className,
  compact = false,
  muted = false,
  strikethrough = false,
}: MoneyProps) {
  return (
    <span
      className={cn(
        "tabular-nums inline-flex items-baseline gap-1",
        muted && "text-muted-foreground",
        strikethrough && "line-through",
        className
      )}
    >
      <span className={cn("font-bold", muted && "font-normal")}>
        {(amount ?? 0).toLocaleString()}
      </span>
      <span className={cn(
        "font-normal text-muted-foreground",
        compact ? "text-[10px]" : "text-xs"
      )}>
        {currency}
      </span>
    </span>
  );
}
