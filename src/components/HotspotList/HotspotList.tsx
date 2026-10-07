import { emitSelect } from "../../scene/events";
import { HOTSPOT_IDS, MOON_LAMP_ID, type SceneHotspotId } from "../../scene/hotspots";
import { useHomeCopy } from "../../pages/copy";
import styles from "./HotspotList.module.css";

const IDS: SceneHotspotId[] = [...HOTSPOT_IDS, MOON_LAMP_ID];

interface Props {
  /** What to call each item, in the page's language. */
  labels: Readonly<Record<string, string>>;
  /** Focus reached (or left, with `null`) an item: the page lights the matching object in 3D. */
  onFocusItem: (id: SceneHotspotId | null) => void;
  /** True while a Reader is open, so Tab can't wander behind the dialog. */
  inert?: boolean;
}

/**
 * The room has no menu and its hotspots exist only as canvas raycasts, so this is
 * the keyboard and screen-reader route to the same 18 targets. It is invisible to
 * mouse users. Activating an item emits the same `shelf:select` a click would.
 */
export function HotspotList({ labels, onFocusItem, inert }: Props) {
  const t = useHomeCopy();
  return (
    <nav className={styles.list} aria-label={t.things} inert={inert}>
      <ul>
        {IDS.map((id) => (
          <li key={id}>
            <button type="button" onFocus={() => onFocusItem(id)} onBlur={() => onFocusItem(null)} onClick={() => emitSelect({ id })}>
              {labels[id] ?? id}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
