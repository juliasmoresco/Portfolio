import { HOTSPOT_IDS, isHotspotId, type HotspotId } from "../scene/hotspots";
import type { ReaderItem, ReaderPage } from "./types";
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

/** The colour each entry gives its book (`spine` in its JSON), used to tint that hotspot's books in the scene. */
export const hotspotSpines: Readonly<Record<string, string>> = Object.fromEntries(
  HOTSPOT_IDS.flatMap((id) => (readerContent[id]?.spine ? [[id, readerContent[id].spine]] : [])),
);

export { isHotspotId };

/** Every optimised picture in src/assets/cases, by file name without extension (e.g. "case1-03"). */
const imageModules = import.meta.glob<string>("../assets/cases/*.webp", { eager: true, query: "?url", import: "default" });
export const imageUrls: Readonly<Record<string, string>> = Object.fromEntries(
  Object.entries(imageModules).map(([path, url]) => [/\/([^/]+)\.webp$/.exec(path)![1], url]),
);

/** The URLs of a page's images, in order. Names with no file are skipped here and caught by the content test. */
export function pageImages(page: ReaderPage): string[] {
  const names = page.image === undefined ? [] : Array.isArray(page.image) ? page.image : [page.image];
  return names.map((n) => imageUrls[n]).filter((u): u is string => !!u);
}

/** A page has an image area only if it has a picture, or a placeholder (`plate`) for artwork still to come. */
export function pageHasArt(page: ReaderPage): boolean {
  return pageImages(page).length > 0 || !!page.plate;
}
