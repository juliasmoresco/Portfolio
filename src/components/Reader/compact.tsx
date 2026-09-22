import type { RefObject } from "react";
import { pageHasArt, type ReaderItem, type ReaderPage } from "../../content";
import { ImagePage, TextPage } from "./parts";
import styles from "./Reader.module.css";

/** One swipeable view: a page's picture, or its text. */
export interface CompactView {
  page: number;
  kind: "image" | "text";
}

/** A page with a picture (or a placeholder for one) is two views, image then text; a text-only page is just its text. */
export function buildViews(pages: ReaderPage[]): CompactView[] {
  return pages.flatMap((page, i): CompactView[] =>
    pageHasArt(page)
      ? [
          { page: i, kind: "image" },
          { page: i, kind: "text" },
        ]
      : [{ page: i, kind: "text" }],
  );
}

export interface CompactViewProps {
  views: CompactView[];
  /** Index into `views`. */
  view: number;
  onViewChange: (index: number) => void;
  scrollerRef: RefObject<HTMLDivElement | null>;
}

/**
 * The phone presentation of a spread: one page per view, swiped horizontally. Native scroll-snap does the
 * paging, so a real swipe gets touch inertia and long text still scrolls vertically inside its own view.
 */
export function CompactViews({ item, flat, views, view, onViewChange, scrollerRef }: CompactViewProps & { item: ReaderItem; flat: boolean }) {
  const onScroll = () => {
    const el = scrollerRef.current;
    if (!el || !el.clientWidth) return;
    const i = Math.round(el.scrollLeft / el.clientWidth);
    if (i !== view) onViewChange(i);
  };

  return (
    <div ref={scrollerRef} className={styles.scroller} onScroll={onScroll}>
      {views.map((v, idx) => {
        const page = item.pages[v.page];
        return (
          <div key={`${v.page}-${v.kind}`} className={styles.view} aria-hidden={view !== idx}>
            {v.kind === "image" ? (
              <ImagePage page={page} alt={flat ? item.title : page.heading || item.title} className={flat ? styles.flat : styles.bookLeft} />
            ) : (
              <TextPage
                className={flat ? styles.flat : styles.bookRight}
                kicker={page.kicker}
                heading={flat ? item.title : page.heading || item.title}
                lines={page.lines}
                footer={flat ? <div className={styles.openingLabel}>{item.openingLabel}</div> : undefined}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
