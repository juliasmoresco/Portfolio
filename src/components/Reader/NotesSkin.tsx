import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { ReaderItem } from "../../content";
import styles from "./Reader.module.css";

const LEAVE_MS = 380;
/** The smallest the quote is set to make a long review fit its note; below that, the quote scrolls instead. */
const MIN_QUOTE_PX = 13;

/**
 * The cork board's notes, close up: mentees' reviews as a small deck of paper notes. The top one is read; clicking it
 * (or Next, or the arrow keys) tosses it aside and the next comes up. Reviews written in Portuguese say so. Below,
 * the way to all the reviews and to booking a session.
 */
export function NotesSkin({ item }: { item: ReaderItem }) {
  const notes = item.notes ?? [];
  const [at, setAt] = useState(0);
  const [leaving, setLeaving] = useState<{ index: number; dir: 1 | -1; key: number } | null>(null);
  const timer = useRef(0);
  const n = notes.length;

  useEffect(() => () => window.clearTimeout(timer.current), []);

  // A long review on a short screen: step the quote's size down until it fits the note, and only if it still
  // doesn't at the smallest size, let it scroll. Again whenever the note changes size.
  const quoteRef = useRef<HTMLQuoteElement>(null);
  useLayoutEffect(() => {
    const el = quoteRef.current;
    if (!el) return;
    const fit = () => {
      el.style.fontSize = "";
      el.style.overflowY = "";
      let px = parseFloat(getComputedStyle(el).fontSize);
      while (el.scrollHeight > el.clientHeight + 1 && px > MIN_QUOTE_PX) {
        px = Math.max(MIN_QUOTE_PX, px - 0.5);
        el.style.fontSize = `${px}px`;
      }
      if (el.scrollHeight > el.clientHeight + 1) el.style.overflowY = "auto";
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el.parentElement!);
    return () => ro.disconnect();
  }, [at]);

  const go = (dir: 1 | -1) => {
    if (n < 2) return;
    window.clearTimeout(timer.current);
    setLeaving({ index: at, dir, key: Date.now() });
    setAt((i) => (i + dir + n) % n);
    timer.current = window.setTimeout(() => setLeaving(null), LEAVE_MS);
  };

  const card = (i: number, extra?: string, top?: boolean) => {
    const note = notes[i];
    return (
      <figure className={`${styles.note} ${extra ?? ""}`} data-tone={i % 4}>
        <span className={styles.noteMark} aria-hidden="true">
          “
        </span>
        <blockquote ref={top ? quoteRef : undefined} className={styles.noteQuote}>{note.quote}</blockquote>
        <figcaption className={styles.noteBy}>
          <strong>{note.name}</strong>
          {note.role && <span> · {note.role}</span>}
          {(note.source || note.date) && <span className={styles.noteDate}>{[note.source, note.date].filter(Boolean).join(" · ")}</span>}
          {note.translated && <span className={styles.noteTranslated}>Translated from Portuguese</span>}
        </figcaption>
      </figure>
    );
  };

  return (
    <div className={styles.notes}>
      <header className={styles.notesHead}>
        <span className={styles.chessKicker}>{item.kind}</span>
        <h2 className={styles.chessHeading}>{item.title}</h2>
        {item.pages[0]?.lines[0] && <p className={styles.chessLine}>{item.pages[0].lines[0]}</p>}
      </header>

      <div
        className={styles.noteDeck}
        role="group"
        aria-roledescription="deck of notes"
        aria-label={`Note ${at + 1} of ${n}`}
        tabIndex={0}
        onClick={() => go(1)}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight" || e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            go(1);
          } else if (e.key === "ArrowLeft") {
            e.preventDefault();
            go(-1);
          }
        }}
      >
        {/* the notes underneath, just their edges showing */}
        {n > 2 && <div className={`${styles.note} ${styles.noteUnder2}`} data-tone={(at + 2) % 4} aria-hidden="true" />}
        {n > 1 && <div className={`${styles.note} ${styles.noteUnder1}`} data-tone={(at + 1) % 4} aria-hidden="true" />}
        <div key={at} className={styles.noteTop} aria-live="polite">
          {card(at, undefined, true)}
        </div>
        {leaving && (
          <div key={leaving.key} className={leaving.dir > 0 ? styles.noteLeaveNext : styles.noteLeavePrev} aria-hidden="true">
            {card(leaving.index)}
          </div>
        )}
      </div>

      <div className={styles.notesNav}>
        <button type="button" className={styles.notesArrow} aria-label="Previous note" onClick={() => go(-1)}>
          ‹
        </button>
        <span className={styles.notesCount}>
          {at + 1} / {n}
        </span>
        <button type="button" className={styles.notesArrow} aria-label="Next note" onClick={() => go(1)}>
          ›
        </button>
      </div>

      {item.links && (
        <div className={styles.notesLinks}>
          {item.links.map((l, i) => (
            <a key={l.label} className={i === item.links!.length - 1 ? styles.chessLink : styles.notesLinkQuiet} href={l.href} target="_blank" rel="noreferrer">
              {l.label}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
