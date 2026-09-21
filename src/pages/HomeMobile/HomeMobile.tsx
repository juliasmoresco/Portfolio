import { useCallback, useEffect, useRef, useState } from "react";
import { getReaderItem, hotspotLabels } from "../../content";
import { HotspotList } from "../../components/HotspotList/HotspotList";
import { OfficeScene, type OfficeSceneHandle } from "../../components/OfficeScene/OfficeScene";
import { Reader } from "../../components/Reader/Reader";
import { useShelfHome } from "../../hooks/useShelfHome";
import { emitSelect } from "../../scene/events";
import { HOTSPOT_IDS, MOON_LAMP_ID } from "../../scene/hotspots";
import styles from "./HomeMobile.module.css";

/** The glow is the only affordance on touch, so it fades out on its own once they have had time to see it. */
const HINTS_AUTO_OFF_MS = 9000;

const cx = (...c: Array<string | false>) => c.filter(Boolean).join(" ");

export function HomeMobile() {
  const scene = useRef<OfficeSceneHandle>(null);
  // On touch, "hover" means armed: the first tap names an object, the second opens it.
  const { chip: armed, openId, found, daylight, closeReader } = useShelfHome();
  const [hints, setHints] = useState(true);
  const hintTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    hintTimer.current = window.setTimeout(() => setHints(false), HINTS_AUTO_OFF_MS);
    return () => window.clearTimeout(hintTimer.current);
  }, []);

  // The page is a fixed, non-scrolling surface: no pull-to-refresh or rubber-banding over the scene.
  useEffect(() => {
    const html = document.documentElement;
    const prev = { overscroll: html.style.overscrollBehavior, bg: html.style.background, bodyBg: document.body.style.background };
    html.style.overscrollBehavior = "none";
    html.style.background = "var(--ground)";
    document.body.style.background = "var(--ground)";
    return () => {
      html.style.overscrollBehavior = prev.overscroll;
      html.style.background = prev.bg;
      document.body.style.background = prev.bodyBg;
    };
  }, []);

  const cardOn = armed.visible && !openId;
  const item = armed.id ? getReaderItem(armed.id) : undefined;
  const kicker = item ? (item.kind ?? item.tag ?? "") : "";

  const toggleHints = () => {
    window.clearTimeout(hintTimer.current);
    setHints((h) => !h);
  };

  const fit = () => scene.current?.resetView();

  const open = () => {
    if (!armed.id) return;
    emitSelect({ id: armed.id });
    // The moon lamp opens nothing, so drop the card and tint instead of leaving it armed.
    if (armed.id === MOON_LAMP_ID) scene.current?.clearHighlight();
  };

  const onClose = useCallback(() => {
    scene.current?.clearHighlight();
    closeReader();
  }, [closeReader]);

  return (
    <div className={styles.page}>
      <div className={styles.scene}>
        <OfficeScene ref={scene} daylight={daylight} walltone="graphite" hints={hints} view="wide" quality="low" parallax="off" tap="confirm" touchControls labels={hotspotLabels} />
      </div>

      <div className={styles.scrimTop} />
      <div className={styles.scrimBottom} />

      <div className={styles.topBar}>
        <div className={styles.heading}>
          <div className={styles.title}>My office</div>
          <div className={styles.count}>
            {found.length} of {HOTSPOT_IDS.length} found
          </div>
        </div>
        <div className={styles.actions}>
          <button type="button" className={cx(styles.pill, hints && styles.pillOn)} aria-pressed={hints} onClick={toggleHints}>
            Hints
          </button>
          <button type="button" className={styles.pill} aria-label="Fit the whole room" onClick={fit}>
            Fit
          </button>
        </div>
      </div>

      <div className={styles.bottom}>
        <div className={cx(styles.card, cardOn && styles.cardOn)} inert={!cardOn}>
          <div className={styles.cardRow}>
            <span className={styles.swatch} style={{ background: item?.spine ?? "var(--ink)" }} />
            <div className={styles.cardText}>
              <div className={styles.kicker}>{kicker}</div>
              <div className={styles.cardTitle}>{armed.label}</div>
            </div>
            <button type="button" className={styles.open} onClick={open}>
              Open
            </button>
          </div>
        </div>
        <p className={cx(styles.hint, cardOn && styles.hintOff)}>Pinch to zoom, drag to move around. Tap something to see what it is, tap again to open it.</p>
      </div>

      {/* The card is inert while hidden, so this is what tells a screen reader that something was named. */}
      <p className={styles.srOnly} aria-live="polite">
        {cardOn ? `${armed.label}. Double-tap Open to view.` : ""}
      </p>

      <HotspotList onFocusItem={(id) => scene.current?.highlight(id)} inert={!!openId} />

      {openId && getReaderItem(openId) && <Reader key={openId} item={getReaderItem(openId)!} onClose={onClose} className={styles.reader} compact />}
    </div>
  );
}
