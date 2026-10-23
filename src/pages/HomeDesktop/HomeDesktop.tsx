import { useEffect, useRef, useState } from "react";
import { getReaderItem, hotspotArt, boardNotes, hotspotSpines } from "../../content";
import { useHomeCopy, useSceneLabels } from "../copy";
import { HotspotList } from "../../components/HotspotList/HotspotList";
import { OfficeScene, type OfficeSceneHandle } from "../../components/OfficeScene/OfficeScene";
import { QuickNav } from "../../components/QuickNav/QuickNav";
import { Reader } from "../../components/Reader/Reader";
import { useShelfHome } from "../../hooks/useShelfHome";
import { HOTSPOT_IDS } from "../../scene/hotspots";
import styles from "./HomeDesktop.module.css";

const cx = (...c: Array<string | false>) => c.filter(Boolean).join(" ");

/** On arrival every object glows faintly for a moment, so a visitor who never moves the mouse still sees what opens. */
const INTRO_GLOW_DELAY_MS = 900;
const INTRO_GLOW_MS = 1800;

export function HomeDesktop() {
  const scene = useRef<OfficeSceneHandle>(null);
  const { chip, openId, found, daylight, toast, closeReader } = useShelfHome();
  const t = useHomeCopy();
  const labels = useSceneLabels();
  const readerItem = openId ? getReaderItem(openId) : undefined;
  // The Hints button keeps the glow on (as on mobile); the arrival glow is the same effect, once.
  const [hints, setHints] = useState(false);
  const [introGlow, setIntroGlow] = useState(false);
  useEffect(() => {
    const on = window.setTimeout(() => setIntroGlow(true), INTRO_GLOW_DELAY_MS);
    const off = window.setTimeout(() => setIntroGlow(false), INTRO_GLOW_DELAY_MS + INTRO_GLOW_MS);
    return () => {
      window.clearTimeout(on);
      window.clearTimeout(off);
    };
  }, []);

  // Drop the emissive tint on close (the × or the browser's Back): the pointer may still be over the object, and
  // without this the chip would not come back until the pointer moved to another one.
  useEffect(() => {
    if (!openId) scene.current?.clearHighlight();
  }, [openId]);

  return (
    <div className={styles.page}>
      <div className={styles.stage}>
        <div className={styles.scene}>
          <OfficeScene ref={scene} daylight={daylight} hints={hints || (introGlow && "soft")} labels={labels} spines={hotspotSpines} art={hotspotArt} notes={boardNotes} />
        </div>

        <div className={styles.scrim} />

        <div className={cx(styles.actions, !!openId && styles.actionsHidden)}>
          <button type="button" className={cx(styles.pill, hints && styles.pillOn)} aria-pressed={hints} onClick={() => setHints((h) => !h)}>
            {t.hints}
          </button>
          <QuickNav />
        </div>

        <div className={styles.intro}>
          <h1 className={styles.title}>{t.title}</h1>
          <p className={styles.lede}>{t.lede}</p>
          <div className={styles.counter}>
            <span>{t.discovered(found.length, HOTSPOT_IDS.length)}</span>
          </div>
        </div>

        <div
          className={cx(styles.chip, chip.visible && !openId && styles.chipVisible)}
          style={{ left: `${chip.x}%`, top: `${chip.y}%` }}
          aria-hidden="true"
        >
          {chip.label}
        </div>

        <div className={cx(styles.toast, toast && styles.toastVisible)} role="status">
          {t.daylight[daylight]}
        </div>

        <HotspotList labels={labels} onFocusItem={(id) => scene.current?.highlight(id)} inert={!!openId} />

        {readerItem && <Reader key={openId} id={openId ?? undefined} item={readerItem} onClose={closeReader} />}
      </div>
    </div>
  );
}
