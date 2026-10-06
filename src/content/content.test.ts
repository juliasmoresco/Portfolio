import { describe, expect, it } from "vitest";
import { readerContent, readerContentPt, hotspotLabels, imageUrls } from "./index";
import { assertReaderItem, estimateTextHeight, textCapacity } from "./validate";
import { HOTSPOT_IDS } from "../scene/hotspots";
import { COUNTRY_LONLAT } from "../scene/countries";

/** Every entry in both languages, named "case1" in English and "pt/case1" in Portuguese. */
const ALL = [...Object.entries(readerContent), ...Object.entries(readerContentPt).map(([id, item]) => [`pt/${id}`, item] as const)];

describe("reader content", () => {
  it("has an entry for every hotspot in the scene", () => {
    expect(HOTSPOT_IDS.filter((id) => !readerContent[id])).toEqual([]);
  });

  it("has no entries without a hotspot (every Reader must be reachable)", () => {
    const known = new Set<string>(HOTSPOT_IDS);
    expect(Object.keys(readerContent).filter((id) => !known.has(id))).toEqual([]);
  });

  it("labels every hotspot", () => {
    expect(Object.keys(hotspotLabels)).toHaveLength(HOTSPOT_IDS.length);
    expect(Object.values(hotspotLabels).every(Boolean)).toBe(true);
  });

  // Pages are sized for short copy. The estimate is calibrated against real pages on desktop (see validate.ts); a frame
  // gives some of its space to the image plate, so it is held to a plain character budget instead.
  it("keeps every page short enough to fit on desktop", () => {
    const tooLong: string[] = [];
    for (const [id, item] of ALL) {
      item.pages.forEach((page, i) => {
        const heading = item.skin === "book" ? page.heading || item.title : item.title;
        const chars = page.lines.reduce((n, l) => n + l.length, 0);
        if (item.skin === "frame" || item.skin === "phone") {
          if (chars > 320) tooLong.push(`${id} page ${i + 1}: ${chars} characters (max 320); split it across more pages`);
          return;
        }
        const height = estimateTextHeight(page.lines);
        const max = textCapacity(heading);
        if (height > max) tooLong.push(`${id} page ${i + 1} ("${heading}"): about ${height}px of text (max ${max}px); split it across more pages`);
      });
    }
    expect(tooLong).toEqual([]);
  });

  it("only names images that exist in src/assets/cases", () => {
    const missing: string[] = [];
    for (const [id, item] of ALL) {
      item.pages.forEach((page, i) => {
        const art = (a: typeof page) => [...(a.image === undefined ? [] : Array.isArray(a.image) ? a.image : [a.image]), ...(a.polaroids?.photos.map((ph) => ph.image) ?? []), ...(a.compare?.variants.flatMap((v) => v.images) ?? []), ...(a.showcase?.screens.map((x) => x.image) ?? []), ...(a.personas?.items.flatMap((x) => (x.image ? [x.image] : [])) ?? []), ...(a.palette?.logo ? [a.palette.logo] : [])];
        const names = [...art(page), ...(page.right ? art({ lines: [], ...page.right }) : []), ...(i === 0 && item.degree?.image ? [item.degree.image] : [])];
        names.filter((n) => !imageUrls[n]).forEach((n) => missing.push(`${id} page ${i + 1}: no image "${n}" (run npm run images?)`));
      });
    }
    expect(missing).toEqual([]);
  });

  it("translates only entries that exist in English, keeping their skin", () => {
    const wrong: string[] = [];
    for (const [id, pt] of Object.entries(readerContentPt)) {
      const en = readerContent[id];
      if (!en) wrong.push(`pt/${id}.json: there is no ${id}.json in English`);
      else if (en.skin !== pt.skin) wrong.push(`pt/${id}.json: skin "${pt.skin}" should be "${en.skin}" like the English one`);
      // The résumé finds its sections by kicker, so those stay in English (the Reader shows them translated).
      else if (pt.skin === "resume") {
        const kickers = new Set(en.pages.map((p) => p.kicker));
        pt.pages.filter((p) => !kickers.has(p.kicker)).forEach((p) => wrong.push(`pt/${id}.json: kicker "${p.kicker}" should stay as in English`));
      }
    }
    expect(wrong).toEqual([]);
  });

  it("only names countries with coordinates in scene/countries.ts", () => {
    const missing: string[] = [];
    for (const [id, item] of Object.entries(readerContent)) {
      (item.visited ?? []).filter((c) => !COUNTRY_LONLAT[c]).forEach((c) => missing.push(`${id}: no coordinates for "${c}" (add it to scene/countries.ts)`));
    }
    expect(missing).toEqual([]);
  });

  it("rejects malformed entries with a message that names the file and field", () => {
    expect(() => assertReaderItem("x", { skin: "folder", title: "T", pages: [{ plate: "p", lines: [] }] })).toThrow(/x\.json: a folder needs an opening/);
    expect(() => assertReaderItem("x", { skin: "book", title: "T", spine: "red", pages: [] })).toThrow(/spine must be a #RRGGBB/);
    expect(() => assertReaderItem("x", { skin: "book", title: "T", pages: [] })).toThrow(/pages must be a non-empty list/);
    expect(() => assertReaderItem("x", { skin: "book", title: "T", visited: ["Brazil"], pages: [{ lines: [] }] })).toThrow(/visited and goal only apply to the globe skin/);
    expect(() => assertReaderItem("x", { skin: "globe", title: "T", pages: [{ lines: [] }] })).toThrow(/a globe needs at least one visited country/);
    expect(() => assertReaderItem("x", { skin: "book", title: "T", milestones: [{ at: 10, text: "a" }], pages: [{ lines: [] }] })).toThrow(/milestones only apply to the llama skin/);
    expect(() =>
      assertReaderItem("x", { skin: "llama", title: "T", milestones: [{ at: 25, text: "a" }, { at: 10, text: "b" }], pages: [{ lines: [] }] }),
    ).toThrow(/increasing order/);
    expect(() => assertReaderItem("x", { skin: "phone", title: "T", pages: [{ lines: [] }] })).toThrow(/a phone needs a speedDial list/);
    expect(() =>
      assertReaderItem("x", { skin: "phone", title: "T", links: [{ label: "A", href: "#" }], speedDial: [{ digit: "1", link: "B", text: "t" }], pages: [{ lines: [] }] }),
    ).toThrow(/label of one of the links/);
    expect(() =>
      assertReaderItem("x", { skin: "phone", title: "T", speedDial: [{ digit: "1", text: "a" }, { digit: "1", text: "b" }], pages: [{ lines: [] }] }),
    ).toThrow(/different from each other/);
  });
});
