import type { RefObject } from "react";
import type { ReaderItem } from "../../content";
import { ImagePage, TextPage } from "./parts";
import styles from "./Reader.module.css";

export interface CompactViewProps {
  /** Index into the flattened views: page 0 image, page 0 text, page 1 image, ... */
  view: number;
  onViewChange: (index: number) => void;
  scrollerRef: RefObject<HTMLDivElement | null>;
}

/**
 * The phone presentation of a spread: one page per view, swiped horizontally. Each content page
 * becomes two views (its image, then its text). Native scroll-snap does the paging, so a real
 * swipe gets touch inertia and long text still scrolls vertically inside its own view.
 */
export function CompactViews({ item, flat, view, onViewChange, scrollerRef }: CompactViewProps & { item: ReaderItem; flat: boolean }) {
  const onScroll = () => {
    const el = scrollerRef.current;
    if (!el || !el.clientWidth) return;
    const i = Math.round(el.scrollLeft / el.clientWidth);
    if (i !== view) onViewChange(i);
  };

  return (
    <div ref={scrollerRef} className={styles.scroller} onScroll={onScroll}>
      {item.pages.flatMap((page, i) => [
        <div key={`${i}-image`} className={styles.view} aria-hidden={view !== i * 2}>
          <ImagePage page={page} className={flat ? styles.flat : styles.bookLeft} />
        </div>,
        <div key={`${i}-text`} className={styles.view} aria-hidden={view !== i * 2 + 1}>
          <TextPage
            className={flat ? styles.flat : styles.bookRight}
            kicker={page.kicker}
            heading={flat ? item.title : page.heading || item.title}
            lines={page.lines}
            footer={flat ? <div className={styles.openingLabel}>{item.openingLabel}</div> : undefined}
          />
        </div>,
      ])}
    </div>
  );
}
