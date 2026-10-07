export type ReaderSkin = "book" | "folder" | "frame" | "globe" | "llama" | "chess" | "phone" | "notes" | "postcard" | "resume" | "diploma" | "chat";
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
  /**
   * Desktop books and folders: the picture fills the whole left page, edge to edge (for a cover that was designed as a
   * page). It is cropped a little at the bottom if it is taller than the page. On a phone it is the first view on its
   * own, shown whole, and the page's text follows in the next view. Needs `image`.
   */
  fullPage?: boolean;
  /** With `fullPage`: the picture's background colour (#RRGGBB), which fills the page where a phone's shape leaves room. */
  pageColor?: string;
  /** A bar chart in place of a picture: the left page of the spread, drawn from this data. */
  chart?: PageChart;
  /** Finished screens across the whole spread (both pages), in place of the picture and the text page. */
  showcase?: PageShowcase;
  /** Versions of a design to switch between, in place of a picture: the left page of the spread. */
  compare?: PageCompare;
  /** Result numbers in place of a picture: the left page of the spread. */
  stats?: PageStats;
  /** Opening cards in place of a picture: the left page of the spread. */
  cards?: PageCards;
  /** Photos laid out as polaroids in place of a picture: the left page of the spread. Up to six. */
  polaroids?: PagePolaroids;
  /** A career path drawn down the page, stop by stop, in place of a picture. */
  timeline?: PageTimeline;
  /** Small drawings of things done for fun, in place of a picture; some can open another object in the office. */
  hobbies?: PageHobbies;
  /** Terms explained on cards that turn over when tapped, in place of a picture. */
  glossary?: PageGlossary;
  /** A question for the reader to answer, then the real answer, in place of a picture. */
  poll?: PagePoll;
  /** Numbers that narrow step by step (invited, took part, succeeded), drawn as shrinking bars. */
  funnel?: PageFunnel;
  /** Things moving from one place to another, one by one, with a number counting up beside them. */
  migration?: PageMigration;
  /** Short quotes from users, read one at a time like a small deck of notes. */
  quotes?: PageQuotes;
  /** Personas to switch between, each a small profile card. */
  personas?: PagePersonas;
  /** A journey's stages and how the person felt at each, drawn as a mood line; a stage opens to say more. */
  journey?: PageJourney;
  /** A product's colours, logo and typeface, as a small style sheet. */
  palette?: PagePalette;
  /** One of the office's 3D models on a turntable, to drag round. */
  model3d?: PageModel;
  /** A clickable prototype, embedded across the whole spread, with its screens listed beside it to jump to. */
  prototype?: PagePrototype;
  /**
   * Books: a second visual (picture, chart, cards, stats, compare…) for the right page, in place of the text page, so a
   * spread can be two visuals side by side. On a phone it is a view of its own after the first.
   */
  right?: PageArt;
  /** Books: put the picture, chart, cards… on the right page and the text on the left (on a phone, the text comes first). */
  artRight?: boolean;
  /** Leave the heading off the text page that sits beside the picture or chart (the picture already carries a headline). */
  hideHeading?: boolean;
  /** Shown under the image. */
  caption?: string;
  lines: string[];
}

/** A bar chart drawn in the page (book left page): groups of labelled bars, each a percentage of its track. */
export interface PageChart {
  /** Small caps line above the title. */
  kicker?: string;
  title: string;
  /** Bar colour (#RRGGBB); the page's ink colour if left out. */
  color?: string;
  groups: {
    title: string;
    subtitle?: string;
    bars: { label: string; value: number }[];
  }[];
  /** The values are rounded or adjusted (confidential data): each shows with "~". */
  approximate?: boolean;
  /** Small print under the chart (a confidentiality note, a source). */
  note?: string;
}

/** Photos pinned to a book's left page like polaroids, each one opening large when clicked. */
export interface PagePolaroids {
  /** A short label above the photos ("Field visits · CH & DE"). */
  note?: string;
  photos: { image: string; caption?: string }[];
}

/** Places worked, oldest first, drawn as stops along a line; the last can be marked as the current one. */
export interface PageTimeline {
  kicker?: string;
  title?: string;
  stops: {
    /** When it started ("2018"). */
    year: string;
    name: string;
    role: string;
    /** One short line under the role ("Software house"). */
    note?: string;
    /** Still there: the stop is drawn filled and labelled "Now". */
    now?: boolean;
  }[];
}

export const HOBBY_ICONS = ["read", "draw", "gym", "yoga", "chess", "travel", "globe", "phone", "diploma", "notes", "cat", "coin", "postcard", "resume"] as const;
export type HobbyIcon = (typeof HOBBY_ICONS)[number];

/** Things done off the clock, each a small drawing with its name; `open` is another Reader item's id to jump to. */
export interface PageHobbies {
  kicker?: string;
  title?: string;
  items: { icon: HobbyIcon; label: string; open?: string; openLabel?: string }[];
}

/** Result numbers shown large on a book's left page, counting up when the page is first seen. */
export interface PageStats {
  kicker?: string;
  title?: string;
  items: {
    /** The number to count up to; negative shows with a minus sign. Leave out for a word instead (see `display`). */
    value?: number;
    /** Show a plus sign on a positive value. */
    signed?: boolean;
    decimals?: number;
    /** After the number, smaller ("pts", "%"). */
    unit?: string;
    /** A word in place of a number ("Fewer"), when there is no figure to show. */
    display?: string;
    label: string;
  }[];
  /** Small print under the numbers (a confidentiality note, a source). */
  note?: string;
}

/** Numbered cards on a book's left page that open one at a time (problems, findings…). */
export interface PageCards {
  kicker?: string;
  title?: string;
  items: { title: string; body: string; quote?: string; source?: string }[];
}

/** Two (or more) versions of a design on a book's left page, switched with a toggle; one may be marked the winner. */
export interface PageCompare {
  kicker?: string;
  title?: string;
  /** A short paragraph under the title. */
  description?: string;
  /** What the screens are: phone screens (the default) or desktop web pages, shown in browser windows. */
  device?: "phone" | "desktop";
  variants: {
    /** The toggle's label ("A · Floating button"). */
    label: string;
    /** Screens, side by side (file names in src/assets/cases); with `device: "desktop"`, the first in front of the rest. */
    images: string[];
    /** A line under the screens. */
    note?: string;
    winner?: boolean;
  }[];
}

/** Finished screens laid out across a whole book spread in a gentle fan, each with its name; one opens large on click. */
export interface PageShowcase {
  kicker?: string;
  title?: string;
  /** Short paragraphs above the screens (bold with ** **). */
  intro?: string[];
  /**
   * Phone screens (the default) fan out across the spread; desktop pages are shown one at a time in a browser window,
   * picked from a list of their names.
   */
  device?: "phone" | "desktop";
  screens: { image: string; label: string }[];
}

/** Terms on cards: the term and, turned over, what it means. `note` is the original word, if the product used another. */
export interface PageGlossary {
  kicker?: string;
  title?: string;
  items: { term: string; note?: string; body: string }[];
}

/** A multiple-choice question; after a pick, the right option is marked and `reveal` explains it (bold with ** **). */
export interface PagePoll {
  kicker?: string;
  title?: string;
  question: string;
  options: { label: string; note?: string }[];
  /** Index into `options`. */
  answer: number;
  reveal: string;
  /** The line shown before a pick ("Pick one to see the answer." if left out). */
  prompt?: string;
  /** The badge on the right option once revealed ("Answer" if left out). */
  answerLabel?: string;
}

/** Steps of a funnel, widest first; each bar is its value against the first's. `display` replaces the number shown. */
export interface PageFunnel {
  kicker?: string;
  title?: string;
  steps: { value: number; label: string; display?: string }[];
  /** A line under the bars. */
  note?: string;
}

/** A move from `from` to `to`: each item crosses over in turn while `value` counts up beside `caption`. */
export interface PageMigration {
  kicker?: string;
  title?: string;
  from: string;
  to: string;
  items: string[];
  value: number;
  unit?: string;
  caption: string;
}

/** Quotes read one at a time, with who said them; `note` (e.g. "Translated from Portuguese") goes under each. */
export interface PageQuotes {
  kicker?: string;
  title?: string;
  items: { text: string; by?: string }[];
  note?: string;
}

export interface ReaderLink {
  label: string;
  href: string;
}

/** A number on the phone's dial and who answers it: one of the item's links (by label), or just a line. */
export interface SpeedDial {
  digit: string;
  /** The `label` of one of the item's links, lit up once the call connects. */
  link?: string;
  text: string;
}

/** The degree shown on the unrolled diploma (`diploma` skin). */
export interface DiplomaDegree {
  school: string;
  /** The school's short name, set round the seal ("UFRGS"). */
  short: string;
  degree: string;
  person: string;
  years: string;
  place?: string;
  /** The real diploma, scanned (file name in src/assets/cases), shown unrolling from the tube. Personal details blurred. */
  image?: string;
}

/** A course or specialization, shown as a small certificate beside the diploma. */
export interface Course {
  school: string;
  course: string;
  year: string;
}

/** A mentee's review, for the cork board (`snippet`) and the Reader's deck of notes (the rest). */
export interface MenteeNote {
  quote: string;
  /** A few words from the quote for the paper note pinned on the board. */
  snippet: string;
  /** First name and initial ("Diogo R."). */
  name: string;
  role?: string;
  /** "Apr 2024". */
  date?: string;
  /** True when the note is shown in the other language from the one it was written in (Portuguese on the English site, English on the Portuguese one). */
  translated?: boolean;
  /** Where it was written, when not on ADPList ("LinkedIn"). */
  source?: string;
}

export interface LlamaMilestone {
  at: number;
  text: string;
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
  /**
   * Books: the accent of the case's charts, cards and numbers (red if left out): `fill` for badges, bars and markers,
   * `on` for what sits on that fill, and `text` for accent text on the paper. #RRGGBB each.
   */
  accent?: { fill: string; on: string; text: string };
  /** Cover colour for `book`; also the swatch on the mobile selection card. */
  spine?: string;
  /** Required for `folder`. */
  opening?: ReaderOpening;
  openingLabel?: string;
  /** `frame`, `phone` and `resume` (contact links), `chess` (the profile link) and `notes` (all reviews, booking). */
  links?: ReaderLink[];
  /** `chess` only: the chess.com username whose public ratings the board shows live. */
  chessUsername?: string;
  /** `resume` only: the name at the top of the sheet. */
  person?: string;
  /** `resume` only: where the person is based, beside the contact links. */
  location?: string;
  /** What the scene's hover chip says, when it differs from `title`. */
  hotspotLabel?: string;
  /** `frame` only: leave the title off the opened frame (the picture and its caption speak for themselves). */
  hideTitle?: boolean;
  /** `globe` only: country names, matched against scene/countries.ts to place a marker on the globe. */
  visited?: string[];
  /** `globe` only: the number of countries the owner is aiming to reach. */
  goal?: number;
  /** `diploma` only: the degree on the diploma that unrolls from the tube. */
  degree?: DiplomaDegree;
  /** `diploma` only: courses and specializations, as small certificates. */
  courses?: Course[];
  /** `chat` only: what the cat knows, as answers to pick or type a question for. */
  chat?: ChatScript;
  /** `notes` only: the reviews, in the order they are dealt. */
  notes?: MenteeNote[];
  /** `phone` only: what each number on the dial reaches. */
  speedDial?: SpeedDial[];
  /** `phone` only: the reply for a number nobody answers; `{digit}` is replaced with the number dialled. */
  wrongNumber?: string;
  /** `llama` only: coin counts that earn a message when reached, in increasing order. */
  milestones?: LlamaMilestone[];
  pages: ReaderPage[];
}

/** The visual parts of a page, without its text: what `right` holds. */
/** The visuals a page can have in place of a picture, drawn by the Reader from data. */
export const PANEL_KEYS = ["chart", "polaroids", "stats", "cards", "compare", "showcase", "timeline", "hobbies", "glossary", "poll", "funnel", "migration", "quotes", "personas", "journey", "palette", "model3d", "prototype"] as const;
export type PanelKey = (typeof PANEL_KEYS)[number];

export type PageArt = Pick<ReaderPage, "image" | "caption" | PanelKey>;

/** One thing the chatbot can say, found by its button or by words in a typed question. */
export interface ChatAnswer {
  id: string;
  /** The question on its button ("Who is Júlia?"). */
  button: string;
  /**
   * Words and phrases that point to this answer in a typed question, in any case and with or without accents. A
   * phrase ("burger king") counts more than a single word; a word of four letters or more also matches longer forms
   * ("design" finds "designer").
   */
  keywords: string[];
  /** The reply, a bubble per line; `**bold**` works. */
  reply: string[];
  /** A button under the reply that opens another object in the office: an item id and its label. */
  open?: { id: string; label: string };
  /** The answers to offer next, by id; the opening ones if left out. */
  next?: string[];
}

export interface ChatScript {
  /** The face beside the name: a picture in src/assets/cases (square). */
  avatar: string;
  /** A picture that opens large when the face is clicked, and what it shows (its alt text and caption). */
  photo?: { image: string; alt: string };
  /** The first bubbles, before anything is asked. */
  greeting: string[];
  /** The answers offered as buttons at the start, by id. */
  start: string[];
  /** The placeholder in the text field. */
  placeholder: string;
  answers: ChatAnswer[];
  /** The reply when nothing matches a typed question. */
  fallback: string[];
  /** A button under the fallback (to contact the owner). */
  fallbackOpen?: { id: string; label: string };
}

/** Personas, switched with tabs: who they are, their situation and what they need. `image` is a square portrait. */
export interface PagePersonas {
  kicker?: string;
  title?: string;
  items: {
    name: string;
    role: string;
    image?: string;
    /** Short facts under the name ("28", "Porto Alegre"). */
    facts: string[];
    traits: string[];
    about: string;
    /** How they behave and decide (optional). */
    behavior?: string[];
    context: string[];
    needs: string[];
  }[];
}

/**
 * Journeys in stages, with the mood at each point (1 low to 5 high, one or two per stage, in order) drawn as a line;
 * tapping a stage shows what the person does and feels there.
 */
export interface PageJourney {
  kicker?: string;
  title?: string;
  /** One journey per person ("Clara"), switched with tabs when there are several. */
  people: { who: string; stages: { name: string; moods: number[]; doing: string; feeling: string }[] }[];
}

/** A small style sheet: the logo, the typeface (loaded on the page) and named colours. */
export interface PagePalette {
  kicker?: string;
  title?: string;
  logo?: string;
  font?: { name: string; note?: string };
  colors: { name: string; hex: string }[];
}

/** One of the office's 3D models (by name) on a turntable; `note` is the line under it. */
export interface PageModel {
  kicker?: string;
  title?: string;
  model: "bookshelf" | "wall-shelf";
  note?: string;
}

/**
 * A clickable prototype that lives in this site (e.g. "bora/"), shown in an iframe. `screens` are its chapters (ids
 * the prototype understands) listed beside it; a click there jumps the prototype to that screen.
 */
export interface PagePrototype {
  kicker?: string;
  title?: string;
  /** Short paragraphs beside the prototype (bold with ** **). */
  intro?: string[];
  /** The prototype's path in this site, without a leading slash. */
  path: string;
  screens: { id: string; label: string }[];
  /** A line under the list ("Tap through it like a phone"). */
  note?: string;
  /** On phones, a screen image (from src/assets/cases) shown with a button that opens the prototype full screen. */
  poster?: string;
}
