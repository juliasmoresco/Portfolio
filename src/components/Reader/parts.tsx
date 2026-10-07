import { Fragment, useContext, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { hasPanel, imageUrls, pageHasArt, pageImages, type PageChart, type PagePolaroids, type ReaderPage } from "../../content";
import { useLang } from "../../i18n";
import { MOBILE_QUERY } from "../../layout";
import { IMAGE_TAG } from "./copy";
import { Model3D } from "./Model3D";
import { Cards, Compare, Funnel, Glossary, Hobbies, Journey, Migration, Palette, Personas, Poll, Quotes, Showcase, Stats, Timeline } from "./PageArt";
import { ZoomContext } from "./zoom";
import styles from "./Reader.module.css";
import { useUi } from "./ui";

/** A screenshot taller than this (height / width) scrolls inside the plate instead of shrinking to a sliver. */
const TALL = 1.8;

/**
 * The plate of a page: the page's real pictures (side by side if there are several), or the striped placeholder
 * swatch until artwork exists.
 */
export function Plate({ images = [], alt = "" }: { images?: string[]; alt?: string }) {
  const ui = useUi();
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
      <button type="button" className={styles.zoomBtn} aria-label={ui.enlargeImages(images.length)} onClick={() => enlarge({ images, alt })}>
        <svg viewBox="0 0 16 16" width="100%" height="100%" aria-hidden="true">
          <path d="M9.5 2H14v4.5M6.5 14H2V9.5M14 2 9.2 6.8M2 14l4.8-4.8" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </div>
  );
}

/**
 * A bar chart drawn in the page rather than placed as a picture, so it stays sharp and its text stays real text.
 * Each bar's width is its value as a percentage of the track; the numbers are also in the list for screen readers.
 */
function BarChart({ chart }: { chart: PageChart }) {
  let row = 0;
  return (
    <figure className={styles.chart} style={chart.color ? ({ "--bar": chart.color } as CSSProperties) : undefined}>
      {chart.kicker && <span className={styles.chartKicker}>{chart.kicker}</span>}
      <h2 className={styles.chartTitle}>{chart.title}</h2>
      {chart.groups.map((g) => (
        <section key={g.title} className={styles.chartGroup}>
          <h3 className={styles.chartGroupTitle}>{g.title}</h3>
          {g.subtitle && <p className={styles.chartGroupSub}>{g.subtitle}</p>}
          <ul className={styles.chartBars}>
            {g.bars.map((b) => (
              <li key={b.label} className={styles.chartRow}>
                <span className={styles.chartLabel}>{b.label}</span>
                <span className={styles.chartTrack} aria-hidden="true">
                  <span className={styles.chartFill} style={{ width: `${b.value}%`, animationDelay: `${0.15 + 0.08 * row++}s` }} />
                </span>
                <span className={styles.chartValue}>{b.value}%</span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </figure>
  );
}

/**
 * Photos pinned to the page like polaroids, a little crooked, with a strip of tape each. Hovering one straightens it and
 * lifts it to the top; clicking (or Enter) opens it large in the Reader's lightbox.
 */
function Polaroids({ set }: { set: PagePolaroids }) {
  const ui = useUi();
  const enlarge = useContext(ZoomContext);
  const photos = set.photos.filter((p) => imageUrls[p.image]);
  return (
    <div className={styles.polaroids}>
      {set.note && <span className={styles.polaroidNote}>{set.note}</span>}
      <ul className={styles.polaroidBoard} data-count={photos.length}>
        {photos.map((p, i) => (
          <li key={p.image} className={styles.polaroidSlot} style={{ "--i": i } as CSSProperties}>
            <button type="button" className={styles.polaroid} aria-label={`${p.caption || ui.photo} (${ui.enlarge})`} onClick={() => enlarge({ images: [imageUrls[p.image]], alt: p.caption || "", fit: true })}>
              <img src={imageUrls[p.image]} alt="" loading="lazy" decoding="async" draggable={false} />
              {p.caption && <span className={styles.polaroidCaption}>{p.caption}</span>}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** The showcase, with its intro paragraphs set like page text (bold, list items). */
/**
 * A clickable prototype from this site in an iframe, with its screens listed beside it: a click on one sends the prototype
 * there. On a desktop book the phone keeps its bezel; on a phone the prototype fills the view like the real app.
 */
export function PrototypePage({ page }: { page: ReaderPage }) {
  const ui = useUi();
  const proto = page.prototype!;
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [at, setAt] = useState<string | null>(null);
  const [full, setFull] = useState(false);
  // Phones and tablets held upright get a poster and a button instead: a prototype squeezed into a book page is hard
  // to use with a thumb, so it opens over the whole screen instead.
  const [narrow] = useState(() => typeof matchMedia === "function" && matchMedia(MOBILE_QUERY).matches);
  // The BoraInvest prototype was built in Portuguese; in Portuguese the case opens that original.
  const lang = useLang();
  const path = lang === "pt" && proto.path === "bora/" ? "bora-pt/" : proto.path;
  const base = `${import.meta.env.BASE_URL}${path}`;
  const go = (id: string) => {
    setAt(id);
    frameRef.current?.contentWindow?.postMessage({ type: "bora:jump", chapter: id }, window.location.origin);
  };
  const poster = proto.poster ? imageUrls[proto.poster] : undefined;
  return (
    <div className={`${styles.tour} ${styles.proto}`}>
      <div className={styles.tourSide}>
        <header className={styles.showcaseHead}>
          {proto.kicker && <span className={styles.kicker}>{proto.kicker}</span>}
          {proto.title && <h2 className={styles.showcaseTitle}>{proto.title}</h2>}
          {proto.intro?.length ? <Lines lines={proto.intro} className={styles.showcaseIntro} /> : null}
        </header>
        {!narrow && (
          <ol className={`${styles.tourList} ${styles.protoList}`} aria-label={ui.jumpToScreen}>
            {proto.screens.map((x, i) => (
              <li key={x.id}>
                <button type="button" className={styles.tourItem} aria-pressed={x.id === at} onClick={() => go(x.id)}>
                  <span className={styles.tourNo}>{String(i + 1).padStart(2, "0")}</span>
                  {x.label}
                </button>
              </li>
            ))}
          </ol>
        )}
        {proto.note && <p className={styles.protoNote}>{proto.note}</p>}
      </div>
      {narrow ? (
        <div className={styles.protoPoster}>
          {poster && (
            <button type="button" className={styles.protoPhone} aria-label={ui.openPrototype} onClick={() => setFull(true)}>
              <img src={poster} alt="" draggable={false} />
            </button>
          )}
          <button type="button" className={styles.chessLink} onClick={() => setFull(true)}>
            {ui.openPrototype}
          </button>
        </div>
      ) : (
        <div className={styles.protoStage}>
          <iframe ref={frameRef} src={`${base}?embed&frame`} title={proto.title ?? ui.prototype} loading="lazy" />
        </div>
      )}
      {full && <PrototypeFull src={`${base}?embed`} title={proto.title ?? ui.prototype} onClose={() => setFull(false)} />}
    </div>
  );
}

/** The prototype over the whole screen, above the Reader, with a close button; Escape closes it (and only it). */
function PrototypeFull({ src, title, onClose }: { src: string; title: string; onClose: () => void }) {
  const ui = useUi();
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      // Captured before the Reader's own Escape handler, so closing this doesn't close the book too.
      e.stopImmediatePropagation();
      onClose();
    };
    window.addEventListener("keydown", onKey, true);
    return () => {
      window.removeEventListener("keydown", onKey, true);
      prev?.focus();
    };
  }, [onClose]);
  return createPortal(
    <div className={styles.protoFull} role="dialog" aria-modal="true" aria-label={title}>
      <div className={styles.protoBar}>
        <span>{title}</span>
        <button ref={closeRef} type="button" className={styles.protoClose} onClick={onClose}>
          {ui.close}
        </button>
      </div>
      <iframe src={src} title={title} />
    </div>,
    document.body,
  );
}

export function ShowcaseWithIntro({ page }: { page: ReaderPage }) {
  const intro = page.showcase!.intro;
  return <Showcase showcase={page.showcase!} intro={intro?.length ? <Lines lines={intro} className={styles.showcaseIntro} /> : undefined} />;
}

/** A page's picture plate with its caption (or, before the artwork exists, the placeholder's description). */
function Figure({ page, alt }: { page: ReaderPage; alt: string }) {
  if (page.chart) return <BarChart chart={page.chart} />;
  if (page.polaroids) return <Polaroids set={page.polaroids} />;
  if (page.stats) return <Stats stats={page.stats} />;
  if (page.cards) return <Cards cards={page.cards} />;
  if (page.compare) return <Compare compare={page.compare} />;
  if (page.showcase) return <ShowcaseWithIntro page={page} />;
  if (page.prototype) return <PrototypePage page={page} />;
  if (page.timeline) return <Timeline timeline={page.timeline} />;
  if (page.hobbies) return <Hobbies hobbies={page.hobbies} />;
  if (page.glossary) return <Glossary glossary={page.glossary} />;
  if (page.poll) return <Poll poll={page.poll} />;
  if (page.funnel) return <Funnel funnel={page.funnel} />;
  if (page.migration) return <Migration migration={page.migration} />;
  if (page.quotes) return <Quotes quotes={page.quotes} />;
  if (page.personas) return <Personas personas={page.personas} />;
  if (page.journey) return <Journey journey={page.journey} />;
  if (page.palette) return <Palette palette={page.palette} />;
  if (page.model3d) return <Model3D model={page.model3d} />;
  const images = pageImages(page);
  return (
    <>
      <Plate images={images} alt={page.caption || alt} />
      {images.length === 0 ? (
        <p className={styles.caption}>
          {IMAGE_TAG} {page.plate}
        </p>
      ) : (
        page.caption && <p className={styles.caption}>{page.caption}</p>
      )}
    </>
  );
}

/** Left page of a spread: the image plate and its caption. */
export function ImagePage({ page, alt, className, right }: { page: ReaderPage; alt: string; className: string; right?: boolean }) {
  return (
    <div className={`${right ? styles.pageRight : styles.pageLeft} ${page.fullPage ? styles.pageFull : ""} ${hasPanel(page) ? styles.pageChart : ""} ${className}`} style={page.fullPage && page.pageColor ? { background: page.pageColor } : undefined}>
      <Figure page={page} alt={alt} />
    </div>
  );
}

/** Phone view: several pages run together, each page's picture above its text; a new heading only where it changes. */
export function ArticlePage({ pages, kicker, heading, footer, className }: { pages: ReaderPage[]; kicker?: string; heading: string; footer?: ReactNode; className: string }) {
  return (
    <div className={`${styles.pageRight} ${className}`}>
      <span className={styles.kicker}>{kicker}</span>
      {pages[0]?.hideHeading ? <div className={styles.headingGap} /> : <h2 className={styles.heading}>{heading}</h2>}
      {pages.map((page, i) => (
        <div key={i} className={styles.articleBlock}>
          {i > 0 && page.heading && page.heading !== pages[i - 1].heading && <h2 className={`${styles.heading} ${styles.articleHeading}`}>{page.heading}</h2>}
          {pageHasArt(page) && <Figure page={page} alt={page.heading || heading} />}
          <Lines lines={page.lines} className={styles.lines} />
        </div>
      ))}
      {footer}
    </div>
  );
}

/**
 * Desktop: text-only pages set across both sides of a spread, flowing from the left side into the right like
 * a printed book. A heading shows where a section starts (and at the top of each spread); `fallbackHeading`
 * stands in for pages without one (a folder's pages all share the item's title).
 */
export function TextSpread({
  pages,
  fallbackHeading,
  leftClass,
  rightClass,
  footer,
  after,
}: {
  pages: ReaderPage[];
  fallbackHeading: string;
  leftClass: string;
  rightClass: string;
  footer?: ReactNode;
  /** Set after the text, in the same flow (the closing block). */
  after?: ReactNode;
}) {
  const headingOf = (p: ReaderPage) => p.heading || fallbackHeading;
  return (
    <>
      <div className={`${styles.pageLeft} ${leftClass}`} />
      <Gutter />
      <div className={`${styles.pageRight} ${styles.spreadFooter} ${rightClass}`}>{footer}</div>
      <div className={styles.flow}>
        {pages.map((page, i) => {
          const fresh = i === 0 || headingOf(page) !== headingOf(pages[i - 1]);
          const newKicker = i === 0 || page.kicker !== pages[i - 1].kicker;
          return (
            <Fragment key={i}>
              {fresh && (
                <div className={`${styles.flowHead} ${i > 0 ? styles.flowHeadNext : ""}`}>
                  {newKicker && page.kicker && <span className={styles.kicker}>{page.kicker}</span>}
                  <h2 className={styles.heading}>{headingOf(page)}</h2>
                </div>
              )}
              <div className={styles.flowLines}>
                {page.lines.map((line, j) => (
                  <Line key={j} text={line} />
                ))}
              </div>
            </Fragment>
          );
        })}
        {after}
      </div>
    </>
  );
}


export interface EndProps {
  /** Title of the next case, if there is one. */
  next?: string;
  onNext?: () => void;
  onHello: () => void;
}

/**
 * After the last page of a case: where to go next — the next case, or the contact card. Laid out as a
 * closing page, so it reads as the end of the book, not a pop-up.
 */
export function EndPage({ className, ...end }: EndProps & { className: string }) {
  return (
    <div className={`${styles.pageRight} ${styles.endPage} ${className}`}>
      <EndBlock {...end} />
    </div>
  );
}

/** The closing block on its own, to follow the last text of a case when there's room for it. */
export function EndBlock({ next, onNext, onHello }: EndProps) {
  const ui = useUi();
  return (
    <div className={styles.endBlock}>
      <span className={styles.kicker}>{ui.theEnd}</span>
      <h2 className={styles.heading}>{ui.thanks}</h2>
      <div className={styles.endActions}>
        {next && onNext && (
          <button type="button" className={styles.endNext} onClick={onNext}>
            <span className={styles.endNextLabel}>{ui.nextCase}</span>
            <span className={styles.endNextTitle}>{next}</span>
          </button>
        )}
        <button type="button" className={styles.endHello} onClick={onHello}>
          {ui.sayHello}
        </button>
      </div>
    </div>
  );
}

export function Gutter() {
  return <div className={styles.gutter} />;
}

/** **bold** between double asterisks becomes <strong>; the asterisks themselves are never shown. */
export function Inline({ text }: { text: string }) {
  return (
    <>
      {text.split(/\*\*/).map((part, i) => (i % 2 ? <strong key={i}>{part}</strong> : part))}
    </>
  );
}

/**
 * One line of page text: a paragraph, or, when it starts with "- " or "1. ", a list item with its marker hung in
 * the margin so wrapped lines align with the text. Bold goes between ** **.
 */
export function Line({ text }: { text: string }) {
  const item = /^(?:(-) |(\d+\.) )/.exec(text);
  if (!item) {
    return (
      <p className={styles.line}>
        <Inline text={text} />
      </p>
    );
  }
  return (
    <p className={`${styles.line} ${styles.item}`}>
      <span className={styles.mark} aria-hidden={item[1] ? true : undefined}>
        {item[1] ? "•" : item[2]}
      </span>
      <span>
        <Inline text={text.slice(item[0].length)} />
      </span>
    </p>
  );
}

export function Lines({ lines, className }: { lines: string[]; className: string }) {
  return (
    <div className={className}>
      {lines.map((line, i) => (
        <Line key={i} text={line} />
      ))}
    </div>
  );
}

/** Right page of a spread: kicker, heading, description lines, optional footer. */
export function TextPage({ kicker, heading, hideHeading, lines, footer, className, left }: { kicker?: string; heading: string; hideHeading?: boolean; lines: string[]; footer?: ReactNode; className: string; left?: boolean }) {
  return (
    <div className={`${left ? styles.pageLeft : styles.pageRight} ${className}`}>
      <span className={styles.kicker}>{kicker}</span>
      {hideHeading ? <div className={styles.headingGap} /> : <h2 className={styles.heading}>{heading}</h2>}
      <Lines lines={lines} className={styles.lines} />
      {footer}
    </div>
  );
}
