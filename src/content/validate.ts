import type { ReaderItem } from "./types";

const SKINS = ["book", "folder", "frame"];
const OPENINGS = ["hinge", "tube", "binder", "lid"];
const HEX = /^#[0-9a-fA-F]{6}$/;

/** Throws a message that names the entry and the field, so a typo in a JSON file is easy to find. */
export function assertReaderItem(id: string, v: unknown): asserts v is ReaderItem {
  const bad = (msg: string): never => {
    throw new Error(`content/reader/${id}.json: ${msg}`);
  };
  if (!v || typeof v !== "object") return bad("must be an object");
  const o = v as Record<string, unknown>;
  if (typeof o.skin !== "string" || !SKINS.includes(o.skin)) bad(`skin must be one of ${SKINS.join(", ")}`);
  if (typeof o.title !== "string" || !o.title) bad("title is required");
  for (const k of ["year", "role", "tag", "kind", "openingLabel", "hotspotLabel"]) {
    if (o[k] !== undefined && typeof o[k] !== "string") bad(`${k} must be a string`);
  }
  if (o.spine !== undefined && (typeof o.spine !== "string" || !HEX.test(o.spine))) bad("spine must be a #RRGGBB colour");
  if (o.skin === "folder" && (typeof o.opening !== "string" || !OPENINGS.includes(o.opening))) {
    bad(`a folder needs an opening: ${OPENINGS.join(", ")}`);
  }
  if (o.skin !== "folder" && o.opening !== undefined) bad("opening only applies to the folder skin");
  if (o.links !== undefined) {
    if (o.skin !== "frame") bad("links only apply to the frame skin");
    if (!Array.isArray(o.links) || o.links.some((l) => !l || typeof l.label !== "string" || typeof l.href !== "string")) {
      bad("links must be a list of { label, href }");
    }
  }
  if (!Array.isArray(o.pages) || o.pages.length === 0) return bad("pages must be a non-empty list");
  o.pages.forEach((p: unknown, i: number) => {
    const pg = p as Record<string, unknown> | null;
    if (!pg || typeof pg !== "object") bad(`pages[${i}] must be an object`);
    if (pg!.plate !== undefined && typeof pg!.plate !== "string") bad(`pages[${i}].plate must be a string`);
    const img = pg!.image;
    if (img !== undefined && !(typeof img === "string" || (Array.isArray(img) && img.length > 0 && img.every((x) => typeof x === "string")))) {
      bad(`pages[${i}].image must be a file name or a list of file names`);
    }
    if (pg!.caption !== undefined && typeof pg!.caption !== "string") bad(`pages[${i}].caption must be a string`);
    if (!Array.isArray(pg!.lines) || pg!.lines.some((l) => typeof l !== "string")) bad(`pages[${i}].lines must be a list of strings`);
    for (const k of ["kicker", "heading"]) {
      if (pg![k] !== undefined && typeof pg![k] !== "string") bad(`pages[${i}].${k} must be a string`);
    }
  });
}

export { estimateTextHeight, textCapacity } from "./pageFit.ts";
