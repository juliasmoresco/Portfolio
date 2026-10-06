import type { CSSProperties } from "react";
import { pageHasArt, pageImages, type ReaderItem, type ReaderPage } from "../../content";
import { CompactViews, type CompactViewProps } from "./compact";
import { EndBlock, EndPage, Gutter, ImagePage, Lines, Plate, PrototypePage, ShowcaseWithIntro, TextPage, TextSpread, type EndProps } from "./parts";
import styles from "./Reader.module.css";

interface SkinProps {
  item: ReaderItem;
  page: ReaderPage;
  /** Desktop: every page on the current spread (one with a picture, or up to two text-only ones run together). */
  spreadPages?: ReaderPage[];
  /** Set on phones: one page per view, swiped, instead of a two-page spread. */
  compact?: CompactViewProps;
  /**
   * Desktop, closing block: `inline` sets it after the text of this (last) spread; otherwise this is a closing
   * spread of its own.
   */
  end?: { props: EndProps; inline: boolean };
}

/** A hardcover that opens on a hinge onto a two-page paper spread with a turning leaf. */
export function BookSkin({ item, page, spreadPages = [page], compact, end }: SkinProps) {
  return (
    <>
      <div className={styles.spread} style={item.accent ? ({ "--accent-fill": item.accent.fill, "--accent-on": item.accent.on, "--accent-text": item.accent.text } as CSSProperties) : undefined}>
        {compact ? (
          <CompactViews item={item} flat={false} {...compact} />
        ) : (
          <>
            {end && !end.inline ? (
              <>
                <EndPage className={styles.bookLeft} {...end.props} />
                <Gutter />
                <div className={`${styles.pageRight} ${styles.bookRight}`} />
              </>
            ) : page.showcase ? (
              <div className={styles.spreadWhole}>
                <ShowcaseWithIntro page={page} />
              </div>
            ) : page.prototype ? (
              <div className={styles.spreadWhole}>
                <PrototypePage page={page} />
              </div>
            ) : pageHasArt(page) && page.right ? (
              <>
                <ImagePage page={page} alt={page.heading || item.title} className={styles.bookLeft} />
                <Gutter />
                <ImagePage page={{ lines: [], ...page.right }} alt={page.heading || item.title} className={styles.bookRight} right />
              </>
            ) : pageHasArt(page) && page.artRight ? (
              <>
                <TextPage className={styles.bookLeft} left kicker={page.kicker} heading={page.heading || item.title} hideHeading={page.hideHeading} lines={page.lines} />
                <Gutter />
                <ImagePage page={page} alt={page.heading || item.title} className={styles.bookRight} right />
              </>
            ) : pageHasArt(page) ? (
              <>
                <ImagePage page={page} alt={page.heading || item.title} className={styles.bookLeft} />
                <Gutter />
                <TextPage className={styles.bookRight} kicker={page.kicker} heading={page.heading || item.title} hideHeading={page.hideHeading} lines={page.lines} />
              </>
            ) : (
              <TextSpread
                pages={spreadPages}
                fallbackHeading={item.title}
                leftClass={styles.bookLeft}
                rightClass={styles.bookRight}
                after={end?.inline ? <EndBlock {...end.props} /> : undefined}
              />
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
export function FolderSkin({ item, page, spreadPages = [page], compact }: SkinProps) {
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
              <TextSpread
                pages={spreadPages.map((p) => ({ ...p, heading: undefined }))}
                fallbackHeading={item.title}
                leftClass={styles.flat}
                rightClass={styles.flat}
                footer={<div className={styles.openingLabel}>{item.openingLabel}</div>}
              />
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

/** A single framed plate: wall art and the phone (which adds contact links). */
export function FrameSkin({ item, page }: SkinProps) {
  return (
    <div className={`${styles.frame} ${pageHasArt(page) ? "" : styles.frameTextOnly}`}>
      {pageHasArt(page) && <Plate images={pageImages(page)} alt={page.caption || item.title} />}
      <div className={styles.frameText}>
        {!item.hideTitle && <h2 className={`${styles.heading} ${styles.frameHeading}`}>{item.title}</h2>}
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
