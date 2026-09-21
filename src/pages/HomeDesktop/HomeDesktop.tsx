import { useCallback, useRef } from "react";
import { getReaderItem, hotspotLabels } from "../../content";
import { HotspotList } from "../../components/HotspotList/HotspotList";
import { OfficeScene, type OfficeSceneHandle } from "../../components/OfficeScene/OfficeScene";
import { Reader } from "../../components/Reader/Reader";
import { useShelfHome } from "../../hooks/useShelfHome";
import { HOTSPOT_IDS } from "../../scene/hotspots";
import styles from "./HomeDesktop.module.css";

const cx = (...c: Array<string | false>) => c.filter(Boolean).join(" ");

export function HomeDesktop() {
  const scene = useRef<OfficeSceneHandle>(null);
  const { chip, openId, found, daylight, toast, closeReader } = useShelfHome();
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
          <OfficeScene ref={scene} daylight={daylight} labels={hotspotLabels} />
        </div>

        <div className={styles.scrim} />

        <div className={styles.intro}>
          <h1 className={styles.title}>
            Welcome to
            <br />
            my office
          </h1>
          <p className={styles.lede}>There is no menu here. Click the things on the shelf and they will tell you what I do.</p>
          <div className={styles.counter}>
            <span className={styles.rule} />
            <span>
              {found.length} of {HOTSPOT_IDS.length} discovered
            </span>
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
          {daylight}
        </div>

        <HotspotList onFocusItem={(id) => scene.current?.highlight(id)} inert={!!openId} />

        {readerItem && <Reader key={openId} item={readerItem} onClose={onClose} />}
      </div>
    </div>
  );
}
