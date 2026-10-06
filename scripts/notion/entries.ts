import { createHash } from "node:crypto";
import { flatten, type Item } from "./flatten.ts";
import { paginate, type OutPage, type PackItem } from "./paginate.ts";
import { sectionize, type Section } from "./sections.ts";
import type { Block, PageInfo } from "./types.ts";

export interface CaseConfig {
  page: string;
  /** The heading where the "Process" part begins, and where "Outcome" begins. Everything before is "Overview". */
  processStartsAt: string;
  outcomeStartsAt: string;
  /** How deep a Notion heading still starts a new page group (default 3: h1-h3). */
  sectionLevel?: number;
}

export interface SyncConfig {
  root: string;
  cases: Record<string, CaseConfig>;
  rootSections: Record<string, string>;
  about: { photo: boolean };
}

export interface ImageJob {
  /** File name without extension, in src/assets/cases. */
  name: string;
  url: string;
}

/** What to write into one content file, plus what it needs and what could not be shown. */
export interface EntryResult {
  id: string;
  /** Fields to overwrite in src/content/reader/<id>.json; everything else in the file is left alone. */
  patch: Record<string, unknown>;
  images: ImageJob[];
  warnings: string[];
}

const norm = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
const startsWithHeading = (heading: string, wanted: string) => norm(heading).startsWith(norm(wanted));

const hash6 = (url: string) => createHash("sha1").update(new URL(url).pathname).digest("hex").slice(0, 6);

/** Hands out picture file names: <entry>-<nn>-<hash of where the file lives>, so a replaced picture gets a new name. */
export class ImageNamer {
  readonly jobs: ImageJob[] = [];
  private n = 0;
  private readonly entry: string;
  constructor(entry: string) {
    this.entry = entry;
  }
  next(url: string): string {
    const name = `${this.entry}-${String(++this.n).padStart(2, "0")}-${hash6(url)}`;
    this.jobs.push({ name, url });
    return name;
  }
  cover(url: string): string {
    const name = `${this.entry}-cover-${hash6(url)}`;
    this.jobs.push({ name, url });
    return name;
  }
}

function toPackItems(section: Section, namer: ImageNamer): PackItem[] {
  const out: PackItem[] = [];
  for (const it of section.items) {
    if (it.kind === "text") out.push({ kind: "text", text: it.text });
    else if (it.kind === "image") out.push({ kind: "image", name: namer.next(it.url), caption: it.caption });
  }
  return out;
}

/** Notes worth telling the owner about: things on the Notion page the Reader cannot show. */
export function skippedNotes(items: Item[], where: string): string[] {
  const out: string[] = [];
  for (const it of items) {
    if (it.kind === "note") out.push(`${where}: skipped a ${it.what} (${it.detail})`);
    else if (it.kind === "link") out.push(`${where}: link not shown in the page text: "${it.text}" → ${it.url}`);
  }
  return out;
}

// ---- properties of a Projects database row ------------------------------------------------------------------------

type Prop = { type: string; [k: string]: unknown } | undefined;
const richPlain = (rt: unknown) => (Array.isArray(rt) ? rt.map((r: { plain_text: string }) => r.plain_text).join("") : "").trim();
export const titleOf = (p: Prop) => richPlain(p?.title);
export const textOf = (p: Prop) => richPlain(p?.rich_text);
export const namesOf = (p: Prop): string[] => ((p?.multi_select as { name: string }[]) ?? []).map((o) => o.name);
export const numberOf = (p: Prop): number | null => (typeof p?.number === "number" ? (p.number as number) : null);

// ---- case studies -------------------------------------------------------------------------------------------------

export function buildCase(id: string, cfg: CaseConfig, page: PageInfo, blocks: Block[]): EntryResult {
  const warnings: string[] = [];
  const items = flatten(blocks, true);
  warnings.push(...skippedNotes(items, id));
  const sections = sectionize(items, cfg.sectionLevel ?? 3);
  const namer = new ImageNamer(id);

  let part: "Overview" | "Process" | "Outcome" = "Overview";
  let sawProcess = false;
  let sawOutcome = false;
  const pages: OutPage[] = [];
  const summary = textOf(page.properties.Project);

  sections.forEach((section, i) => {
    if (!sawProcess && startsWithHeading(section.heading, cfg.processStartsAt)) {
      part = "Process";
      sawProcess = true;
    }
    if (!sawOutcome && startsWithHeading(section.heading, cfg.outcomeStartsAt)) {
      part = "Outcome";
      sawOutcome = true;
    }
    const packed = toPackItems(section, namer);
    // The database's one-line summary opens the first page.
    if (i === 0 && summary) packed.unshift({ kind: "text", text: summary });
    pages.push(...paginate(part, section.heading || "Overview", packed));
  });

  if (!sawProcess) warnings.push(`${id}: no heading starting "${cfg.processStartsAt}" — everything is in "Overview". Update processStartsAt in notion.config.json.`);
  if (!sawOutcome) warnings.push(`${id}: no heading starting "${cfg.outcomeStartsAt}" — nothing is in "Outcome". Update outcomeStartsAt in notion.config.json.`);

  // The page cover in Notion is the case's cover picture, on the first page.
  const coverUrl = page.cover?.type === "file" ? page.cover.file?.url : page.cover?.type === "external" ? page.cover.external?.url : undefined;
  if (coverUrl && pages.length) {
    const cover = namer.cover(coverUrl);
    const existing = pages[0].image;
    pages[0].image = existing === undefined ? cover : [cover, ...(Array.isArray(existing) ? existing : [existing])];
  } else if (!coverUrl) {
    warnings.push(`${id}: this Notion page has no cover, so the book's first page has no picture.`);
  }

  const industries = namesOf(page.properties.Industry);
  const year = numberOf(page.properties.Year);
  const patch: Record<string, unknown> = {
    title: titleOf(page.properties.Name) || undefined,
    tag: industries.length ? `Case study · ${industries.join(" / ")}` : "Case study",
    role: namesOf(page.properties.Expertise).join(", ") || undefined,
    year: year === null ? undefined : String(year),
    pages,
  };
  return { id, patch, images: namer.jobs, warnings };
}

// ---- the root page: about, education, skills, testimonials, contact --------------------------------------------------

/** "Degree\nSchool — 2026" → "Degree — School (2026)". */
export function educationLine(text: string): string {
  const [name, ...rest] = text.split("\n");
  const tail = rest.join(" ").trim();
  if (!tail) return text.trim();
  const m = /^(.*?)\s*[—–-]\s*(\d{4}(?:\s*[-–]\s*\d{4})?)$/.exec(tail);
  const school = m ? `${m[1]} (${m[2].replace(/\s+/g, "")})` : tail;
  return `${name.trim()} — ${school}`;
}

/** "Category\nA, B, C" → "Category: A, B, C". */
export function skillLine(text: string): string {
  const [name, ...rest] = text.split("\n");
  const tail = rest.join(" ").trim();
  return tail ? `${name.trim()}: ${tail}` : name.trim();
}

const textLines = (s: Section) => s.items.flatMap((i) => (i.kind === "text" ? [i.text] : []));

/** Testimonials: quote paragraphs, then a line like "-Name, Role" that closes each one. */
export function parseTestimonials(lines: string[]): { name: string; quote: string[]; role: string }[] {
  const out: { name: string; quote: string[]; role: string }[] = [];
  let quote: string[] = [];
  for (const line of lines) {
    const m = /^\s*[-–—]\s*([^,]+?)\s*,\s*(.+)$/.exec(line);
    if (m) {
      out.push({ name: m[1], quote, role: m[2] });
      quote = [];
    } else {
      quote.push(line);
    }
  }
  if (quote.length) out.push({ name: "", quote, role: "" });
  return out;
}

export function buildFromRoot(config: SyncConfig, blocks: Block[]): EntryResult[] {
  const warnings: string[] = [];
  const items = flatten(blocks);
  warnings.push(...skippedNotes(items, "home page").filter((w) => !/child_database|Projects/.test(w)));
  const sections = sectionize(items, 3);

  const routes = new Map(Object.entries(config.rootSections).map(([h, target]) => [norm(h), target]));
  const byTarget = new Map<string, Section[]>();
  const bio: Section[] = [];
  for (const s of sections) {
    const target = routes.get(norm(s.heading));
    if (target) byTarget.set(target, [...(byTarget.get(target) ?? []), s]);
    else bio.push(s);
  }
  for (const [heading, target] of Object.entries(config.rootSections)) {
    if (!byTarget.has(target)) warnings.push(`home page: no section titled "${heading}" (for ${target}). Renamed in Notion? Update rootSections in notion.config.json.`);
  }

  const results: EntryResult[] = [];

  // About: the first section is the bio. Its heading is the one-line introduction; the paragraphs follow.
  const bioSection = bio.find((s) => s.heading || s.items.some((i) => i.kind === "text"));
  const aboutPages: OutPage[] = [];
  if (bioSection) {
    const paragraphs = textLines(bioSection);
    if (bioSection.heading) aboutPages.push({ kicker: "Who", heading: "About me", lines: [bioSection.heading] });
    aboutPages.push(...paginate("How I work", "Practice", paragraphs.map((text) => ({ kind: "text", text }) as PackItem)));
    if (bioSection.items.some((i) => i.kind === "image") && !config.about.photo) warnings.push("home page: the photo is not used yet (about.photo is false in notion.config.json).");
  } else {
    warnings.push("home page: found no bio text before the first mapped heading.");
  }
  for (const t of parseTestimonials((byTarget.get("testimonials") ?? []).flatMap(textLines))) {
    const lines = [...t.quote, ...(t.role ? [t.role] : [])];
    aboutPages.push(...paginate("Testimonial", t.name || "Testimonial", lines.map((text) => ({ kind: "text", text }) as PackItem)));
  }
  results.push({ id: "about", patch: { pages: aboutPages }, images: [], warnings: [] });

  // Studies: the education list.
  const education = (byTarget.get("studies") ?? []).flatMap(textLines).map(educationLine);
  results.push({
    id: "studies",
    patch: { pages: paginate("Studies", "Where I studied", education.map((text) => ({ kind: "text", text }) as PackItem)).map(({ heading: _h, ...p }) => p) },
    images: [],
    warnings: [],
  });

  // Résumé: skills, then languages.
  const skills = (byTarget.get("resume-skills") ?? []).flatMap(textLines).map(skillLine);
  const languages = (byTarget.get("resume-languages") ?? []).flatMap(textLines);
  const strip = ({ heading: _h, ...p }: OutPage) => p;
  results.push({
    id: "resume",
    patch: {
      pages: [
        ...paginate("Skills", "Résumé", skills.map((text) => ({ kind: "text", text }) as PackItem)).map(strip),
        ...paginate("Languages", "Résumé", languages.map((text) => ({ kind: "text", text }) as PackItem)).map(strip),
      ],
    },
    images: [],
    warnings: [],
  });

  // The phone: email, the mentorship note, and links. Only the email is taken from "Contact"; the phone number and the
  // city that sit beside it are deliberately not published.
  const contactLines = (byTarget.get("phone") ?? []).flatMap((s) => (norm(s.heading) === "contact" ? textLines(s) : []));
  const email = contactLines.find((l) => /\S+@\S+\.\S+/.test(l))?.match(/\S+@\S+\.\S+/)?.[0];
  const mentorship = (byTarget.get("phone") ?? []).filter((s) => norm(s.heading) === "mentorship");
  const mentorText = mentorship.flatMap(textLines);
  const allLinks = [...bio, ...(byTarget.get("phone") ?? [])].flatMap((s) => s.items).filter((i): i is Extract<Item, { kind: "link" }> => i.kind === "link");
  const linkedin = allLinks.find((l) => /linkedin\.com/.test(l.url));
  const adplist = mentorship.flatMap((s) => s.items).find((i): i is Extract<Item, { kind: "link" }> => i.kind === "link");
  const links = [
    ...(linkedin ? [{ label: "LinkedIn", href: linkedin.url }] : []),
    ...(email ? [{ label: "Email", href: `mailto:${email}` }] : []),
    ...(adplist ? [{ label: /adplist/i.test(adplist.url) ? "ADPList" : new URL(adplist.url).hostname.replace(/^www\./, ""), href: adplist.url }] : []),
  ];
  if (!email) warnings.push("home page: no email address found under Contact.");
  if (!linkedin) warnings.push("home page: no LinkedIn link found.");
  results.push({
    id: "phone",
    patch: { links, pages: [{ kicker: "Contact", lines: [...(email ? [email] : []), ...mentorText] }] },
    images: [],
    warnings: [],
  });

  results[0].warnings.push(...warnings);
  return results;
}
