import { useContext, useState, type ReactNode } from "react";
import { pageImages, type ReaderPage } from "../../content";
import { DESCRIPTION_LABEL, IMAGE_TAG } from "./copy";
import { ZoomContext } from "./zoom";
import styles from "./Reader.module.css";

/** A screenshot taller than this (height / width) scrolls inside the plate instead of shrinking to a sliver. */
const TALL = 1.8;

/**
 * The plate of a page: the page's real pictures (side by side if there are several), or the striped placeholder
 * swatch until artwork exists.
 */
export function Plate({ images = [], alt = "" }: { images?: string[]; alt?: string }) {
  const [tall, setTall] = useState(false);
  const enlarge = useContext(ZoomContext);
  if (images.length === 0) {
    return (
      <div className={styles.plate}>
        <span className={styles.plateTag}>{IMAGE_TAG}</span>
      </div>
    );
  }
  return (
    <div className={styles.plateWrap}>
      <div className={`${styles.plate} ${styles.plateImage} ${tall ? styles.plateScroll : ""}`} onClick={() => !tall && enlarge({ images, alt })}>
        {images.map((src) => (
          <img
            key={src}
            src={src}
            alt={alt}
            loading="lazy"
            decoding="async"
            draggable={false}
            onLoad={(e) => images.length === 1 && setTall(e.currentTarget.naturalHeight / e.currentTarget.naturalWidth > TALL)}
          />
        ))}
      </div>
      <button type="button" className={styles.zoomBtn} aria-label={images.length > 1 ? "Enlarge images" : "Enlarge image"} onClick={() => enlarge({ images, alt })}>
        <svg viewBox="0 0 16 16" width="100%" height="100%" aria-hidden="true">
          <path d="M9.5 2H14v4.5M6.5 14H2V9.5M14 2 9.2 6.8M2 14l4.8-4.8" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </div>
  );
}

/** Left page of a spread: the image plate and its caption. */
export function ImagePage({ page, alt, className }: { page: ReaderPage; alt: string; className: string }) {
  const images = pageImages(page);
  return (
    <div className={`${styles.pageLeft} ${className}`}>
      <Plate images={images} alt={page.caption || alt} />
      {images.length === 0 ? (
        <p className={styles.caption}>
          {IMAGE_TAG} {page.plate}
        </p>
      ) : (
        page.caption && <p className={styles.caption}>{page.caption}</p>
      )}
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
      {lines.length > 0 && <p className={styles.descLabel}>{DESCRIPTION_LABEL}</p>}
      <Lines lines={lines} className={styles.lines} />
      {footer}
    </div>
  );
}

/**
 * Text-only pages have no picture to put on the left, so the left page opens with the kicker and heading,
 * like a chapter opener, and the right page carries the text.
 */
export function TitlePage({ kicker, heading, className }: { kicker?: string; heading: string; className: string }) {
  return (
    <div className={`${styles.pageLeft} ${styles.titlePage} ${className}`}>
      <span className={styles.kicker}>{kicker}</span>
      <h2 className={`${styles.heading} ${styles.titleHeading}`}>{heading}</h2>
    </div>
  );
}

export function LinesPage({ lines, footer, className }: { lines: string[]; footer?: ReactNode; className: string }) {
  return (
    <div className={`${styles.pageRight} ${className}`}>
      {lines.length > 0 && <p className={`${styles.descLabel} ${styles.descLabelFirst}`}>{DESCRIPTION_LABEL}</p>}
      <Lines lines={lines} className={styles.lines} />
      {footer}
    </div>
  );
}
