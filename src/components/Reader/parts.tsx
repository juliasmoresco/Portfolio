import type { ReactNode } from "react";
import type { ReaderPage } from "../../content";
import { DESCRIPTION_LABEL, IMAGE_TAG } from "./copy";
import styles from "./Reader.module.css";

/** Striped placeholder swatch; real artwork replaces it. */
export function Plate() {
  return (
    <div className={styles.plate}>
      <span className={styles.plateTag}>{IMAGE_TAG}</span>
    </div>
  );
}

/** Left page of a spread: the image plate and its caption. */
export function ImagePage({ page, className }: { page: ReaderPage; className: string }) {
  return (
    <div className={`${styles.pageLeft} ${className}`}>
      <Plate />
      <p className={styles.caption}>
        {IMAGE_TAG} {page.plate}
      </p>
    </div>
  );
}

export function Gutter() {
  return <div className={styles.gutter} />;
}

export function Lines({ lines, className }: { lines: string[]; className: string }) {
  return (
    <div className={className}>
      {lines.map((line, i) => (
        <p key={i} className={styles.line}>
          {line}
        </p>
      ))}
    </div>
  );
}

/** Right page of a spread: kicker, heading, description lines, optional footer. */
export function TextPage({ kicker, heading, lines, footer, className }: { kicker?: string; heading: string; lines: string[]; footer?: ReactNode; className: string }) {
  return (
    <div className={`${styles.pageRight} ${className}`}>
      <span className={styles.kicker}>{kicker}</span>
      <h2 className={styles.heading}>{heading}</h2>
      <p className={styles.descLabel}>{DESCRIPTION_LABEL}</p>
      <Lines lines={lines} className={styles.lines} />
      {footer}
    </div>
  );
}
