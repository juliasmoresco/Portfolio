import { describe, expect, it } from "vitest";
import { readerContent, hotspotLabels } from "./index";
import { assertReaderItem } from "./validate";
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

  it("rejects malformed entries with a message that names the file and field", () => {
    expect(() => assertReaderItem("x", { skin: "folder", title: "T", pages: [{ plate: "p", lines: [] }] })).toThrow(/x\.json: a folder needs an opening/);
    expect(() => assertReaderItem("x", { skin: "book", title: "T", spine: "red", pages: [] })).toThrow(/spine must be a #RRGGBB/);
    expect(() => assertReaderItem("x", { skin: "book", title: "T", pages: [] })).toThrow(/pages must be a non-empty list/);
  });
});
