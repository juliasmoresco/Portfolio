import { useCallback, useEffect, useRef, useState } from "react";
import { getReaderItem, hotspotArt, boardNotes, hotspotSpines } from "../../content";
import { useHomeCopy, useSceneLabels } from "../copy";
import { HotspotList } from "../../components/HotspotList/HotspotList";
import { OfficeScene, type OfficeSceneHandle } from "../../components/OfficeScene/OfficeScene";
import { QuickNav } from "../../components/QuickNav/QuickNav";
import { Reader } from "../../components/Reader/Reader";
import { useShelfHome } from "../../hooks/useShelfHome";
import { HOTSPOT_IDS } from "../../scene/hotspots";
import styles from "./HomeMobile.module.css";
import { HAS_WEBGL } from "../../webgl";

const cx = (...c: Array<string | false>) => c.filter(Boolean).join(" ");

export function HomeMobile() {
  const scene = useRef<OfficeSceneHandle>(null);
  // A tap opens what it lands on, as a click does on desktop.
  const { openId, found, daylight, closeReader } = useShelfHome();
  // The glow on every object is off until the visitor asks for it with the Hints button.
  const [hints, setHints] = useState(false);
  const t = useHomeCopy();
  const labels = useSceneLabels();

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

  const toggleHints = () => setHints((h) => !h);

  const fit = () => scene.current?.resetView();

  const onClose = useCallback(() => {
    scene.current?.clearHighlight();
    closeReader();
  }, [closeReader]);

  return (
    <div className={styles.page}>
      <div className={styles.scene}>
        <OfficeScene ref={scene} daylight={daylight} walltone="graphite" hints={hints} view="wide" quality="low" parallax="off" tap="direct" touchControls labels={labels} spines={hotspotSpines} art={hotspotArt} notes={boardNotes} />
      </div>

      <div className={styles.scrimTop} />
      <div className={styles.scrimBottom} />

      <div className={styles.topBar}>
        <div className={styles.heading}>
          <h1 className={styles.title}>{t.title}</h1>
          <div className={styles.count}>{t.found(found.length, HOTSPOT_IDS.length)}</div>
        </div>
        <div className={styles.actions}>
          <button type="button" className={cx(styles.pill, hints && styles.pillOn)} aria-pressed={hints} onClick={toggleHints}>
            {t.hints}
          </button>
          <QuickNav onResetView={fit} />
        </div>
      </div>

      <div className={styles.bottom}>
        <p className={styles.hint}>{HAS_WEBGL ? t.hintTouch : t.hintStatic}</p>
      </div>

      <HotspotList labels={labels} onFocusItem={(id) => scene.current?.highlight(id)} inert={!!openId} />

      {openId && getReaderItem(openId) && <Reader key={openId} id={openId} item={getReaderItem(openId)!} onClose={onClose} className={styles.reader} compact />}
    </div>
  );
}
