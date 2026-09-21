import { HOTSPOT_IDS, isHotspotId, type HotspotId } from "../scene/hotspots";
import type { ReaderItem } from "./types";
import { assertReaderItem } from "./validate";

export type { ReaderItem, ReaderPage, ReaderSkin, ReaderOpening, ReaderLink } from "./types";

/**
 * Reader content, one JSON file per entry in ./reader (file name = hotspot id).
 * Every string in those files is placeholder copy to be replaced by the owner.
 */
const modules = import.meta.glob<unknown>("./reader/*.json", { eager: true, import: "default" });

export const readerContent: Readonly<Record<string, ReaderItem>> = (() => {
  const out: Record<string, ReaderItem> = {};
  for (const [path, value] of Object.entries(modules)) {
    const id = /\/([^/]+)\.json$/.exec(path)![1];
    assertReaderItem(id, value);
    out[id] = value;
  }
  return out;
})();

export function getReaderItem(id: string): ReaderItem | undefined {
  return readerContent[id];
}

/** What the scene's hover chip and the keyboard list call each hotspot. */
export const hotspotLabels: Readonly<Record<HotspotId, string>> = Object.fromEntries(
  HOTSPOT_IDS.map((id) => [id, readerContent[id]?.hotspotLabel ?? readerContent[id]?.title ?? id]),
) as Record<HotspotId, string>;

export { isHotspotId };
