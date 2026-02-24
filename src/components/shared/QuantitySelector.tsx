import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface QuantitySelectorProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  className?: string;
}

export default function QuantitySelector({
  value,
  onChange,
  min = 1,
  max = 999,
  className,
}: QuantitySelectorProps) {
  const decrement = () => onChange(Math.max(min, value - 1));
  const increment = () => onChange(Math.min(max, value + 1));

  return (
    <div className={cn("flex items-center gap-compact", className)}>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-11 w-11 rounded-btn shrink-0"
        onClick={decrement}
        disabled={value <= min}
      >
        <Minus className="w-4 h-4" />
      </Button>
      <div className="h-11 min-w-[56px] rounded-btn border border-border bg-card flex items-center justify-center px-default">
        <span className="text-h3 font-bold tabular-nums text-foreground">{value}</span>
      </div>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-11 w-11 rounded-btn shrink-0"
        onClick={increment}
        disabled={value >= max}
      >
        <Plus className="w-4 h-4" />
      </Button>
    </div>
  );
}
