import React, { createContext, useContext, useState } from "react";
import { translations } from "@/i18n/translations";

const I18nContext = createContext(null);

export function I18nProvider({ children }) {
  const [lang, setLang] = useState(() => localStorage.getItem("vm2047_lang") || "en");

  const toggleLang = () => {
    setLang((l) => {
      const next = l === "en" ? "mr" : "en";
      localStorage.setItem("vm2047_lang", next);
      return next;
    });
  };

  const t = (key) => translations[lang]?.[key] || translations.en[key] || key;

  return (
    <I18nContext.Provider value={{ lang, toggleLang, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    return {
      lang: "en",
      toggleLang: () => {},
      t: (key) => translations.en[key] || key,
    };
  }
  return ctx;
}
