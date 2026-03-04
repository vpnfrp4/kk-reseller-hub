import { cn } from "@/lib/utils";
import { useCurrency } from "@/contexts/CurrencyContext";

interface MoneyProps {
  amount: number;
  /** Override currency (skip auto-conversion) */
  currency?: string;
  className?: string;
  /** Show currency label smaller */
  compact?: boolean;
  /** Show as muted (e.g. for old prices) */
  muted?: boolean;
  /** Show line-through (for original price display) */
  strikethrough?: boolean;
  /** If true, skip currency conversion (amount is already in target currency) */
  raw?: boolean;
}

export default function Money({
  amount,
  currency: currencyOverride,
  className,
  compact = false,
  muted = false,
  strikethrough = false,
  raw = false,
}: MoneyProps) {
  const { currency, convert } = useCurrency();

  const displayCurrency = currencyOverride || currency;
  // Guard: ensure amount is a valid number
  const safeAmount = typeof amount === "number" && !isNaN(amount) ? amount : 0;
  // Fix operator precedence: parenthesize the ternary condition
  const displayAmount = (currencyOverride || raw) ? safeAmount : convert(safeAmount);

  const formatted =
    displayCurrency === "USD"
      ? displayAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : displayAmount.toLocaleString();

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
        {displayCurrency === "USD" && "$"}{formatted}
      </span>
      {displayCurrency !== "USD" && (
        <span className={cn(
          "font-normal text-muted-foreground",
          compact ? "text-[10px]" : "text-xs"
        )}>
          {displayCurrency}
        </span>
      )}
    </span>
  );
}
