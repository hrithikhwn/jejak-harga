import { createContext, Fragment, useContext, useEffect, useMemo, useState } from "react";
import ms from "./ms.json";
import en from "./en.json";

// Every piece of text on the site lives in ms.json and en.json, under the same keys.
// Components never contain text of their own: they call t("some.key").
export const STRINGS = { ms, en };
const STORAGE_KEY = "jejak-harga-lang";

// Malay by default. On a first visit, a browser set to English gets English.
// After that, the visitor's own choice is remembered.
function firstLanguage() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "ms" || saved === "en") return saved;
  } catch {
    // Storage can be blocked (private windows, strict settings): fall back to the browser
  }
  return navigator.language?.toLowerCase().startsWith("en") ? "en" : "ms";
}

// t("hero.since", { month: "Apr 2022" }) fills {month} in the string for that key.
// A value can also be a React element (such as a link); t then returns a list of
// pieces instead of one string, so translations can put links wherever the
// sentence needs them.
export function makeT(strings) {
  return function t(key, values = {}) {
    const text = strings[key];
    if (text === undefined) return key; // a missing key shows up on the page, and fails the tests
    const parts = text.split(/\{(\w+)\}/); // odd positions are placeholder names
    const filled = parts.map((part, i) => (i % 2 === 1 ? (values[part] ?? `{${part}}`) : part));
    if (filled.every((part) => typeof part === "string" || typeof part === "number")) {
      return filled.join("");
    }
    return filled.map((part, i) => <Fragment key={i}>{part}</Fragment>);
  };
}

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(firstLanguage);

  useEffect(() => {
    document.documentElement.lang = lang; // screen readers pronounce the page in this language
    document.title = STRINGS[lang]["meta.title"];
  }, [lang]);

  const value = useMemo(
    () => ({
      lang,
      t: makeT(STRINGS[lang]),
      setLang(next) {
        setLang(next);
        try {
          localStorage.setItem(STORAGE_KEY, next);
        } catch {
          // Not remembered next time, but the switch still works now
        }
      },
    }),
    [lang],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

// const t = useT();  t("nav.basket") -> "Bakul" or "Basket"
export function useT() {
  return useContext(LanguageContext).t;
}

// const { lang, setLang } = useLanguage();
export function useLanguage() {
  return useContext(LanguageContext);
}
