import { useContext, type CSSProperties } from "react";
import { imageUrls, type ReaderItem } from "../../content";
import styles from "./Reader.module.css";
import { ZoomContext } from "./zoom";

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
  const enlarge = useContext(ZoomContext);
  const d = item.degree!;
  const src = d.image ? imageUrls[d.image] : undefined;
  const courses = item.courses ?? [];
  const note = item.pages[0]?.lines[0];
  const mid = (courses.length - 1) / 2;
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
            aria-label={`${d.degree}, ${d.school} (enlarge)`}
            onClick={() => src && enlarge({ images: [src], alt: `${d.degree}, ${d.school}`, fit: true })}
          >
            {src && <img src={src} alt="" draggable={false} />}
          </button>
          <span className={styles.diplomaRoll} aria-hidden="true" />
        </div>
      </figure>

      {note && <p className={styles.diplomaNote}>{note}</p>}

      {courses.length > 0 && (
        <section className={styles.courses} aria-label="Courses and specializations">
          <span className={styles.coursesLabel}>Always learning</span>
          <ul className={styles.courseFan}>
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
