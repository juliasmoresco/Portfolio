import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReaderItem } from "../../content";
import { usePrefersReducedMotion } from "../../hooks/usePrefersReducedMotion";
import { PAGE_TURN_MS, READER_DURATION_MS } from "./copy";
import { buildViews, type CompactViewProps } from "./compact";
import { BookSkin, FolderSkin, FrameSkin } from "./skins";
import { ZoomContext, type ZoomTarget } from "./zoom";
import styles from "./Reader.module.css";

const FOCUSABLE = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface Props {
  item: ReaderItem;
  /** Called after the closing animation, so the page can return focus and drop the overlay. */
  onClose: () => void;
  className?: string;
  /**
   * Phone presentation: type re-pinned to px, and the two-page spread collapses to one page per
   * view with swipe paging. The desktop tuning (everything in cqw) is unreadable at phone width.
   */
  compact?: boolean;
}

/**
 * Modal overlay themed to the object that opened it: a book (cover swings open onto a two-page
 * spread), a folder (hinge / tube / binder / lid), or a framed plate. Mount it per item
 * (`key={id}`); it animates in on mount and calls `onClose` once it has animated out.
 *
 * Focus: moves to the dialog on open, is trapped inside it, and is handed back by `onClose`'s
 * caller. Keys: Escape closes; for books, Left/Right turn the page.
 *
 * The dialog role sits on the root, which holds the shell *and* the pager/Close controls. The
 * prototype put it on the shell alone, which left those controls outside an aria-modal dialog.
 */
export function Reader({ item, onClose, className, compact = false }: Props) {
  const reduced = usePrefersReducedMotion();
  const skin = item.skin;
  const isBook = skin === "book";
  const pages = item.pages;

  const [shown, setShown] = useState(false);
  const [coverOpen, setCoverOpen] = useState(false);
  const [spread, setSpread] = useState(0);
  const [view, setView] = useState(0);
  const scroller = useRef<HTMLDivElement>(null);
  const [turning, setTurning] = useState<"next" | "prev" | null>(null);
  const [closing, setClosing] = useState(false);

  const [zoom, setZoom] = useState<ZoomTarget | null>(null);
  const zoomRef = useRef<ZoomTarget | null>(null);
  const zoomOrigin = useRef<HTMLElement | null>(null);
  const lightboxClose = useRef<HTMLButtonElement>(null);
  zoomRef.current = zoom;

  const enlarge = useCallback((target: ZoomTarget) => {
    zoomOrigin.current = document.activeElement as HTMLElement | null;
    setZoom(target);
  }, []);
  const closeZoom = useCallback(() => {
    setZoom(null);
    // hand focus back to the Enlarge button once the page behind is interactive again
    window.setTimeout(() => zoomOrigin.current?.isConnected && zoomOrigin.current.focus({ preventScroll: true }), 0);
  }, []);

  const root = useRef<HTMLDivElement>(null);
  const timers = useRef<{ cover?: number; turn?: number; close?: number }>({});
  const closingRef = useRef(false);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    const t = timers.current;
    let r2 = 0;
    const r1 = requestAnimationFrame(() => {
      r2 = requestAnimationFrame(() => {
        setShown(true);
        root.current?.focus({ preventScroll: true });
      });
    });
    if (isBook) t.cover = window.setTimeout(() => setCoverOpen(true), reduced ? 0 : READER_DURATION_MS - 100);
    return () => {
      cancelAnimationFrame(r1);
      cancelAnimationFrame(r2);
      window.clearTimeout(t.cover);
      window.clearTimeout(t.turn);
      window.clearTimeout(t.close);
    };
    // Mount-only: `reduced` is read once to time the cover.
  }, []);

  const requestClose = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    const t = timers.current;
    window.clearTimeout(t.cover);
    window.clearTimeout(t.turn);
    setClosing(true);
    setCoverOpen(false);
    setTurning(null);
    t.close = window.setTimeout(() => onCloseRef.current(), READER_DURATION_MS);
  }, []);

  // Books and folders page (a turning leaf on desktop; on a phone each page is two views, image then text).
  // Frames are a single view.
  const paged = skin !== "frame";
  const views = useMemo(() => buildViews(pages), [pages]);
  const count = compact ? views.length : pages.length;
  const index = compact ? view : spread;

  const goTo = useCallback(
    (i: number) => {
      const el = scroller.current;
      if (!el || closing) return;
      const next = Math.max(0, Math.min(count - 1, i));
      setView(next);
      el.scrollTo({ left: next * el.clientWidth, behavior: reduced ? "auto" : "smooth" });
    },
    [closing, count, reduced],
  );

  const turn = useCallback(
    (dir: 1 | -1) => {
      if (compact) {
        goTo(view + dir);
        return;
      }
      if (turning || closing) return;
      const next = spread + dir;
      if (next < 0 || next >= pages.length) return;
      if (reduced) {
        setSpread(next);
        return;
      }
      setTurning(dir > 0 ? "next" : "prev");
      setSpread(next);
      window.clearTimeout(timers.current.turn);
      timers.current.turn = window.setTimeout(() => setTurning(null), PAGE_TURN_MS);
    },
    [compact, goTo, view, turning, closing, spread, pages.length, reduced],
  );

  useEffect(() => {
    const trapTab = (e: KeyboardEvent) => {
      const el = root.current;
      if (!el) return;
      const items = [...el.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((n) => !n.closest("[inert]"));
      if (items.length === 0) {
        e.preventDefault();
        el.focus({ preventScroll: true });
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || active === el)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (active === last || !el.contains(active))) {
        e.preventDefault();
        first.focus();
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        if (zoomRef.current) closeZoom();
        else requestClose();
      } else if (e.key === "Tab") {
        trapTab(e);
      } else if (!zoomRef.current && paged && count > 1 && (!isBook || coverOpen)) {
        if (e.key === "ArrowRight") turn(1);
        else if (e.key === "ArrowLeft") turn(-1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [paged, count, isBook, coverOpen, requestClose, closeZoom, turn]);

  // Move focus into the enlarged view when it opens.
  useEffect(() => {
    if (zoom) lightboxClose.current?.focus({ preventScroll: true });
  }, [zoom]);

  const pageIndex = compact ? (views[Math.min(view, views.length - 1)]?.page ?? 0) : spread;
  const page = pages[Math.min(pageIndex, Math.max(pages.length - 1, 0))];
  const open = shown && !closing;
  const navVisible = open && (!isBook || coverOpen);
  const showPager = paged && count > 1;
  const pageLabel = `${String(index + 1).padStart(2, "0")} / ${String(count).padStart(2, "0")}`;
  const compactViews: CompactViewProps | undefined = compact ? { views, view, onViewChange: setView, scrollerRef: scroller } : undefined;

  return (
    <div
      ref={root}
      className={[styles.root, className].filter(Boolean).join(" ")}
      role="dialog"
      aria-modal="true"
      aria-label={item.title}
      tabIndex={-1}
      data-skin={skin}
      data-opening={item.opening ?? "none"}
      data-open={open}
      data-cover-open={coverOpen}
      data-nav={navVisible}
      data-turning={turning ?? "none"}
      data-reduced={reduced}
      data-compact={compact}
    >
      <div className={styles.scrim} onClick={requestClose} />

      <ZoomContext.Provider value={enlarge}>
      <div className={styles.stage} inert={!!zoom}>
        <div className={styles.shell}>
          {skin === "book" && <BookSkin item={item} page={page} compact={compactViews} />}
          {skin === "folder" && <FolderSkin item={item} page={page} compact={compactViews} />}
          {skin === "frame" && <FrameSkin item={item} page={page} />}
        </div>

        {/* Hidden until the cover is open (books), so Tab can't reach invisible controls. */}
        <div className={styles.nav} inert={!navVisible}>
          {showPager && (
            <>
              <button type="button" className={styles.navBtn} aria-label="Previous page" aria-disabled={index === 0} onClick={() => turn(-1)}>
                ‹
              </button>
              <span className={styles.pageLabel}>{pageLabel}</span>
              <button type="button" className={styles.navBtn} aria-label="Next page" aria-disabled={index === count - 1} onClick={() => turn(1)}>
                ›
              </button>
            </>
          )}
          <button type="button" className={styles.closeBtn} onClick={requestClose}>
            Close
          </button>
        </div>
      </div>
      </ZoomContext.Provider>

      {zoom && (
        <div className={styles.lightbox} role="dialog" aria-modal="true" aria-label={`${zoom.alt || item.title} (enlarged)`} onClick={closeZoom}>
          <div className={`${styles.lightboxPics} ${zoom.images.length === 1 ? styles.lightboxSingle : ""}`}>
            {zoom.images.map((src) => (
              <img key={src} src={src} alt={zoom.alt} draggable={false} />
            ))}
          </div>
          <button ref={lightboxClose} type="button" className={styles.lightboxClose} onClick={closeZoom}>
            Close
          </button>
        </div>
      )}

      {showPager && (
        <p className={styles.srOnly} aria-live="polite">
          {`Page ${index + 1} of ${count}${page.heading ? `: ${page.heading}` : ""}`}
        </p>
      )}
    </div>
  );
}
