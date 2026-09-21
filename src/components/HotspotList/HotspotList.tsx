import { hotspotLabels } from "../../content";
import { emitSelect } from "../../scene/events";
import { HOTSPOT_IDS, MOON_LAMP_ID, MOON_LAMP_LABEL, type SceneHotspotId } from "../../scene/hotspots";
import styles from "./HotspotList.module.css";

const ITEMS: Array<{ id: SceneHotspotId; label: string }> = [
  ...HOTSPOT_IDS.map((id) => ({ id, label: hotspotLabels[id] })),
  { id: MOON_LAMP_ID, label: MOON_LAMP_LABEL },
];

interface Props {
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
export function HotspotList({ onFocusItem, inert }: Props) {
  return (
    <nav className={styles.list} aria-label="Things in the office" inert={inert}>
      <ul>
        {ITEMS.map(({ id, label }) => (
          <li key={id}>
            <button type="button" onFocus={() => onFocusItem(id)} onBlur={() => onFocusItem(null)} onClick={() => emitSelect({ id })}>
              {label}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
