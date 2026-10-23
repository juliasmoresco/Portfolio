import { useCallback, useEffect, useRef, useState } from "react";
import { getReaderItem } from "../content";
import { onShelfHover, onShelfSelect } from "../scene/events";
import { DAYLIGHT_PRESETS, MOON_LAMP_ID, isHotspotId, type Daylight, type HotspotId, type SceneHotspotId } from "../scene/hotspots";

const TOAST_MS = 1600;

export interface HoverChip {
  /** The hovered (desktop) or armed (mobile) hotspot; kept while the chip / card fades out. */
  id: SceneHotspotId | null;
  label: string;
  x: number;
  y: number;
  visible: boolean;
}

/**
 * Page-level state driven by the scene's `shelf:*` events: the hover chip, which
 * Reader is open, which hotspots have been found, and the moon lamp's lighting
 * override. Shared by the desktop and (in step 4) mobile homes.
 */
export function useShelfHome() {
  // The chip keeps its last label/position while it fades out, so the text doesn't vanish mid-fade.
  const [chip, setChip] = useState<HoverChip>({ id: null, label: "", x: 50, y: 50, visible: false });
  const [openId, setOpenId] = useState<string | null>(null);
  const [found, setFound] = useState<HotspotId[]>([]);
  const [daylight, setDaylight] = useState<Daylight>("afternoon");
  const [toast, setToast] = useState(false);
  const returnFocus = useRef<HTMLElement | null>(null);
  // Whether the open Reader has its own history entry, so the browser's Back (or the phone's back gesture) closes it
  // instead of leaving the site.
  const pushed = useRef(false);
  const toastTimer = useRef<number | undefined>(undefined);

  // Dev only: `/?reader=<id>` opens a Reader on load, for reviewing one without hunting for its hotspot.
  // Stripped from production builds.
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const id = new URLSearchParams(window.location.search).get("reader");
    if (id && getReaderItem(id)) setOpenId(id);
  }, []);

  // A reload keeps the last history state; a Reader isn't open after one, so drop it, or Back would reopen it.
  useEffect(() => {
    if (window.history.state?.reader) window.history.replaceState(null, "");
    const onPop = (e: PopStateEvent) => {
      const id = e.state?.reader;
      const open = typeof id === "string" && !!getReaderItem(id);
      pushed.current = open;
      setOpenId(open ? id : null);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  useEffect(() => {
    const offHover = onShelfHover((d) => {
      setChip((c) => (d.id ? { id: d.id, label: d.label, x: d.x, y: d.y, visible: true } : { ...c, visible: false }));
    });
    const offSelect = onShelfSelect(({ id }) => {
      if (id === MOON_LAMP_ID) {
        setDaylight((cur) => DAYLIGHT_PRESETS[(DAYLIGHT_PRESETS.indexOf(cur) + 1) % DAYLIGHT_PRESETS.length]);
        setToast(true);
        window.clearTimeout(toastTimer.current);
        toastTimer.current = window.setTimeout(() => setToast(false), TOAST_MS);
        return;
      }
      if (!isHotspotId(id) || !getReaderItem(id)) return;
      // Going from one Reader straight to another (a case's "Next case"), keep the original opener.
      const active = document.activeElement as HTMLElement | null;
      if (!active?.closest('[role="dialog"]')) returnFocus.current = active;
      setOpenId(id);
      // Going from one Reader to the next replaces its entry, so Back always returns to the office.
      if (pushed.current) window.history.replaceState({ reader: id }, "");
      else window.history.pushState({ reader: id }, "");
      pushed.current = true;
      setChip((c) => ({ ...c, visible: false }));
      setFound((f) => (f.includes(id) ? f : [...f, id]));
    });
    return () => {
      offHover();
      offSelect();
      window.clearTimeout(toastTimer.current);
    };
  }, []);

  // Closing from inside the Reader (×, Escape) steps back over its history entry; the popstate handler then closes it.
  const closeReader = useCallback(() => {
    if (pushed.current) window.history.back();
    else setOpenId(null);
  }, []);

  // Hand focus back to whatever opened the Reader, but only once the overlay is gone and the page
  // behind it is interactive again (the keyboard list is inert while a Reader is open, and focus()
  // on an inert element silently does nothing). An effect runs after that commit; a timeout does not.
  useEffect(() => {
    if (openId !== null) return;
    const el = returnFocus.current;
    returnFocus.current = null;
    if (el && el.isConnected) el.focus({ preventScroll: true });
  }, [openId]);

  return { chip, openId, found, daylight, toast, closeReader };
}
