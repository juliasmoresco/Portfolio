export type ReaderSkin = "book" | "folder" | "frame";
export type ReaderOpening = "hinge" | "tube" | "binder" | "lid";

export interface ReaderPage {
  kicker?: string;
  heading?: string;
  /** Describes the image plate; the plate itself is a placeholder swatch. */
  plate: string;
  lines: string[];
}

export interface ReaderLink {
  label: string;
  href: string;
}

/**
 * One Reader entry per hotspot id, from `reader/<id>.json`. Shape follows the
 * `item` prop in the handoff's Reader.dc.html; the extra fields are noted below.
 */
export interface ReaderItem {
  skin: ReaderSkin;
  title: string;
  year?: string;
  role?: string;
  tag?: string;
  /** Small label above the title on the mobile selection card; falls back to `tag`. */
  kind?: string;
  /** Cover colour for `book`; also the swatch on the mobile selection card. */
  spine?: string;
  /** Required for `folder`. */
  opening?: ReaderOpening;
  openingLabel?: string;
  /** `frame` only (the phone's contact links). */
  links?: ReaderLink[];
  /** What the scene's hover chip says, when it differs from `title`. */
  hotspotLabel?: string;
  pages: ReaderPage[];
}
