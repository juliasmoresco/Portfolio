import { useContext, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from "react";
import { getReaderItem, imageUrls, type HobbyIcon, type PageCards, type PageCompare, type PageFunnel, type PageGlossary, type PageHobbies, type PageJourney, type PageMigration, type PagePalette, type PagePersonas, type PagePoll, type PageQuotes, type PageShowcase, type PageStats, type PageTimeline } from "../../content";
import { emitSelect } from "../../scene/events";
import type { SceneHotspotId } from "../../scene/hotspots";
import { usePrefersReducedMotion } from "../../hooks/usePrefersReducedMotion";
import styles from "./Reader.module.css";
import { ZoomContext } from "./zoom";
import { useUi } from "./ui";

/** True once the element has been on screen (a phone renders every view of a book at once, side by side). */
function useSeen<T extends Element>(): [RefObject<T | null>, boolean] {
  const ref = useRef<T>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || seen) return;
    if (typeof IntersectionObserver === "undefined") return setSeen(true);
    const io = new IntersectionObserver((entries) => entries.some((e) => e.isIntersecting) && setSeen(true), { threshold: 0.4 });
    io.observe(el);
    return () => io.disconnect();
  }, [seen]);
  return [ref, seen];
}

/** Counts from 0 up to `to` once `run` turns true, easing out over about a second. */
function useCountUp(to: number, run: boolean, delay: number): number {
  const reduced = usePrefersReducedMotion();
  const [v, setV] = useState(reduced ? to : 0);
  useEffect(() => {
    if (!run) return;
    if (reduced) return setV(to);
    let raf = 0;
    const t0 = performance.now() + delay;
    const DUR = 1100;
    const tick = (now: number) => {
      const k = Math.min(Math.max((now - t0) / DUR, 0), 1);
      setV(to * (1 - (1 - k) ** 3));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [run, to, delay, reduced]);
  return v;
}

function Stat({ item, run, index }: { item: PageStats["items"][number]; run: boolean; index: number }) {
  const n = useCountUp(Math.abs(item.value ?? 0), run, index * 180);
  const sign = item.value === undefined ? "" : item.value < 0 ? "–" : item.value > 0 && item.signed ? "+" : "";
  const d = item.decimals ?? 0;
  const shown = item.value === undefined ? item.display : `${sign}${n.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d })}`;
  return (
    <li className={styles.stat}>
      <span className={styles.statValue}>
        {shown}
        {item.unit && <span className={styles.statUnit}>{item.unit}</span>}
      </span>
      <span className={styles.statLabel}>{item.label}</span>
    </li>
  );
}

/** Big result numbers that count up, scoreboard-style, the first time the page is seen. */
export function Stats({ stats }: { stats: PageStats }) {
  const [ref, seen] = useSeen<HTMLDivElement>();
  return (
    <div ref={ref} className={styles.stats}>
      {stats.kicker && <span className={styles.chartKicker}>{stats.kicker}</span>}
      {stats.title && <h2 className={styles.chartTitle}>{stats.title}</h2>}
      <ul className={styles.statList} data-count={stats.items.length}>
        {stats.items.map((it, i) => (
          <Stat key={it.label} item={it} run={seen} index={i} />
        ))}
      </ul>
    </div>
  );
}

/** Numbered cards that open one at a time to show what was behind each problem, and a quote where there is one. */
export function Cards({ cards }: { cards: PageCards }) {
  const [open, setOpen] = useState(0);
  return (
    <div className={styles.cards}>
      {cards.kicker && <span className={styles.chartKicker}>{cards.kicker}</span>}
      {cards.title && <h2 className={styles.chartTitle}>{cards.title}</h2>}
      <ol className={styles.cardList} data-count={cards.items.length}>
        {cards.items.map((c, i) => {
          const isOpen = open === i;
          const id = `card-${i}-${c.title.length}`;
          return (
            <li key={c.title} className={styles.card} data-open={isOpen || undefined}>
              <button type="button" className={styles.cardHead} aria-expanded={isOpen} aria-controls={id} onClick={() => setOpen(isOpen ? -1 : i)}>
                <span className={styles.cardNo}>{i + 1}</span>
                <span className={styles.cardTitle}>{c.title}</span>
                <span className={styles.cardChevron} aria-hidden="true" />
              </button>
              <div id={id} className={styles.cardBody} hidden={!isOpen}>
                <p>{c.body}</p>
                {c.quote && (
                  <blockquote className={styles.cardQuote}>
                    <p>“{c.quote}”</p>
                    {c.source && <cite>{c.source}</cite>}
                  </blockquote>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/**
 * Versions of a design side by side in time rather than space: a toggle switches the phone screens below it, and the
 * version that won is marked. Clicking a screen opens it large.
 */
export function Compare({ compare }: { compare: PageCompare }) {
  const ui = useUi();
  const enlarge = useContext(ZoomContext);
  const [at, setAt] = useState(0);
  const v = compare.variants[at];
  const urls = v.images.map((n) => imageUrls[n]).filter(Boolean);
  return (
    <div className={styles.compare}>
      {compare.kicker && <span className={styles.chartKicker}>{compare.kicker}</span>}
      {compare.title && <h2 className={styles.chartTitle}>{compare.title}</h2>}
      {compare.description && <p className={styles.compareDescription}>{compare.description}</p>}
      <div className={styles.compareToggle} role="group" aria-label={ui.chooseVersion}>
        {compare.variants.map((x, i) => (
          <button key={x.label} type="button" className={styles.compareOption} aria-pressed={i === at} onClick={() => setAt(i)}>
            {x.label}
            {x.winner && <span className={styles.compareWinner}>{ui.winner}</span>}
          </button>
        ))}
      </div>
      {compare.device === "desktop" ? (
        <div key={at} className={styles.compareDesktop} data-count={Math.min(urls.length, 2)}>
          {urls.slice(0, 2).map((src, i) => (
            <FitBrowser key={src} src={src} label={`${v.label}, screen ${i + 1}`} className={styles.compareWindow} align={urls.length > 1 ? (i === 0 ? "start" : "end") : "center"} onOpen={() => enlarge({ images: [src], alt: v.label, fit: true })} />
          ))}
        </div>
      ) : (
        <div key={at} className={styles.compareScreens} data-count={urls.length}>
          {urls.map((src, i) => (
            <button key={src} type="button" className={styles.comparePhone} aria-label={`${v.label}, ${ui.screenN(i + 1)} (${ui.enlarge})`} onClick={() => enlarge({ images: [src], alt: v.label, fit: true })}>
              <img src={src} alt="" draggable={false} />
            </button>
          ))}
        </div>
      )}
      {v.note && (
        <p key={`n${at}`} className={styles.compareNote}>
          {v.note}
        </p>
      )}
    </div>
  );
}

/**
 * Finished screens in a gentle fan, each labelled; hovering one lifts it, clicking opens it large. On desktop it spans the
 * whole spread (the Reader drops the two pages for it); on a phone it fills a view.
 */
export function Showcase({ showcase, intro }: { showcase: PageShowcase; intro?: ReactNode }) {
  if (showcase.device === "desktop") return <ShowcaseTour showcase={showcase} intro={intro} />;
  return <ShowcaseFan showcase={showcase} intro={intro} />;
}

function ShowcaseFan({ showcase, intro }: { showcase: PageShowcase; intro?: ReactNode }) {
  const ui = useUi();
  const enlarge = useContext(ZoomContext);
  const screens = showcase.screens.filter((x) => imageUrls[x.image]);
  const mid = (screens.length - 1) / 2;
  return (
    <div className={styles.showcase}>
      <header className={styles.showcaseHead}>
        {showcase.kicker && <span className={styles.kicker}>{showcase.kicker}</span>}
        {showcase.title && <h2 className={styles.showcaseTitle}>{showcase.title}</h2>}
        {intro}
      </header>
      <ul className={styles.showcaseRow} style={{ "--n": screens.length } as CSSProperties}>
        {screens.map((x, i) => {
          const d = i - mid;
          return (
            <li key={x.image} className={styles.showcaseItem} style={{ "--d": d, "--i": i } as CSSProperties}>
              <button type="button" className={styles.showcasePhone} aria-label={`${x.label} (${ui.enlarge})`} onClick={() => enlarge({ images: [imageUrls[x.image]], alt: x.label, fit: true })}>
                <img src={imageUrls[x.image]} alt="" draggable={false} />
              </button>
              <span className={styles.showcaseLabel}>{x.label}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/**
 * Places worked, drawn down the page as stops on a line that grows in when the page is first seen. The current one is
 * filled and marked "Now".
 */
export function Timeline({ timeline }: { timeline: PageTimeline }) {
  const ui = useUi();
  const [ref, seen] = useSeen<HTMLDivElement>();
  return (
    <div ref={ref} className={styles.timeline} data-seen={seen || undefined}>
      {timeline.kicker && <span className={styles.chartKicker}>{timeline.kicker}</span>}
      {timeline.title && <h2 className={styles.chartTitle}>{timeline.title}</h2>}
      <ol className={styles.timelineList}>
        {timeline.stops.map((s, i) => (
          <li key={s.name + s.year} className={styles.timelineStop} data-now={s.now || undefined} style={{ "--i": i } as CSSProperties}>
            <span className={styles.timelineYear}>{s.year}</span>
            <span className={styles.timelineDot} aria-hidden="true" />
            <span className={styles.timelineBody}>
              <span className={styles.timelineName}>
                {s.name}
                {s.now && <span className={styles.timelineNow}>{ui.now}</span>}
              </span>
              <span className={styles.timelineRole}>{s.role}</span>
              {s.note && <span className={styles.timelineNote}>{s.note}</span>}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

const HOBBY_PATHS: Record<HobbyIcon, ReactNode> = {
  read: <path d="M3 5.5c2.5-1 5.5-1 9 1 3.5-2 6.5-2 9-1v13c-2.5-1-5.5-1-9 1-3.5-2-6.5-2-9-1zM12 6.5v13" />,
  draw: <path d="M4 20l1.2-4.2L16 5l3 3L8.2 18.8zM14 7l3 3" />,
  gym: <path d="M6.5 7.5v9M17.5 7.5v9M3.5 10v4M20.5 10v4M6.5 12h11" />,
  yoga: (
    <>
      <circle cx="12" cy="5" r="2" />
      <path d="M12 7.5v5.5M6 10.5l6 2.5 6-2.5M4.5 19c2.5-3 5-3.5 7.5-3.5s5 .5 7.5 3.5" />
    </>
  ),
  chess: (
    <>
      <circle cx="12" cy="6" r="2.5" />
      <path d="M9.5 10.5h5M10.2 10.5l-1.2 6.5M13.8 10.5l1.2 6.5M8 17h8M6.5 20.5h11" />
    </>
  ),
  travel: <path d="M3 11.5l18-7.5-7.5 18-2.5-8zM11 14l10-10" />,
  globe: (
    <>
      <circle cx="12" cy="10" r="6.5" />
      <path d="M5.5 10h13M12 3.5c2 2 2.8 4.2 2.8 6.5S14 14.5 12 16.5M12 3.5C10 5.5 9.2 7.7 9.2 10s.8 4.5 2.8 6.5M12 16.5V20M8 20.5h8" />
    </>
  ),
  phone: (
    <>
      <path d="M4 10.5c0-3 3.6-5 8-5s8 2 8 5l-2.6 1h-2.2l-.8-2h-4.8l-.8 2H6.6zM6 13h12l1 6.5H5z" />
      <circle cx="12" cy="16.2" r="1.6" />
    </>
  ),
  diploma: <path d="M4 7.5h12.5a3.2 3.2 0 0 1 0 6.4H4zM4 7.5a3.2 3.2 0 0 0 0 6.4M8 13.9v6.1l1.8-1.3 1.8 1.3v-6.1" />,
  notes: <path d="M5 4.5h14v15H5zM8.5 9h7M8.5 12h7M8.5 15h4.5" />,
  cat: (
    <>
      <path d="M5.5 20v-8.5L4.5 5l4 3h7l4-3-1 6.5V20z" />
      <path d="M9.5 13h.01M14.5 13h.01M11 16h2" />
    </>
  ),
  coin: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M14.4 9.4c-.5-.9-1.4-1.3-2.4-1.3-1.4 0-2.4.7-2.4 1.8 0 2.6 4.9 1.4 4.9 4.1 0 1.1-1.1 1.9-2.5 1.9-1.1 0-2.1-.5-2.6-1.4M12 6.5v1.6M12 15.9v1.6" />
    </>
  ),
  postcard: <path d="M3 6h18v12H3zM12 6v12M14.5 9.5h4M14.5 12.5h4M14.5 15.5h2.5M5.5 9.5h4" />,
  resume: <path d="M6 3.5h9l3 3v14H6zM15 3.5v3h3M9 10h6M9 13h6M9 16h4" />,
};

/** A hobby's little drawing, in the line style of the page. */
function HobbyGlyph({ icon }: { icon: HobbyIcon }) {
  return (
    <svg className={styles.hobbyGlyph} viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      {HOBBY_PATHS[icon]}
    </svg>
  );
}

/**
 * Things done off the clock, as a sheet of round stickers, a little crooked. The ones that live in the office too (the
 * chess set, the globe) are buttons that open that object straight from here.
 */
export function Hobbies({ hobbies }: { hobbies: PageHobbies }) {
  return (
    <div className={styles.hobbies}>
      {hobbies.kicker && <span className={styles.chartKicker}>{hobbies.kicker}</span>}
      {hobbies.title && <h2 className={styles.chartTitle}>{hobbies.title}</h2>}
      <ul className={styles.hobbyGrid} data-many={hobbies.items.length > 6 || undefined}>
        {hobbies.items.map((h, i) => {
          const target = h.open ? getReaderItem(h.open) : undefined;
          const inner = (
            <>
              <span className={styles.hobbyBadge} data-icon={h.icon}>
                <HobbyGlyph icon={h.icon} />
              </span>
              <span className={styles.hobbyLabel}>{h.label}</span>
              {target && <span className={styles.hobbyGo}>{h.openLabel ?? `Open ${target.title}`} →</span>}
            </>
          );
          return (
            <li key={h.label} className={styles.hobbySlot} style={{ "--i": i } as CSSProperties}>
              {target ? (
                <button type="button" className={styles.hobby} data-link="" onClick={() => emitSelect({ id: h.open as SceneHotspotId })}>
                  {inner}
                </button>
              ) : (
                <span className={styles.hobby}>{inner}</span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/**
 * A desktop web page in a plain browser window, always whole: the window takes the page's own shape and is as large
 * as fits in the space it is given (tall pages make a narrower window), never cropping it. Clicking opens it large.
 */
function FitBrowser({ src, label, className, align = "center", onOpen }: { src: string; label: string; className?: string; align?: "start" | "center" | "end"; onOpen: () => void }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLSpanElement>(null);
  const [ratio, setRatio] = useState(0);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  useLayoutEffect(() => {
    const box = boxRef.current;
    if (!box || !ratio) return;
    const fit = () => {
      const bar = barRef.current?.offsetHeight ?? 0;
      const W = box.clientWidth;
      const H = box.clientHeight;
      let w = W;
      let h = W / ratio + bar;
      if (h > H) {
        h = H;
        w = (H - bar) * ratio;
      }
      setSize({ w: Math.floor(w), h: Math.floor(h) });
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(box);
    return () => ro.disconnect();
  }, [ratio]);
  const measure = (img: HTMLImageElement | null) => {
    if (img?.complete && img.naturalWidth) setRatio(img.naturalWidth / img.naturalHeight);
  };
  return (
    <div ref={boxRef} className={`${styles.fitBox} ${className ?? ""}`} data-align={align}>
      <button type="button" className={styles.browser} style={size ? { width: size.w, height: size.h } : { visibility: "hidden" }} aria-label={`${label} (enlarge)`} onClick={onOpen}>
        <span ref={barRef} className={styles.browserBar} aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        <span className={styles.browserView}>
          <img ref={measure} src={src} alt="" draggable={false} onLoad={(e) => setRatio(e.currentTarget.naturalWidth / e.currentTarget.naturalHeight)} />
        </span>
      </button>
    </div>
  );
}

/** Desktop pages, one at a time in a browser window, picked from the list of their names beside it. */
function ShowcaseTour({ showcase, intro }: { showcase: PageShowcase; intro?: ReactNode }) {
  const ui = useUi();
  const enlarge = useContext(ZoomContext);
  const screens = showcase.screens.filter((x) => imageUrls[x.image]);
  const [at, setAt] = useState(0);
  const cur = screens[Math.min(at, screens.length - 1)];
  if (!cur) return null;
  return (
    <div className={styles.tour}>
      <div className={styles.tourSide}>
        {(showcase.kicker || showcase.title || intro) && (
          <header className={styles.showcaseHead}>
            {showcase.kicker && <span className={styles.kicker}>{showcase.kicker}</span>}
            {showcase.title && <h2 className={styles.showcaseTitle}>{showcase.title}</h2>}
            {intro}
          </header>
        )}
        <ol className={styles.tourList} aria-label={ui.screens}>
          {screens.map((x, i) => (
            <li key={x.image}>
              <button type="button" className={styles.tourItem} aria-pressed={i === at} onClick={() => setAt(i)}>
                <span className={styles.tourNo}>{String(i + 1).padStart(2, "0")}</span>
                {x.label}
              </button>
            </li>
          ))}
        </ol>
      </div>
      <FitBrowser key={cur.image} src={imageUrls[cur.image]} label={cur.label} className={styles.tourWindow} onOpen={() => enlarge({ images: [imageUrls[cur.image]], alt: cur.label, fit: true })} />
    </div>
  );
}

/** Terms on cards, each turning over on a tap to say what it means. */
export function Glossary({ glossary }: { glossary: PageGlossary }) {
  const [open, setOpen] = useState<ReadonlySet<number>>(new Set());
  const flip = (i: number) =>
    setOpen((o) => {
      const n = new Set(o);
      if (n.has(i)) n.delete(i);
      else n.add(i);
      return n;
    });
  return (
    <div className={styles.glossary}>
      {glossary.kicker && <span className={styles.chartKicker}>{glossary.kicker}</span>}
      {glossary.title && <h2 className={styles.chartTitle}>{glossary.title}</h2>}
      <ul className={styles.glossaryGrid} data-count={glossary.items.length}>
        {glossary.items.map((t, i) => (
          <li key={t.term} className={styles.glossarySlot}>
            <button type="button" className={styles.glossaryCard} aria-pressed={open.has(i)} aria-label={open.has(i) ? `${t.term}: ${t.body}` : `${t.term} (show what it means)`} onClick={() => flip(i)}>
              <span className={styles.glossaryFront} aria-hidden={open.has(i)}>
                <span className={styles.glossaryTerm}>{t.term}</span>
                {t.note && <span className={styles.glossaryNote}>{t.note}</span>}
                <span className={styles.glossaryTurn} aria-hidden="true">↻</span>
              </span>
              <span className={styles.glossaryBack} aria-hidden={!open.has(i)}>
                <span className={styles.glossaryBackTerm}>{t.term}</span>
                {t.body}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** A question for the reader: pick an answer, then see the real one and why. */
export function Poll({ poll }: { poll: PagePoll }) {
  const ui = useUi();
  const [picked, setPicked] = useState<number | null>(null);
  const done = picked !== null;
  return (
    <div className={styles.poll}>
      {poll.kicker && <span className={styles.chartKicker}>{poll.kicker}</span>}
      {poll.title && <h2 className={styles.chartTitle}>{poll.title}</h2>}
      <p className={styles.pollQuestion}>{poll.question}</p>
      <ul className={styles.pollOptions}>
        {poll.options.map((o, i) => {
          const state = !done ? undefined : i === poll.answer ? "right" : i === picked ? "wrong" : "other";
          return (
            <li key={o.label}>
              <button type="button" className={styles.pollOption} data-state={state} disabled={done} aria-pressed={picked === i} onClick={() => setPicked(i)}>
                <span className={styles.pollLabel}>{o.label}</span>
                {o.note && <span className={styles.pollNote}>{o.note}</span>}
                {state === "right" && <span className={styles.pollMark}>{poll.answerLabel ?? "Answer"}</span>}
                {state === "wrong" && <span className={styles.pollMark}>{ui.yourPick}</span>}
              </button>
            </li>
          );
        })}
      </ul>
      <p className={styles.pollReveal} aria-live="polite" data-shown={done || undefined}>
        {done ? (
          <>
            <strong>{picked === poll.answer ? `${ui.right} ` : `${ui.notQuite} `}</strong>
            {poll.reveal}
          </>
        ) : (
          (poll.prompt ?? ui.pickToSee)
        )}
      </p>
      {done && (
        <button type="button" className={styles.pollAgain} onClick={() => setPicked(null)}>
          {ui.tryAgain}
        </button>
      )}
    </div>
  );
}

/** Steps that narrow, as bars that grow in when the page is first seen, each against the first. */
export function Funnel({ funnel }: { funnel: PageFunnel }) {
  const [ref, seen] = useSeen<HTMLDivElement>();
  const max = Math.max(...funnel.steps.map((st) => st.value), 1);
  return (
    <div ref={ref} className={styles.funnel} data-seen={seen || undefined}>
      {funnel.kicker && <span className={styles.chartKicker}>{funnel.kicker}</span>}
      {funnel.title && <h2 className={styles.chartTitle}>{funnel.title}</h2>}
      <div className={styles.funnelBody}>
        <ol className={styles.funnelList}>
          {funnel.steps.map((st, i) => (
            <FunnelStep key={st.label} step={st} share={st.value / max} run={seen} index={i} />
          ))}
        </ol>
        {funnel.note && <p className={styles.funnelNote}>{funnel.note}</p>}
      </div>
    </div>
  );
}

function FunnelStep({ step, share, run, index }: { step: PageFunnel["steps"][number]; share: number; run: boolean; index: number }) {
  const v = useCountUp(step.value, run, index * 180);
  return (
    <li className={styles.funnelStep} style={{ "--share": share, "--i": index } as CSSProperties}>
      <span className={styles.funnelValue}>{step.display ?? Math.round(v).toLocaleString("en-US")}</span>
      <span className={styles.funnelTrack}>
        <span className={styles.funnelBar} />
      </span>
      <span className={styles.funnelLabel}>{step.label}</span>
    </li>
  );
}

const MOVE_MS = 260;

/**
 * A move between two places: the items start on the left and cross to the right one by one when the page is first
 * seen, while the number counts up; it can be played again.
 */
export function Migration({ migration }: { migration: PageMigration }) {
  const [ref, seen] = useSeen<HTMLDivElement>();
  const reduced = usePrefersReducedMotion();
  const n = migration.items.length;
  const [moved, setMoved] = useState(0);
  const [round, setRound] = useState(0);
  useEffect(() => {
    if (!seen) return;
    if (reduced) return setMoved(n);
    setMoved(0);
    let k = 0;
    const t = window.setInterval(() => {
      k += 1;
      setMoved(k);
      if (k >= n) window.clearInterval(t);
    }, MOVE_MS);
    return () => window.clearInterval(t);
  }, [seen, reduced, n, round]);
  const shown = useCountUp(migration.value, seen && moved >= n, 0);
  return (
    <div ref={ref} className={styles.migration}>
      {migration.kicker && <span className={styles.chartKicker}>{migration.kicker}</span>}
      {migration.title && <h2 className={styles.chartTitle}>{migration.title}</h2>}
      <div className={styles.migrationCount}>
        <span className={styles.migrationValue}>
          {Math.round(moved >= n ? shown : (migration.value * moved) / n)}
          {migration.unit}
        </span>
        <span className={styles.migrationCaption}>{migration.caption}</span>
      </div>
      <div className={styles.migrationBoard}>
        <div className={styles.migrationCol}>
          <span className={styles.migrationHead}>{migration.from}</span>
          <ul>
            {migration.items.slice(moved).map((x) => (
              <li key={x} className={styles.migrationItem}>
                {x}
              </li>
            ))}
          </ul>
        </div>
        <span className={styles.migrationArrow} aria-hidden="true">
          →
        </span>
        <div className={styles.migrationCol} data-to="">
          <span className={styles.migrationHead}>{migration.to}</span>
          <ul>
            {migration.items.slice(0, moved).map((x) => (
              <li key={x} className={styles.migrationItem} data-arrived="">
                {x}
              </li>
            ))}
          </ul>
        </div>
      </div>
      {moved >= n && !reduced && (
        <button type="button" className={styles.migrationReplay} onClick={() => setRound((r) => r + 1)}>
          ↻ Play again
        </button>
      )}
    </div>
  );
}

/** Users' words, one quote at a time, turned with the arrows or a tap on the quote. */
export function Quotes({ quotes }: { quotes: PageQuotes }) {
  const ui = useUi();
  const [at, setAt] = useState(0);
  const n = quotes.items.length;
  const go = (d: number) => setAt((i) => (i + d + n) % n);
  const q = quotes.items[at];
  return (
    <div className={styles.quotes}>
      {quotes.kicker && <span className={styles.chartKicker}>{quotes.kicker}</span>}
      {quotes.title && <h2 className={styles.chartTitle}>{quotes.title}</h2>}
      <figure key={at} className={styles.quoteCard} data-tone={at % 3} onClick={() => go(1)}>
        <span className={styles.quoteMark} aria-hidden="true">
          “
        </span>
        <blockquote className={styles.quoteText} aria-live="polite">
          {q.text}
        </blockquote>
        <figcaption className={styles.quoteBy}>
          {q.by && <strong>{q.by}</strong>}
          {quotes.note && <span>{quotes.note}</span>}
        </figcaption>
      </figure>
      {n > 1 && (
        <div className={styles.quoteNav}>
          <button type="button" className={styles.quoteArrow} aria-label={ui.prevQuote} onClick={() => go(-1)}>
            ‹
          </button>
          <span className={styles.quoteCount}>
            {at + 1} / {n}
          </span>
          <button type="button" className={styles.quoteArrow} aria-label={ui.nextQuote} onClick={() => go(1)}>
            ›
          </button>
        </div>
      )}
    </div>
  );
}

/** Personas, one at a time behind tabs: a portrait and who they are, then their situation and what they need. */
export function Personas({ personas }: { personas: PagePersonas }) {
  const ui = useUi();
  const [at, setAt] = useState(0);
  const p = personas.items[at];
  return (
    <div className={styles.personas}>
      {personas.kicker && <span className={styles.chartKicker}>{personas.kicker}</span>}
      {personas.title && <h2 className={styles.chartTitle}>{personas.title}</h2>}
      <div className={styles.compareToggle} role="group" aria-label={ui.choosePersona}>
        {personas.items.map((x, i) => (
          <button key={x.name} type="button" className={styles.compareOption} aria-pressed={i === at} onClick={() => setAt(i)}>
            {x.name.split(",")[0]}
          </button>
        ))}
      </div>
      <article key={at} className={styles.persona}>
        <header className={styles.personaHead}>
          {p.image && imageUrls[p.image] && <img className={styles.personaPhoto} src={imageUrls[p.image]} alt="" draggable={false} />}
          <span className={styles.personaWho}>
            <span className={styles.personaName}>{p.name}</span>
            <span className={styles.personaRole}>{p.role}</span>
            <span className={styles.personaFacts}>{p.facts.join(" · ")}</span>
          </span>
        </header>
        <p className={styles.personaAbout}>{p.about}</p>
        <ul className={styles.personaTraits} aria-label={ui.traits}>
          {p.traits.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
        {p.behavior && (
          <section className={styles.personaBehavior}>
            <span className={styles.personaLabel}>{ui.behavior}</span>
            <ul>
              {p.behavior.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          </section>
        )}
        <div className={styles.personaCols}>
          <section>
            <span className={styles.personaLabel}>{ui.context}</span>
            <ul>
              {p.context.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          </section>
          <section>
            <span className={styles.personaLabel}>{ui.needs}</span>
            <ul>
              {p.needs.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          </section>
        </div>
      </article>
    </div>
  );
}

const MOOD_FACE: Record<number, string> = { 1: "😣", 2: "😟", 3: "🤔", 4: "🙂", 5: "🤩" };

/**
 * A journey as a mood line across its stages: each mood is a face on the line, high when things go well. Tapping a
 * stage (or a face) shows what the person does there and how it feels.
 */
export function Journey({ journey }: { journey: PageJourney }) {
  const ui = useUi();
  const [person, setPerson] = useState(0);
  const [at, setAt] = useState(0);
  const [ref, seen] = useSeen<HTMLDivElement>();
  const { who, stages } = journey.people[person];
  const n = stages.length;
  // Points across the width: each stage gets an equal column, its moods spread inside it.
  const pts = stages.flatMap((st, si) =>
    st.moods.map((m, mi) => ({ si, m, x: ((si + (mi + 1) / (st.moods.length + 1)) / n) * 100, y: 12 + ((5 - m) / 4) * 76 })),
  );
  const path = pts.map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" ");
  const st = stages[Math.min(at, n - 1)];
  return (
    <div ref={ref} className={styles.journey} data-seen={seen || undefined}>
      {journey.kicker && <span className={styles.chartKicker}>{journey.kicker}</span>}
      {journey.title && <h2 className={styles.chartTitle}>{journey.title}</h2>}
      {journey.people.length > 1 && (
        <div className={styles.compareToggle} role="group" aria-label={ui.whoseJourney}>
          {journey.people.map((p, i) => (
            <button
              key={p.who}
              type="button"
              className={styles.compareOption}
              aria-pressed={i === person}
              onClick={() => {
                setPerson(i);
                setAt(0);
              }}
            >
              {p.who}
            </button>
          ))}
        </div>
      )}
      <div key={person} className={styles.journeyChart}>
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <path d={path} className={styles.journeyLine} />
        </svg>
        {pts.map((p, i) => (
          <button
            key={i}
            type="button"
            className={styles.journeyFace}
            data-on={p.si === at || undefined}
            style={{ left: `${p.x}%`, top: `${p.y}%`, "--i": i } as CSSProperties}
            aria-label={`${stages[p.si].name}: ${ui.mood(p.m)}`}
            onClick={() => setAt(p.si)}
          >
            {MOOD_FACE[Math.round(p.m)]}
          </button>
        ))}
      </div>
      <div className={styles.journeyStages} role="tablist" aria-label={`${who}'s journey`}>
        {stages.map((s, i) => (
          <button key={s.name} type="button" role="tab" aria-selected={i === at} className={styles.journeyStage} onClick={() => setAt(i)}>
            {s.name}
          </button>
        ))}
      </div>
      <div key={`${person}-${at}`} className={styles.journeyDetail} role="tabpanel">
        <p>
          <strong>{ui.whatTheyDo(who)}</strong>
          {st.doing}
        </p>
        <p>
          <strong>{ui.howItFeels}</strong>
          {st.feeling}
        </p>
      </div>
    </div>
  );
}

/** A small style sheet: the logo, a specimen of the typeface, and the colours with their codes. */
export function Palette({ palette }: { palette: PagePalette }) {
  return (
    <div className={styles.palette}>
      {palette.kicker && <span className={styles.chartKicker}>{palette.kicker}</span>}
      {palette.title && <h2 className={styles.chartTitle}>{palette.title}</h2>}
      {palette.logo && imageUrls[palette.logo] && <img className={styles.paletteLogo} src={imageUrls[palette.logo]} alt="Logo" draggable={false} />}
      {palette.font && (
        <div className={styles.paletteFont} style={{ fontFamily: `"${palette.font.name}", sans-serif` }}>
          <span className={styles.paletteAa}>Aa</span>
          <span>
            <span className={styles.paletteFontName}>{palette.font.name}</span>
            {palette.font.note && <span className={styles.paletteFontNote}>{palette.font.note}</span>}
          </span>
        </div>
      )}
      <ul className={styles.paletteSwatches}>
        {palette.colors.map((c, i) => (
          <li key={c.hex} className={styles.paletteSwatch} style={{ "--c": c.hex, "--i": i } as CSSProperties}>
            <span className={styles.paletteChip} />
            <span className={styles.paletteName}>{c.name}</span>
            <span className={styles.paletteHex}>{c.hex}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
