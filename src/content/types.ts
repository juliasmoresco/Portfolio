export type ReaderSkin = "book" | "folder" | "frame";
export type ReaderOpening = "hinge" | "tube" | "binder" | "lid";

export interface ReaderPage {
  kicker?: string;
  heading?: string;
  /**
   * A placeholder for artwork that has not been made yet: the page shows a striped swatch described by this text.
   * Leave it out on a page that has no picture, and the page shows text only, with no image area at all.
   */
  plate?: string;
  /**
   * Real artwork for the plate: the file name (without extension) of a picture in src/assets/cases, or several,
   * which are shown side by side. Run `npm run images` to turn raw downloads into those files.
   */
  image?: string | string[];
  /** Shown under the image. */
  caption?: string;
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
