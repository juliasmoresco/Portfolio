import type { CSSProperties } from "react";
import { pageHasArt, pageImages, type ReaderItem, type ReaderPage } from "../../content";
import { DESCRIPTION_LABEL } from "./copy";
import { CompactViews, type CompactViewProps } from "./compact";
import { Gutter, ImagePage, Lines, LinesPage, Plate, TextPage, TitlePage } from "./parts";
import styles from "./Reader.module.css";

interface SkinProps {
  item: ReaderItem;
  page: ReaderPage;
  /** Set on phones: one page per view, swiped, instead of a two-page spread. */
  compact?: CompactViewProps;
}

/** A hardcover that opens on a hinge onto a two-page paper spread with a turning leaf. */
export function BookSkin({ item, page, compact }: SkinProps) {
  return (
    <>
      <div className={styles.spread}>
        {compact ? (
          <CompactViews item={item} flat={false} {...compact} />
        ) : (
          <>
            {pageHasArt(page) ? (
              <>
                <ImagePage page={page} alt={page.heading || item.title} className={styles.bookLeft} />
                <Gutter />
                <TextPage className={styles.bookRight} kicker={page.kicker} heading={page.heading || item.title} lines={page.lines} />
              </>
            ) : (
              <>
                <TitlePage className={styles.bookLeft} kicker={page.kicker} heading={page.heading || item.title} />
                <Gutter />
                <LinesPage className={styles.bookRight} lines={page.lines} />
              </>
            )}
            <div className={styles.leaf}>
              <div className={styles.leafFace} />
            </div>
          </>
        )}
      </div>
      <div className={styles.cover} style={item.spine ? ({ "--spine": item.spine } as CSSProperties) : undefined}>
        <div className={styles.coverFront}>
          <div className={styles.coverContent}>
            <span className={styles.coverTag}>{item.tag}</span>
            <h2 className={styles.coverTitle}>{item.title}</h2>
            <div className={styles.coverMeta}>
              <span>{item.role}</span>
              <span>{item.year}</span>
            </div>
          </div>
        </div>
        <div className={styles.coverBack} />
      </div>
    </>
  );
}

/** Same spread on flat stock; `opening` (hinge, tube, binder, lid) only changes how the shell arrives. */
export function FolderSkin({ item, page, compact }: SkinProps) {
  return (
    <>
      <div className={styles.spread}>
        {compact ? (
          <CompactViews item={item} flat {...compact} />
        ) : (
          <>
            {pageHasArt(page) ? (
              <>
                <ImagePage page={page} alt={item.title} className={styles.flat} />
                <Gutter />
                <TextPage className={styles.flat} kicker={page.kicker} heading={item.title} lines={page.lines} footer={<div className={styles.openingLabel}>{item.openingLabel}</div>} />
              </>
            ) : (
              <>
                <TitlePage className={styles.flat} kicker={page.kicker} heading={item.title} />
                <Gutter />
                <LinesPage className={styles.flat} lines={page.lines} footer={<div className={styles.openingLabel}>{item.openingLabel}</div>} />
              </>
            )}
            <div className={styles.leaf}>
              <div className={styles.leafFace} />
            </div>
          </>
        )}
      </div>
      <div className={styles.lid} />
    </>
  );
}

/** A single framed plate: wall art, the llama, and the phone (which adds contact links). */
export function FrameSkin({ item, page }: SkinProps) {
  return (
    <div className={`${styles.frame} ${pageHasArt(page) ? "" : styles.frameTextOnly}`}>
      {pageHasArt(page) && <Plate images={pageImages(page)} alt={page.caption || item.title} />}
      <div className={styles.frameText}>
        <h2 className={`${styles.heading} ${styles.frameHeading}`}>{item.title}</h2>
        <p className={`${styles.descLabel} ${styles.frameDescLabel}`}>{DESCRIPTION_LABEL}</p>
        <Lines lines={page.lines} className={styles.frameLines} />
        {item.links && item.links.length > 0 && (
          <div className={styles.links}>
            {item.links.map((l) => (
              <a key={l.label} className={styles.link} href={l.href} {...(/^https?:/.test(l.href) ? { target: "_blank", rel: "noreferrer" } : {})}>
                {l.label}
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
