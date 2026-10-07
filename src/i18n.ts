import { useSyncExternalStore } from "react";

/**
 * The site's language: English by default, Portuguese on request. The choice comes from `?lang=pt` in the link (so a
 * link can open in Portuguese), then from what the visitor picked last time; it is kept in the URL and in storage.
 */
export type Lang = "en" | "pt";

const KEY = "lang";

function initial(): Lang {
  if (typeof window === "undefined") return "en";
  const fromUrl = new URLSearchParams(window.location.search).get("lang");
  if (fromUrl === "pt" || fromUrl === "en") return fromUrl;
  try {
    const saved = window.localStorage.getItem(KEY);
    if (saved === "pt" || saved === "en") return saved;
  } catch {
    // storage blocked: English
  }
  return "en";
}

let current: Lang = initial();
const listeners = new Set<() => void>();

function apply(lang: Lang) {
  if (typeof document !== "undefined") document.documentElement.lang = lang === "pt" ? "pt-BR" : "en";
}
apply(current);

export function getLang(): Lang {
  return current;
}

export function setLang(lang: Lang): void {
  if (lang === current) return;
  current = lang;
  apply(lang);
  try {
    window.localStorage.setItem(KEY, lang);
  } catch {
    // storage blocked: the choice lasts for this visit
  }
  const url = new URL(window.location.href);
  if (lang === "en") url.searchParams.delete("lang");
  else url.searchParams.set("lang", lang);
  window.history.replaceState(window.history.state, "", url);
  listeners.forEach((l) => l());
}

/** The current language, re-rendering when it changes. */
export function useLang(): Lang {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    getLang,
    () => "en",
  );
}

/** Copy in both languages, picked by the current one: `const t = useCopy(COPY)`. */
export function useCopy<T>(copy: Record<Lang, T>): T {
  return copy[useLang()];
}
