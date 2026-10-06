import { pageHasArt, type ReaderPage } from "../../content";
import { estimateTextHeight } from "../../content/pageFit";

/**
 * A desktop spread. A page with a picture keeps its own spread (picture left, text right). Text-only pages
 * run on across both sides of a spread instead, as many as fit, so a heading never sits alone on one side
 * and a short section doesn't get a spread to itself. A new chapter (kicker) always starts a new spread.
 */
export interface Spread {
  /** Indexes into the item's pages, in order. */
  pages: number[];
  art: boolean;
}

/**
 * Heights in the same units as estimateTextHeight (px of text at a 1000px-wide stage). One side of a spread
 * holds a heading block plus the 245px of text that pageFit allows under it; `SLACK` covers what is lost
 * where a heading has to move to the top of the next side rather than sit at the bottom of one.
 */
const SIDE = 305;
const SLACK = 45;
const headingCost = (heading: string, first: boolean) => (heading.length > 22 ? 85 : 60) + (first ? 0 : 18);

/** Estimated height of pages run together, headings included where a section starts. */
function flowHeight(pages: ReaderPage[], fallbackHeading: string): number {
  return pages.reduce((h, p, i) => {
    const heading = p.heading || fallbackHeading;
    const fresh = i === 0 || heading !== (pages[i - 1].heading || fallbackHeading);
    return h + (fresh ? headingCost(heading, i === 0) : 0) + estimateTextHeight(p.lines) + (i > 0 && !fresh ? 8 : 0);
  }, 0);
}

/** Room left on a text spread, for the closing block to join it. */
export function roomLeft(pages: ReaderPage[], fallbackHeading: string): number {
  return 2 * SIDE - SLACK - flowHeight(pages, fallbackHeading);
}

export function buildSpreads(pages: ReaderPage[], fallbackHeading: string): Spread[] {
  const spreads: Spread[] = [];
  pages.forEach((page, i) => {
    if (pageHasArt(page)) {
      spreads.push({ pages: [i], art: true });
      return;
    }
    const prev = spreads[spreads.length - 1];
    const sameChapter = prev && pages[prev.pages[0]].kicker === page.kicker;
    const fits = prev && roomLeft([...prev.pages, i].map((n) => pages[n]), fallbackHeading) >= 0;
    if (prev && !prev.art && sameChapter && fits) prev.pages.push(i);
    else spreads.push({ pages: [i], art: false });
  });
  return spreads;
}
