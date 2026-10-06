import { useCallback, useEffect, useRef, useState } from "react";
import { getReaderItem, hotspotArt, boardNotes, hotspotLabels, hotspotSpines } from "../../content";
import { HotspotList } from "../../components/HotspotList/HotspotList";
import { OfficeScene, type OfficeSceneHandle } from "../../components/OfficeScene/OfficeScene";
import { QuickNav } from "../../components/QuickNav/QuickNav";
import { Reader } from "../../components/Reader/Reader";
import { useShelfHome } from "../../hooks/useShelfHome";
import { emitSelect } from "../../scene/events";
import { HOTSPOT_IDS, MOON_LAMP_ID } from "../../scene/hotspots";
import styles from "./HomeMobile.module.css";

const cx = (...c: Array<string | false>) => c.filter(Boolean).join(" ");

export function HomeMobile() {
  const scene = useRef<OfficeSceneHandle>(null);
  // On touch, "hover" means armed: the first tap names an object, the second opens it.
  const { chip: armed, openId, found, daylight, closeReader } = useShelfHome();
  // The glow on every object is off until the visitor asks for it with the Hints button.
  const [hints, setHints] = useState(false);

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
  const isLamp = armed.id === MOON_LAMP_ID;
  const item = armed.id ? getReaderItem(armed.id) : undefined;
  const kicker = item ? (item.kind ?? item.tag ?? "") : "";

  const toggleHints = () => setHints((h) => !h);

  const fit = () => scene.current?.resetView();

  const open = () => {
    if (!armed.id) return;
    emitSelect({ id: armed.id });
    // The moon lamp opens nothing, so drop the card and tint instead of leaving it armed.
    if (isLamp) scene.current?.clearHighlight();
  };

  const onClose = useCallback(() => {
    scene.current?.clearHighlight();
    closeReader();
  }, [closeReader]);

  return (
    <div className={styles.page}>
      <div className={styles.scene}>
        <OfficeScene ref={scene} daylight={daylight} walltone="graphite" hints={hints} view="wide" quality="low" parallax="off" tap="confirm" touchControls labels={hotspotLabels} spines={hotspotSpines} art={hotspotArt} notes={boardNotes} />
      </div>

      <div className={styles.scrimTop} />
      <div className={styles.scrimBottom} />

      <div className={styles.topBar}>
        <div className={styles.heading}>
          <div className={styles.title}>Welcome to my office</div>
          <div className={styles.count}>
            {found.length} of {HOTSPOT_IDS.length} found
          </div>
        </div>
        <div className={styles.actions}>
          <button type="button" className={cx(styles.pill, hints && styles.pillOn)} aria-pressed={hints} onClick={toggleHints}>
            Hints
          </button>
          <QuickNav onResetView={fit} />
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
              {isLamp ? "Change" : "Open"}
            </button>
          </div>
        </div>
        <p className={cx(styles.hint, cardOn && styles.hintOff)}>Pinch, drag and tap around to see what you find — or use the menu for a quicker way through.</p>
      </div>

      {/* The card is inert while hidden, so this is what tells a screen reader that something was named. */}
      <p className={styles.srOnly} aria-live="polite">
        {cardOn ? `${armed.label}. ${isLamp ? "Double-tap Change to switch the light." : "Double-tap Open to view."}` : ""}
      </p>

      <HotspotList onFocusItem={(id) => scene.current?.highlight(id)} inert={!!openId} />

      {openId && getReaderItem(openId) && <Reader key={openId} id={openId} item={getReaderItem(openId)!} onClose={onClose} className={styles.reader} compact />}
    </div>
  );
}
