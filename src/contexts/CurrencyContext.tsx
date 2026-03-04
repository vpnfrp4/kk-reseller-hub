import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

export type Currency = "MMK" | "USD";

interface CurrencyContextType {
  currency: Currency;
  toggleCurrency: () => void;
  setCurrency: (c: Currency) => void;
  /** Convert an MMK amount to the display currency */
  convert: (mmkAmount: number) => number;
  /** The current exchange rate (MMK per 1 USD) */
  rate: number;
  /** Format a number with the current currency symbol */
  formatAmount: (mmkAmount: number) => string;
  /** The currency symbol */
  symbol: string;
}

const CURRENCY_LS_KEY = "kktech-currency-pref";

const CurrencyContext = createContext<CurrencyContextType | null>(null);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const { user, profile } = useAuth();
  const [currency, setCurrencyState] = useState<Currency>(() => {
    const saved = localStorage.getItem(CURRENCY_LS_KEY);
    return saved === "USD" ? "USD" : "MMK";
  });

  // Fetch exchange rate from system_settings
  const { data: rate = 5000 } = useQuery({
    queryKey: ["usd-mmk-rate"],
    queryFn: async () => {
      const { data } = await supabase
        .from("system_settings")
        .select("value")
        .eq("key", "usd_mmk_rate")
        .single();
      return (data?.value as any)?.rate || 5000;
    },
    staleTime: 5 * 60 * 1000,
  });

  // Load preference from profile (overrides localStorage)
  useEffect(() => {
    if (profile && (profile as any).currency_preference) {
      const pref = (profile as any).currency_preference as Currency;
      if (pref === "USD" || pref === "MMK") {
        setCurrencyState(pref);
        localStorage.setItem(CURRENCY_LS_KEY, pref);
      }
    }
  }, [profile]);

  const persistPreference = useCallback(
    async (c: Currency) => {
      localStorage.setItem(CURRENCY_LS_KEY, c);
      if (!user) return;
      await supabase
        .from("profiles")
        .update({ currency_preference: c } as any)
        .eq("user_id", user.id);
    },
    [user]
  );

  const setCurrency = useCallback(
    (c: Currency) => {
      setCurrencyState(c);
      persistPreference(c);
    },
    [persistPreference]
  );

  const toggleCurrency = useCallback(() => {
    setCurrency(currency === "MMK" ? "USD" : "MMK");
  }, [currency, setCurrency]);

  const convert = useCallback(
    (mmkAmount: number): number => {
      if (currency === "MMK") return mmkAmount;
      if (!rate || rate <= 0) return mmkAmount;
      // Convert MMK to USD with 2 decimal precision
      return Math.round((mmkAmount / rate) * 100) / 100;
    },
    [currency, rate]
  );

  const symbol = currency === "MMK" ? "K" : "$";

  const formatAmount = useCallback(
    (mmkAmount: number): string => {
      const safe = typeof mmkAmount === "number" && !isNaN(mmkAmount) ? mmkAmount : 0;
      const converted = convert(safe);
      if (currency === "USD") {
        return `$${converted.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      }
      return `${converted.toLocaleString()} MMK`;
    },
    [convert, currency]
  );

  return (
    <CurrencyContext.Provider
      value={{ currency, toggleCurrency, setCurrency, convert, rate, formatAmount, symbol }}
    >
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error("useCurrency must be used within CurrencyProvider");
  return ctx;
}
