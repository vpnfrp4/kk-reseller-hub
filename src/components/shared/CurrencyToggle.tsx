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
              "px-2.5 py-1.5 transition-all duration-300",
              currency === "MMK"
                ? "bg-[#39FF14]/15 text-[#39FF14] dark:bg-[#39FF14]/15 dark:text-[#39FF14]"
                : "text-muted-foreground"
            )}
          >
            K
          </span>
          <span
            className={cn(
              "px-2.5 py-1.5 transition-all duration-300",
              currency === "USD"
                ? "bg-[#39FF14]/15 text-[#39FF14] dark:bg-[#39FF14]/15 dark:text-[#39FF14]"
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
