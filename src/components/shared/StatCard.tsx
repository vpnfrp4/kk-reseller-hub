import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";
import Money from "./Money";

interface StatCardProps {
  label: string;
  value: number | string;
  icon?: LucideIcon;
  /** Show as currency amount */
  isCurrency?: boolean;
  currency?: string;
  trend?: { value: number; label?: string };
  className?: string;
  /** Make this card visually prominent */
  featured?: boolean;
}

export default function StatCard({
  label,
  value,
  icon: Icon,
  isCurrency = false,
  currency = "MMK",
  trend,
  className,
  featured = false,
}: StatCardProps) {
  return (
    <div
      className={cn(
        "stat-card group",
        featured && "col-span-full sm:col-span-2",
        className
      )}
    >
      <div className="flex items-start justify-between gap-compact">
        <div className="space-y-tight">
          <p className="text-caption text-muted-foreground font-medium uppercase tracking-wider">
            {label}
          </p>
          <div className={cn("financial-number", featured ? "text-h1" : "text-h2")}>
            {isCurrency ? (
              <Money amount={Number(value)} currency={currency} />
            ) : (
              <span className="text-foreground">{typeof value === "number" ? value.toLocaleString() : value}</span>
            )}
          </div>
          {trend && (
            <p className={cn(
              "text-caption font-medium",
              trend.value >= 0 ? "text-success" : "text-destructive"
            )}>
              {trend.value >= 0 ? "+" : ""}{trend.value}%
              {trend.label && <span className="text-muted-foreground ml-1">{trend.label}</span>}
            </p>
          )}
        </div>
        {Icon && (
          <div className="w-10 h-10 rounded-btn bg-primary/10 flex items-center justify-center shrink-0">
            <Icon className="w-5 h-5 text-primary" strokeWidth={1.5} />
          </div>
        )}
      </div>
    </div>
  );
}
