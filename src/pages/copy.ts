import { useMemo } from "react";
import { labelsFor } from "../content";
import { useCopy, useLang, type Lang } from "../i18n";
import { MOON_LAMP_ID, type Daylight } from "../scene/hotspots";

/** The home pages' words (title, hints, the light names), in both languages. */
const HOME = {
  en: {
    title: "Welcome to my office",
    lede: "Click around and see what you find — or use the menu for a quicker way through.",
    hintTouch: "Pinch, drag and tap around to see what you find — or use the menu for a quicker way through.",
    discovered: (n: number, total: number) => `${n} of ${total} discovered`,
    found: (n: number, total: number) => `${n} of ${total} found`,
    hints: "Hints",
    lamp: "Moon lamp — change the light",
    daylight: { afternoon: "afternoon", "golden hour": "golden hour", overcast: "overcast", "evening lamp": "evening lamp" } as Record<Daylight, string>,
    pageTitle: "Júlia Moresco · Senior Product Designer",
    things: "Things in the office",
  },
  pt: {
    title: "Bem-vindo(a) ao meu escritório",
    lede: "Clique por aí e veja o que encontra — ou use o menu para um caminho mais rápido.",
    hintTouch: "Arraste, aproxime com dois dedos e toque para ver o que encontra — ou use o menu para um caminho mais rápido.",
    discovered: (n: number, total: number) => `${n} de ${total} descobertos`,
    found: (n: number, total: number) => `${n} de ${total} encontrados`,
    hints: "Dicas",
    lamp: "Luminária de lua — mudar a luz",
    daylight: { afternoon: "tarde", "golden hour": "fim de tarde", overcast: "nublado", "evening lamp": "noite, luminária acesa" } as Record<Daylight, string>,
    pageTitle: "Júlia Moresco · Senior Product Designer",
    things: "Coisas no escritório",
  },
} satisfies Record<Lang, unknown>;

export type HomeCopy = (typeof HOME)["en"];

export function useHomeCopy(): HomeCopy {
  return useCopy<HomeCopy>(HOME);
}

/** Hover and keyboard labels for every hotspot (and the moon lamp) in the current language. */
export function useSceneLabels(): Record<string, string> {
  const lang = useLang();
  return useMemo(() => ({ ...labelsFor(lang), [MOON_LAMP_ID]: HOME[lang].lamp }), [lang]);
}
