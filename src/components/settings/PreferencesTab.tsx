import { useEffect, useState, useCallback } from "react";
import { useCurrency, type Currency } from "@/contexts/CurrencyContext";
import { useLang } from "@/contexts/LangContext";
import { cn } from "@/lib/utils";
import {
  Globe, DollarSign, Coins, ArrowRightLeft, Sun, Moon, Monitor,
} from "lucide-react";

function getInitialTheme(): "dark" | "light" {
  try {
    const stored = localStorage.getItem("theme");
    if (stored === "light" || stored === "dark") return stored;
  } catch {}
  return "dark";
}

export default function PreferencesTab() {
  const { currency, setCurrency, rate } = useCurrency();
  const { lang, toggle: toggleLang } = useLang();
  const [theme, setTheme] = useState<"dark" | "light">(getInitialTheme);

  const applyTheme = useCallback((t: "dark" | "light") => {
    setTheme(t);
    const root = document.documentElement;
    if (t === "dark") {
      root.classList.add("dark");
      root.classList.remove("light");
    } else {
      root.classList.remove("dark");
      root.classList.add("light");
    }
    localStorage.setItem("theme", t);
  }, []);

  return (
    <div className="space-y-default">
      {/* ── Language ── */}
      <div className="glass-card p-card space-y-default">
        <div className="flex items-center gap-compact">
          <div className="w-8 h-8 rounded-btn bg-primary/10 flex items-center justify-center">
            <Globe className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Language</h3>
            <p className="text-[11px] text-muted-foreground">
              Choose the display language for the interface
            </p>
          </div>
        </div>

        <div className="flex items-center gap-default">
          <OptionCard
            active={lang === "en"}
            onClick={() => { if (lang !== "en") toggleLang(); }}
            icon={<span className="text-base font-bold">EN</span>}
            label="English"
            sublabel="Default language"
          />
          <OptionCard
            active={lang === "mm"}
            onClick={() => { if (lang !== "mm") toggleLang(); }}
            icon={<span className="text-base font-bold">MY</span>}
            label="Myanmar"
            sublabel="မြန်မာဘာသာ"
          />
        </div>
      </div>

      {/* ── Currency ── */}
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

        <div className="flex items-center gap-default">
          <OptionCard
            active={currency === "MMK"}
            onClick={() => setCurrency("MMK")}
            icon={<Coins className="w-5 h-5" />}
            label="MMK"
            sublabel="Myanmar Kyat"
          />
          <OptionCard
            active={currency === "USD"}
            onClick={() => setCurrency("USD")}
            icon={<DollarSign className="w-5 h-5" />}
            label="USD"
            sublabel="US Dollar"
          />
        </div>

        <div className="flex items-center gap-tight px-compact py-2.5 rounded-btn bg-secondary/50 border border-border/30">
          <ArrowRightLeft className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <span className="text-[11px] text-muted-foreground">
            Current rate: <span className="font-mono font-semibold text-foreground">1 USD = {rate.toLocaleString()} MMK</span>
          </span>
        </div>
      </div>

      {/* ── Theme ── */}
      <div className="glass-card p-card space-y-default">
        <div className="flex items-center gap-compact">
          <div className="w-8 h-8 rounded-btn bg-primary/10 flex items-center justify-center">
            <Monitor className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Theme</h3>
            <p className="text-[11px] text-muted-foreground">
              Choose your preferred appearance
            </p>
          </div>
        </div>

        <div className="flex items-center gap-default">
          <OptionCard
            active={theme === "dark"}
            onClick={() => applyTheme("dark")}
            icon={<Moon className="w-5 h-5" />}
            label="Dark Mode"
            sublabel="Reduce eye strain"
          />
          <OptionCard
            active={theme === "light"}
            onClick={() => applyTheme("light")}
            icon={<Sun className="w-5 h-5" />}
            label="Light Mode"
            sublabel="Bright appearance"
          />
        </div>
      </div>
    </div>
  );
}

function OptionCard({
  active,
  onClick,
  icon,
  label,
  sublabel,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  sublabel: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex-1 flex items-center gap-compact p-compact rounded-card border-2 transition-all duration-300",
        active
          ? "bg-primary/10 border-primary/20 shadow-[0_0_20px_-6px_hsl(var(--primary)/0.2)]"
          : "border-border/30 bg-secondary/20 hover:bg-secondary/40"
      )}
    >
      <div
        className={cn(
          "w-10 h-10 rounded-btn flex items-center justify-center transition-colors",
          active ? "bg-background/50 text-primary" : "bg-secondary text-muted-foreground"
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
