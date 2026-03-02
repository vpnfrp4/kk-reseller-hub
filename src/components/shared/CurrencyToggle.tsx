import { useCurrency } from "@/contexts/CurrencyContext";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export default function CurrencyToggle() {
  const { currency, toggleCurrency } = useCurrency();

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={toggleCurrency}
          className="flex items-center h-8 rounded-lg border border-border bg-secondary text-xs font-bold overflow-hidden transition-all duration-200"
        >
          <span
            className={cn(
              "px-2 py-1.5 transition-all duration-300",
              currency === "MMK"
                ? "bg-emerald-500/15 text-emerald-400"
                : "text-muted-foreground"
            )}
          >
            K
          </span>
          <span
            className={cn(
              "px-2 py-1.5 transition-all duration-300",
              currency === "USD"
                ? "bg-primary/15 text-primary"
                : "text-muted-foreground"
            )}
          >
            $
          </span>
        </button>
      </TooltipTrigger>
      <TooltipContent>
        {currency === "MMK" ? "Switch to USD" : "Switch to MMK"}
      </TooltipContent>
    </Tooltip>
  );
}
