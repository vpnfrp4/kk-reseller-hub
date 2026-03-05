import { cn } from "@/lib/utils";
import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";
import Money from "./Money";
import MiniSparkline from "../admin/MiniSparkline";
import { useCountUp } from "@/hooks/use-count-up";

interface StatCardProps {
  label: string;
  value: number | string;
  icon?: LucideIcon;
  /** Custom icon color class, e.g. "text-success". Defaults to "text-primary" */
  iconColor?: string;
  /** Show as currency amount */
  isCurrency?: boolean;
  currency?: string;
  /** Suffix shown after value, e.g. "MMK" */
  suffix?: string;
  trend?: { value: number; label?: string };
  /** 7-day sparkline data points */
  sparkData?: number[];
  className?: string;
  /** Make this card visually prominent */
  featured?: boolean;
  /** Animate value counting up */
  animate?: boolean;
  /** Stagger delay in seconds for entrance animation */
  delay?: number;
}

export default function StatCard({
  label,
  value,
  icon: Icon,
  iconColor = "text-primary",
  isCurrency = false,
  currency = "MMK",
  suffix,
  trend,
  sparkData,
  className,
  featured = false,
  animate = false,
  delay = 0,
}: StatCardProps) {
  const numericValue = typeof value === "number" ? value : 0;
  const animatedValue = useCountUp(animate ? numericValue : 0, 900);
  const displayValue = animate ? animatedValue : value;

  // Derive the background tint from iconColor (e.g. "text-success" → "--success")
  const colorVar = iconColor.replace("text-", "");
  const iconBg = `hsl(var(--${colorVar}) / 0.1)`;
  const sparkColor = `hsl(var(--${colorVar}))`;

  return (
    <div
      className={cn(
        "stat-card group",
        featured && "col-span-full sm:col-span-2",
        animate && "opacity-0 animate-stagger-in",
        className
      )}
      style={delay ? { animationDelay: `${delay}s` } : undefined}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          {Icon && (
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: iconBg }}
            >
              <Icon className={cn("w-[18px] h-[18px]", iconColor)} strokeWidth={1.5} />
            </div>
          )}
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            {label}
          </span>
        </div>
        {sparkData && sparkData.length > 1 && (
          <MiniSparkline
            data={sparkData}
            width={64}
            height={24}
            color={sparkColor}
            className="opacity-70 group-hover:opacity-100 transition-opacity"
          />
        )}
      </div>

      <div className="flex items-end justify-between">
        <p
          className={cn("font-extrabold font-mono tabular-nums tracking-tight", featured ? "text-4xl" : "text-3xl")}
          style={{
            backgroundImage: "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary-glow)) 40%, hsl(var(--accent)) 100%)",
            backgroundSize: "200% 100%",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            animation: "gold-shimmer 5s ease-in-out infinite",
          }}
        >
          {isCurrency ? (
            <Money amount={Number(displayValue)} currency={currency} />
          ) : (
            <>
              {typeof displayValue === "number" ? displayValue.toLocaleString() : displayValue}
              {suffix && <span className="text-base font-semibold text-muted-foreground ml-1.5">{suffix}</span>}
            </>
          )}
        </p>
        {trend && (
          <div className={cn("flex items-center gap-1 text-xs font-semibold", trend.value >= 0 ? "text-success" : "text-destructive")}>
            {trend.value >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
            {trend.value >= 0 ? "+" : ""}{trend.value.toFixed(1)}%
            {trend.label && <span className="text-muted-foreground ml-1">{trend.label}</span>}
          </div>
        )}
      </div>
    </div>
  );
}
