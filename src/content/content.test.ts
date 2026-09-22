import { describe, expect, it } from "vitest";
import { readerContent, hotspotLabels, imageUrls } from "./index";
import { assertReaderItem, estimateTextHeight, textCapacity } from "./validate";
import { HOTSPOT_IDS } from "../scene/hotspots";

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
    for (const [id, item] of Object.entries(readerContent)) {
      item.pages.forEach((page, i) => {
        const heading = item.skin === "book" ? page.heading || item.title : item.title;
        const chars = page.lines.reduce((n, l) => n + l.length, 0);
        if (item.skin === "frame") {
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
    for (const [id, item] of Object.entries(readerContent)) {
      item.pages.forEach((page, i) => {
        const names = page.image === undefined ? [] : Array.isArray(page.image) ? page.image : [page.image];
        names.filter((n) => !imageUrls[n]).forEach((n) => missing.push(`${id} page ${i + 1}: no image "${n}" (run npm run images?)`));
      });
    }
    expect(missing).toEqual([]);
  });

  it("rejects malformed entries with a message that names the file and field", () => {
    expect(() => assertReaderItem("x", { skin: "folder", title: "T", pages: [{ plate: "p", lines: [] }] })).toThrow(/x\.json: a folder needs an opening/);
    expect(() => assertReaderItem("x", { skin: "book", title: "T", spine: "red", pages: [] })).toThrow(/spine must be a #RRGGBB/);
    expect(() => assertReaderItem("x", { skin: "book", title: "T", pages: [] })).toThrow(/pages must be a non-empty list/);
  });
});
