import type { ReactNode, RefObject } from "react";
import { hasPanel, pageHasArt, textOnly, type ReaderItem, type ReaderPage } from "../../content";
import { ArticlePage, ImagePage } from "./parts";
import styles from "./Reader.module.css";

/**
 * One swipeable view on a phone. Desktop pages are cut short to fit a fixed spread, so a section often
 * runs over several pages with the same heading; on a phone those run together as one scrolling view,
 * each page's picture (if any) above its text.
 */
export interface CompactView {
  /** Indexes into the item's pages, in order. */
  pages: number[];
  /**
   * A `fullPage` picture or a drawn visual (chart, cards…) is its own view (`cover`), and the page's text comes next
   * (`text`), without the picture; a second visual (`right`) is a view of its own too (`right`).
   */
  part?: "cover" | "text" | "right";
  /** A showcase split across views on a phone: which of its screens this view shows (start, end). */
  range?: [number, number];
}

const SHOWCASE_PER_VIEW = 3;

export function buildViews(pages: ReaderPage[]): CompactView[] {
  const views: CompactView[] = [];
  pages.forEach((page, i) => {
    // A showcase is three screens to a view, so a phone never has to scroll it; the first view also has its text.
    // Desktop pages are toured one at a time inside the view, so they all share it.
    if (page.showcase?.device === "desktop") {
      views.push({ pages: [i], part: "cover" });
      if (page.lines.length) views.push({ pages: [i], part: "text" });
      return;
    }
    if (page.showcase) {
      for (let at = 0; at < page.showcase.screens.length; at += SHOWCASE_PER_VIEW) {
        views.push({ pages: [i], part: "cover", range: [at, at + SHOWCASE_PER_VIEW] });
      }
      if (page.lines.length) views.push({ pages: [i], part: "text" });
      return;
    }
    if ((page.fullPage || hasPanel(page)) && pageHasArt(page)) {
      if (page.artRight) views.push({ pages: [i], part: "text" }, { pages: [i], part: "cover" });
      else views.push({ pages: [i], part: "cover" }, { pages: [i], part: "text" });
      if (page.right) views.push({ pages: [i], part: "right" });
      // A page whose text is all in its visuals has no text view.
      if (page.lines.length === 0) views.splice(views.findIndex((v) => v.part === "text" && v.pages[0] === i), 1);
      return;
    }
    const prev = views[views.length - 1];
    const last = prev ? pages[prev.pages[prev.pages.length - 1]] : undefined;
    const sameSection = !!prev && !prev.part && !!last && !!page.heading && page.heading === last.heading && page.kicker === last.kicker;
    // A short text-only section shares the view with the one before it (same chapter), like on desktop.
    const pairs = !!prev && !prev.part && !!last && prev.pages.length === 1 && last.kicker === page.kicker && !pageHasArt(page) && !pageHasArt(last);
    if (prev && (sameSection || pairs)) prev.pages.push(i);
    else views.push({ pages: [i] });
  });
  return views;
}

export interface CompactViewProps {
  views: CompactView[];
  /** Index into `views`. */
  view: number;
  onViewChange: (index: number) => void;
  scrollerRef: RefObject<HTMLDivElement | null>;
  /** The closing block (next case, say hello), set at the end of the last view. */
  end?: ReactNode;
}

/**
 * The phone presentation of a spread: one view at a time, swiped horizontally. Native scroll-snap does the
 * paging, so a real swipe gets touch inertia and long text still scrolls vertically inside its own view.
 */
export function CompactViews({ item, flat, views, view, onViewChange, scrollerRef, end }: CompactViewProps & { item: ReaderItem; flat: boolean }) {
  const onScroll = () => {
    const el = scrollerRef.current;
    if (!el || !el.clientWidth) return;
    const i = Math.round(el.scrollLeft / el.clientWidth);
    if (i !== view) onViewChange(i);
  };

  return (
    <div ref={scrollerRef} className={styles.scroller} onScroll={onScroll}>
      {views.map((v, idx) => {
        const first = item.pages[v.pages[0]];
        const last = idx === views.length - 1;
        const key = `${v.pages.join("-")}${v.part ?? ""}${v.range?.[0] ?? ""}`;
        if (v.part === "cover" || v.part === "right") {
          let shown = v.part === "right" ? { lines: [], ...first.right } : first;
          if (v.range && first.showcase) {
            const [from, to] = v.range;
            const sc = first.showcase;
            // Later views carry on with just the title, so the screens get the room.
            shown = { ...first, showcase: { ...sc, screens: sc.screens.slice(from, to), kicker: from ? undefined : sc.kicker, intro: from ? undefined : sc.intro } };
          }
          return (
            <div key={key} className={styles.view} aria-hidden={view !== idx}>
              <ImagePage page={shown} alt={first.heading || item.title} className={flat ? styles.flat : styles.bookLeft} />
            </div>
          );
        }
        return (
          <div key={key} className={styles.view} aria-hidden={view !== idx}>
            <ArticlePage
              className={flat ? styles.flat : styles.bookRight}
              pages={v.pages.map((i) => (v.part === "text" ? textOnly(item.pages[i]) : item.pages[i]))}
              kicker={first.kicker}
              heading={flat ? item.title : first.heading || item.title}
              footer={flat ? <div className={styles.openingLabel}>{item.openingLabel}</div> : last ? end : undefined}
            />
          </div>
        );
      })}
    </div>
  );
}
