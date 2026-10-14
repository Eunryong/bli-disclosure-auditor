"use client";

import React, { createContext, useContext, useState } from "react";

export type AppLanguage = "en" | "ko";

interface LanguageContextValue {
  lang: AppLanguage;
  setLang: (next: AppLanguage) => void;
  t: <T>(en: T, ko: T) => T;
}

const LanguageContext = createContext<LanguageContextValue>({
  lang: "en",
  setLang: () => {},
  t: (en) => en,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  // Default language is strictly 'en' for global hackathon judging & SSR parity
  const [lang, setLangState] = useState<AppLanguage>("en");

  function setLang(next: AppLanguage) {
    setLangState(next);
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem("bli_audit_lang", next);
      } catch {
        // ignore storage errors
      }
    }
  }

  function t<T>(en: T, ko: T): T {
    return lang === "ko" ? ko : en;
  }

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  return useContext(LanguageContext);
}
