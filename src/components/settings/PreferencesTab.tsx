import { useCurrency, type Currency } from "@/contexts/CurrencyContext";
import { cn } from "@/lib/utils";
import { DollarSign, Coins, ArrowRightLeft } from "lucide-react";

export default function PreferencesTab() {
  const { currency, setCurrency, rate } = useCurrency();

  return (
    <div className="space-y-default">
      {/* Currency Preference */}
      <div className="glass-card p-card space-y-default">
        <div className="flex items-center gap-compact">
          <div className="w-8 h-8 rounded-btn bg-primary/10 flex items-center justify-center">
            <ArrowRightLeft className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Display Currency</h3>
            <p className="text-[11px] text-muted-foreground">
              Choose how prices are displayed across the dashboard
            </p>
          </div>
        </div>

        {/* Toggle */}
        <div className="flex items-center gap-default">
          <CurrencyOption
            active={currency === "MMK"}
            onClick={() => setCurrency("MMK")}
            icon={<Coins className="w-5 h-5" />}
            label="MMK"
            sublabel="Myanmar Kyat"
            color="text-emerald-400"
            bgColor="bg-emerald-500/10 border-emerald-500/20"
          />
          <CurrencyOption
            active={currency === "USD"}
            onClick={() => setCurrency("USD")}
            icon={<DollarSign className="w-5 h-5" />}
            label="USD"
            sublabel="US Dollar"
            color="text-primary"
            bgColor="bg-primary/10 border-primary/20"
          />
        </div>

        {/* Rate info */}
        <div className="flex items-center gap-tight px-compact py-2.5 rounded-btn bg-secondary/50 border border-border/30">
          <ArrowRightLeft className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <span className="text-[11px] text-muted-foreground">
            Current rate: <span className="font-mono font-semibold text-foreground">1 USD = {rate.toLocaleString()} MMK</span>
          </span>
        </div>
      </div>
    </div>
  );
}

function CurrencyOption({
  active,
  onClick,
  icon,
  label,
  sublabel,
  color,
  bgColor,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  sublabel: string;
  color: string;
  bgColor: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex-1 flex items-center gap-compact p-compact rounded-card border-2 transition-all duration-300",
        active
          ? cn(bgColor, "shadow-[0_0_20px_-6px_hsl(var(--primary)/0.2)]")
          : "border-border/30 bg-secondary/20 hover:bg-secondary/40"
      )}
    >
      <div
        className={cn(
          "w-10 h-10 rounded-btn flex items-center justify-center transition-colors",
          active ? cn("bg-background/50", color) : "bg-secondary text-muted-foreground"
        )}
      >
        {icon}
      </div>
      <div className="text-left">
        <p className={cn("text-sm font-bold", active ? "text-foreground" : "text-muted-foreground")}>
          {label}
        </p>
        <p className="text-[10px] text-muted-foreground">{sublabel}</p>
      </div>
      {active && (
        <div className="ml-auto w-2.5 h-2.5 rounded-full bg-primary shadow-[0_0_8px_hsl(var(--primary)/0.5)]" />
      )}
    </button>
  );
}
