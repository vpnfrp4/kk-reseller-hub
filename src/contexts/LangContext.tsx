import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";

export type Lang = "mm" | "en";

interface LangContextValue {
  lang: Lang;
  toggle: () => void;
}

const LangContext = createContext<LangContextValue>({ lang: "mm", toggle: () => {} });

const STORAGE_KEY = "kk-lang";

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "en" || stored === "mm") return stored;
    } catch {}
    return "mm";
  });

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, lang); } catch {}
  }, [lang]);

  const toggle = useCallback(() => {
    setLang((prev) => (prev === "mm" ? "en" : "mm"));
  }, []);

  return (
    <LangContext.Provider value={{ lang, toggle }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang() {
  return useContext(LangContext);
}
