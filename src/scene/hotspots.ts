/**
 * The 19 hotspots that open a Reader. The README lists 17; Résumé and Zuko (the owner's cat) were
 * added afterwards. Order is also the keyboard list's order.
 */
export const HOTSPOT_IDS = [
  "about",
  "case1",
  "case2",
  "case3",
  "case4",
  "case5",
  "chess",
  "studies",
  "travels",
  "phone",
  "resume",
  "llama",
  "cat",
  "ill01",
  "ill02",
  "ill03",
  "ill04",
  "ill05",
  "ill06",
] as const;

export type HotspotId = (typeof HOTSPOT_IDS)[number];

/** Not a Reader item: selecting it cycles the lighting preset instead. */
export const MOON_LAMP_ID = "moonlamp";
export const MOON_LAMP_LABEL = "Moon lamp — change the light";

/** Everything the scene can emit in `shelf:hover` / `shelf:select`. */
export type SceneHotspotId = HotspotId | typeof MOON_LAMP_ID;

export const DAYLIGHT_PRESETS = ["afternoon", "golden hour", "overcast", "evening lamp"] as const;
export type Daylight = (typeof DAYLIGHT_PRESETS)[number];

export const WALL_TONES = ["graphite", "greige", "clay", "olive", "plaster"] as const;
export type WallTone = (typeof WALL_TONES)[number];

const HOTSPOT_ID_SET: ReadonlySet<string> = new Set(HOTSPOT_IDS);
export const isHotspotId = (id: string): id is HotspotId => HOTSPOT_ID_SET.has(id);
