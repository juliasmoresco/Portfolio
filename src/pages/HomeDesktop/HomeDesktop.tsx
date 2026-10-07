import { useCallback, useRef } from "react";
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

export function HomeDesktop() {
  const scene = useRef<OfficeSceneHandle>(null);
  const { chip, openId, found, daylight, toast, closeReader } = useShelfHome();
  const t = useHomeCopy();
  const labels = useSceneLabels();
  const readerItem = openId ? getReaderItem(openId) : undefined;

  // Drop the emissive tint on close: the pointer may still be over the object, and
  // without this the chip would not come back until the pointer moved to another one.
  const onClose = useCallback(() => {
    scene.current?.clearHighlight();
    closeReader();
  }, [closeReader]);

  return (
    <div className={styles.page}>
      <div className={styles.stage}>
        <div className={styles.scene}>
          <OfficeScene ref={scene} daylight={daylight} labels={labels} spines={hotspotSpines} art={hotspotArt} notes={boardNotes} />
        </div>

        <div className={styles.scrim} />

        <QuickNav className={styles.quickNav} />

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

        {readerItem && <Reader key={openId} id={openId ?? undefined} item={readerItem} onClose={onClose} />}
      </div>
    </div>
  );
}
