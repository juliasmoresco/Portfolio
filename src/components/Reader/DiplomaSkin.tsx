import { useCallback, useContext, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { imageUrls, type ReaderItem } from "../../content";
import styles from "./Reader.module.css";
import { ZoomContext } from "./zoom";
import { useUi } from "./ui";

/** A colour per school for the band across the top of its certificate; any other school gets the last one. */
const SCHOOL_TONES: Record<string, string> = {
  PM3: "#6b4fa0",
  Awari: "#d0702c",
  "Interaction Design Foundation": "#2f6e9e",
  Meiuca: "#c0476a",
  "IDEO U": "#2d2d2d",
  Mergo: "#3f8a6b",
};

/**
 * The diploma tube on the shelf, opened: its cap comes off and the owner's real diploma unrolls down from it (a scan,
 * with the birth date, ID number and validation code blurred), opening large when clicked. Beneath it, the courses
 * and specializations since, as a fan of small certificates. The line under the diploma is the owner's own.
 */
export function DiplomaSkin({ item }: { item: ReaderItem }) {
  const ui = useUi();
  const enlarge = useContext(ZoomContext);
  const d = item.degree!;
  const src = d.image ? imageUrls[d.image] : undefined;
  const courses = item.courses ?? [];
  const note = item.pages[0]?.lines[0];
  const mid = (courses.length - 1) / 2;
  // On a phone the certificates scroll sideways: say so, and fade the edge that has more behind it.
  const fan = useRef<HTMLUListElement>(null);
  const [edge, setEdge] = useState<"none" | "start" | "middle" | "end">("none");
  const onFanScroll = useCallback(() => {
    const el = fan.current;
    if (!el) return;
    // Only where the row actually scrolls (a phone); on desktop it is a fan that spills past its box on purpose.
    const max = /(auto|scroll)/.test(getComputedStyle(el).overflowX) ? el.scrollWidth - el.clientWidth : 0;
    setEdge(max <= 2 ? "none" : el.scrollLeft <= 2 ? "start" : el.scrollLeft >= max - 2 ? "end" : "middle");
  }, []);
  useLayoutEffect(() => {
    onFanScroll();
    const el = fan.current;
    if (!el) return;
    const ro = new ResizeObserver(onFanScroll);
    ro.observe(el);
    return () => ro.disconnect();
  }, [onFanScroll]);
  return (
    <div className={styles.diploma}>
      <span className={styles.chessKicker}>{item.title}</span>

      <figure className={styles.diplomaStage} aria-label={`Diploma: ${d.degree}, ${d.school}, ${d.years}`}>
        <div className={styles.diplomaTube} aria-hidden="true">
          <span className={styles.diplomaTubeBand} />
          <span className={styles.diplomaTubeBand} />
          <span className={styles.diplomaTubeCap} />
        </div>
        <div className={styles.diplomaUnroll}>
          <button
            type="button"
            className={styles.diplomaPaper}
            aria-label={`${d.degree}, ${d.school} (${ui.enlarge})`}
            onClick={() => src && enlarge({ images: [src], alt: `${d.degree}, ${d.school}`, fit: true })}
          >
            {src && <img src={src} alt="" draggable={false} />}
          </button>
          <span className={styles.diplomaRoll} aria-hidden="true" />
        </div>
      </figure>

      {note && <p className={styles.diplomaNote}>{note}</p>}

      {courses.length > 0 && (
        <section className={styles.courses} aria-label={ui.courses}>
          <div className={styles.coursesHead}>
            <span className={styles.coursesLabel}>{ui.alwaysLearning}</span>
            {edge !== "none" && edge !== "end" && (
              <span className={styles.swipeHint} aria-hidden="true">
                {ui.swipe} <span className={styles.swipeArrow}>→</span>
              </span>
            )}
          </div>
          <ul ref={fan} className={styles.courseFan} data-edge={edge} onScroll={onFanScroll}>
            {courses.map((c, i) => (
              <li key={c.school + c.course} className={styles.course} tabIndex={0} style={{ "--d": i - mid, "--i": i, "--tone": SCHOOL_TONES[c.school] ?? "#7a6a5a" } as CSSProperties}>
                <span className={styles.courseSchool}>{c.school}</span>
                <span className={styles.courseName}>{c.course}</span>
                <span className={styles.courseYear}>{c.year}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
