import type { Block, RichText } from "./types.ts";

/** What a Notion page becomes before it is split into sections and pages: a flat list in reading order. */
export type Item =
  /** level 1-3 are Notion headings; 4 is a short bold line that opens a topic ("Interview Insights"). */
  | { kind: "heading"; level: 1 | 2 | 3 | 4; text: string }
  | { kind: "text"; text: string }
  | { kind: "image"; url: string; caption: string; blockId: string }
  /** A standalone link (a button, bookmark or link-only line): not page text, but builders may use it. */
  | { kind: "link"; text: string; url: string }
  /** Something the Reader cannot show (video, embed, table...). Reported so nothing is dropped silently. */
  | { kind: "note"; what: string; detail: string };

type Payload = { rich_text?: RichText[]; caption?: RichText[]; url?: string; type?: string; file?: { url: string }; external?: { url: string } };
const data = (b: Block): Payload => (b[b.type] ?? {}) as Payload;

export const plain = (rt: RichText[] = []): string => rt.map((r) => r.plain_text).join("");

/** Tidy spacing without losing soft line breaks, which builders use ("Degree\nSchool"). */
export const tidy = (s: string): string =>
  s
    .replace(/ /g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();

/**
 * A paragraph that starts with a short bold line, on its own line, opens a topic ("Interview Insights"). A bold label
 * that ends with a colon ("Key results:"), or bold words inside a sentence, stay ordinary text.
 */
export function splitBoldLead(rt: RichText[]): { lead: string; rest: string } | null {
  if (!rt.length || !rt[0].annotations.bold) return null;
  let i = 0;
  let lead = "";
  while (i < rt.length && rt[i].annotations.bold) lead += rt[i++].plain_text;
  const rest = rt.slice(i).map((r) => r.plain_text).join("");
  const endsLine = lead.endsWith("\n") || rest === "" || rest.startsWith("\n");
  const text = tidy(lead);
  if (!endsLine || !text || text.length > 70 || text.endsWith(":")) return null;
  return { lead: text, rest: tidy(rest) };
}

function soleLink(rt: RichText[]): { text: string; url: string } | null {
  const parts = rt.filter((r) => r.plain_text.trim());
  if (!parts.length || !parts.every((r) => r.href && r.href === parts[0].href)) return null;
  return { text: tidy(plain(parts)), url: parts[0].href! };
}

/** Walk Notion's blocks depth-first, so columns and synced blocks read in the order a person reads them. */
export function flatten(blocks: Block[]): Item[] {
  const out: Item[] = [];
  let numbered = 0;

  for (const b of blocks) {
    const d = data(b);
    const kids = b.children ?? [];
    if (b.type !== "numbered_list_item") numbered = 0;

    switch (b.type) {
      case "heading_1":
      case "heading_2":
      case "heading_3": {
        const text = tidy(plain(d.rich_text));
        if (text) out.push({ kind: "heading", level: Number(b.type.slice(-1)) as 1 | 2 | 3, text });
        out.push(...flatten(kids));
        break;
      }
      case "paragraph": {
        const rt = d.rich_text ?? [];
        const link = soleLink(rt);
        const lead = splitBoldLead(rt);
        if (link) out.push({ kind: "link", ...link });
        else if (lead) {
          out.push({ kind: "heading", level: 4, text: lead.lead });
          if (lead.rest) out.push({ kind: "text", text: lead.rest });
        } else {
          const text = tidy(plain(rt));
          if (text) out.push({ kind: "text", text });
        }
        out.push(...flatten(kids));
        break;
      }
      case "bulleted_list_item":
      case "numbered_list_item": {
        const n = b.type === "numbered_list_item" ? ++numbered : 0;
        let text = tidy(plain(d.rich_text));
        // Plain paragraphs nested under an item belong to it ("Skills" > "Vibe-coding" > "Claude Code, ...").
        const own = kids.filter((k) => k.type === "paragraph");
        const rest = kids.filter((k) => k.type !== "paragraph");
        for (const k of own) {
          const t = tidy(plain(data(k).rich_text));
          if (t) text += (text ? "\n" : "") + t;
        }
        if (text) out.push({ kind: "text", text: n ? `${n}. ${text}` : text });
        out.push(...flatten(rest));
        break;
      }
      case "quote":
      case "callout":
      case "toggle": {
        const rt = d.rich_text ?? [];
        const link = soleLink(rt);
        const text = tidy(plain(rt));
        if (link) out.push({ kind: "link", ...link });
        else if (text) out.push({ kind: "text", text });
        out.push(...flatten(kids));
        break;
      }
      case "bookmark":
      case "link_preview": {
        const url = d.url ?? "";
        if (url) out.push({ kind: "link", text: tidy(plain(d.caption)) || url, url });
        break;
      }
      case "image": {
        const url = d.type === "external" ? d.external?.url : d.file?.url;
        if (url) out.push({ kind: "image", url, caption: tidy(plain(d.caption)), blockId: b.id });
        break;
      }
      case "column_list":
      case "column":
      case "synced_block":
        out.push(...flatten(kids));
        break;
      case "divider":
      case "table_of_contents":
      case "breadcrumb":
        break;
      case "code":
      case "equation": {
        const text = tidy(plain(d.rich_text));
        if (text) out.push({ kind: "text", text });
        break;
      }
      case "video":
      case "file":
      case "pdf":
      case "embed":
      case "audio":
        out.push({ kind: "note", what: b.type, detail: d.type === "external" ? (d.external?.url ?? "") : tidy(plain(d.caption)) || "(uploaded file)" });
        break;
      case "child_database":
      case "child_page":
        out.push({ kind: "note", what: b.type, detail: (b[b.type] as { title?: string })?.title ?? "" });
        break;
      case "table":
        out.push({ kind: "note", what: "table", detail: "tables are not shown in the Reader" });
        break;
      default:
        out.push({ kind: "note", what: b.type, detail: "block type not supported" });
    }
  }
  return out;
}
