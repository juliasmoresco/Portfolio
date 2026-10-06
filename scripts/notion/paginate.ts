import { estimateTextHeight, textCapacity } from "../../src/content/pageFit.ts";

/** A page as the Reader's content files store it. */
export interface OutPage {
  kicker: string;
  heading: string;
  lines: string[];
  /** File name(s), without extension, of pictures in src/assets/cases. */
  image?: string | string[];
  caption?: string;
}

/** What goes into a section, in order: text lines and pictures already given their file names. */
export type PackItem = { kind: "text"; text: string } | { kind: "image"; name: string; caption: string };

/** A paragraph longer than a whole page is split at sentence ends. */
export function splitLong(paragraph: string, limit: number): string[] {
  if (estimateTextHeight([paragraph]) <= limit) return [paragraph];
  // A **bold** run stays whole: a sentence end inside one is not a place to split.
  const sentences: string[] = [];
  for (const part of paragraph.split(/(?<=[.!?”"])\s+/)) {
    const prev = sentences[sentences.length - 1];
    if (prev !== undefined && (prev.match(/\*\*/g) ?? []).length % 2) sentences[sentences.length - 1] = `${prev} ${part}`;
    else sentences.push(part);
  }
  const out: string[] = [];
  let cur = "";
  for (const s of sentences) {
    if (cur && estimateTextHeight([`${cur} ${s}`]) > limit) {
      out.push(cur);
      cur = s;
    } else {
      cur = `${cur} ${s}`.trim();
    }
  }
  if (cur) out.push(cur);
  return out;
}

/**
 * Pack one section onto as many pages as it needs. Text fills a page until it is full; a picture is attached to the
 * page holding the text before it, and closes that page, so a picture sits beside what it illustrates. Pictures that
 * follow each other with no text between them share a page, side by side.
 */
export function paginate(kicker: string, heading: string, items: PackItem[]): OutPage[] {
  const limit = textCapacity(heading);
  const pages: OutPage[] = [];
  let lines: string[] = [];
  let names: string[] = [];
  let caps: string[] = [];
  let closed = false;

  const flush = () => {
    if (lines.length || names.length) {
      const page: OutPage = { kicker, heading, lines };
      if (names.length) page.image = names.length === 1 ? names[0] : names;
      if (caps.length) page.caption = caps.join(" · ");
      pages.push(page);
    }
    lines = [];
    names = [];
    caps = [];
    closed = false;
  };

  for (const item of items) {
    if (item.kind === "image") {
      names.push(item.name);
      if (item.caption) caps.push(item.caption);
      closed = true;
      continue;
    }
    for (const piece of splitLong(item.text, limit)) {
      if (closed || (lines.length && estimateTextHeight([...lines, piece]) > limit)) flush();
      lines.push(piece);
    }
  }
  flush();
  return pages;
}
