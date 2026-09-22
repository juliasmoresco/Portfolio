import type { Item } from "./flatten.ts";

export interface Section {
  /** Empty for the text before the first heading. */
  heading: string;
  items: Item[];
}

/**
 * Split a flat item list at headings. `sectionLevel` says how deep a Notion heading still opens a new section
 * (3 = all of h1-h3); deeper headings become a "Heading:" line inside their section. Bold lead-ins always open one.
 */
export function sectionize(items: Item[], sectionLevel = 3): Section[] {
  const sections: Section[] = [{ heading: "", items: [] }];
  for (const it of items) {
    if (it.kind === "heading") {
      if (it.level === 4 || it.level <= sectionLevel) sections.push({ heading: it.text, items: [] });
      else sections[sections.length - 1].items.push({ kind: "text", text: it.text + ":" });
    } else {
      sections[sections.length - 1].items.push(it);
    }
  }
  // Drop sections with nothing to show (a title line on its own, an empty preface).
  return sections.filter((s) => s.items.some((i) => i.kind === "text" || i.kind === "image"));
}
