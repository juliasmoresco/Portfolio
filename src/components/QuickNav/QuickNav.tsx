import { useEffect, useId, useRef, useState } from "react";
import { getReaderItem } from "../../content";
import { setLang, useCopy, useLang, type Lang } from "../../i18n";
import { emitSelect } from "../../scene/events";
import { HOTSPOT_IDS, type HotspotId } from "../../scene/hotspots";
import styles from "./QuickNav.module.css";

/** Whichever cases the portfolio has (content and hotspots), in shelf order. */
const CASE_IDS: HotspotId[] = HOTSPOT_IDS.filter((id) => id.startsWith("case"));

interface Props {
  className?: string;
  /** Mobile only: re-centres the room after the user has panned or pinched away from it. */
  onResetView?: () => void;
}

const cx = (...c: Array<string | false>) => c.filter(Boolean).join(" ");

const COPY = {
  en: { menu: "Menu", quickLinks: "Quick links", closeMenu: "Close menu", about: "About", work: "Work", caseN: (n: number) => `Case ${n}`, resume: "Résumé", contact: "Contact", reset: "Reset view", language: "Language" },
  pt: { menu: "Menu", quickLinks: "Atalhos", closeMenu: "Fechar menu", about: "Sobre mim", work: "Trabalhos", caseN: (n: number) => `Case ${n}`, resume: "Currículo", contact: "Contato", reset: "Centralizar a sala", language: "Idioma" },
} satisfies Record<Lang, unknown>;

const LANGS: { id: Lang; label: string; name: string }[] = [
  { id: "en", label: "EN", name: "English" },
  { id: "pt", label: "PT", name: "Português" },
];

/**
 * A visible shortcut to About, each case, Résumé and Contact, for anyone who would rather not
 * explore the 3D room to find them. It doesn't replace the room or the hidden keyboard list
 * (HotspotList) — all three open the same Reader through the same `shelf:select` event.
 *
 * Slides in from the right as a translucent sheet, but behaves like a dropdown rather than a
 * modal: no backdrop blocking the room, and it dismisses on outside click, Escape, or a choice.
 */
export function QuickNav({ className, onResetView }: Props) {
  const [open, setOpen] = useState(false);
  const t = useCopy(COPY);
  const lang = useLang();
  const rootRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      toggleRef.current?.focus();
    };
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const go = (id: HotspotId) => {
    emitSelect({ id });
    setOpen(false);
  };

  return (
    <div ref={rootRef} className={className}>
      <button ref={toggleRef} type="button" className={styles.toggle} aria-haspopup="true" aria-expanded={open} aria-controls={panelId} onClick={() => setOpen((o) => !o)}>
        {t.menu}
      </button>
      <nav id={panelId} className={cx(styles.panel, open && styles.panelOpen)} aria-label={t.quickLinks} inert={!open}>
        <div className={styles.panelHead}>
          <span className={styles.panelTitle}>{t.quickLinks}</span>
          <button type="button" className={styles.close} aria-label={t.closeMenu} onClick={() => setOpen(false)}>
            ×
          </button>
        </div>
        <button type="button" className={styles.item} onClick={() => go("about")}>
          {t.about}
        </button>
        <div className={styles.group}>
          <span className={styles.groupLabel}>{t.work}</span>
          {CASE_IDS.map((id, i) => (
            <button key={id} type="button" className={styles.subItem} onClick={() => go(id)}>
              {getReaderItem(id, lang)?.title ?? t.caseN(i + 1)}
            </button>
          ))}
        </div>
        <button type="button" className={styles.item} onClick={() => go("resume")}>
          {t.resume}
        </button>
        <button type="button" className={styles.item} onClick={() => go("phone")}>
          {t.contact}
        </button>
        {onResetView && (
          <button
            type="button"
            className={styles.reset}
            onClick={() => {
              onResetView();
              setOpen(false);
            }}
          >
            {t.reset}
          </button>
        )}
        <div className={styles.lang} role="group" aria-label={t.language}>
          <span className={styles.groupLabel}>{t.language}</span>
          <div className={styles.langSwitch}>
            {LANGS.map((l) => (
              <button key={l.id} type="button" className={styles.langOption} aria-pressed={lang === l.id} lang={l.id === "pt" ? "pt-BR" : "en"} aria-label={l.name} onClick={() => setLang(l.id)}>
                {l.label}
              </button>
            ))}
          </div>
        </div>
      </nav>
    </div>
  );
}
