import { mkdtempSync, mkdirSync, writeFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { estimateTextHeight, textCapacity } from "../../src/content/pageFit";
import type { NotionClient } from "./api";
import { buildCase, buildFromRoot, educationLine, ImageNamer, parseTestimonials, skillLine, type SyncConfig } from "./entries";
import { flatten } from "./flatten";
import { syncImages } from "./images";
import { paginate } from "./paginate";
import { mergeEntry, plan } from "./sync";
import type { Block } from "./types";

// ---- tiny builders for Notion's block shapes ------------------------------------------------------------------------
type Span = { t: string; bold?: boolean; href?: string };
const rich = (...spans: (Span | string)[]) =>
  spans.map((s) => {
    const o = typeof s === "string" ? { t: s } : s;
    return { plain_text: o.t, href: o.href ?? null, annotations: { bold: !!o.bold, italic: false, code: false } };
  });
let n = 0;
const block = (type: string, payload: object, children?: Block[]): Block => ({ id: `b${++n}`, type, has_children: !!children, children, [type]: payload });
const p = (...s: (Span | string)[]) => block("paragraph", { rich_text: rich(...s) });
const h = (level: 1 | 2 | 3, text: string) => block(`heading_${level}`, { rich_text: rich(text) });
const li = (text: string, kids?: Block[]) => block("bulleted_list_item", { rich_text: rich(text) }, kids);
const img = (path: string, sig = "s1", caption = "") => block("image", { type: "file", file: { url: `https://files.example.com${path}?sig=${sig}` }, caption: rich(caption) });

const config: SyncConfig = {
  root: "root",
  cases: { case1: { page: "page1", processStartsAt: "Design Process", outcomeStartsAt: "Results" } },
  rootSections: { Contact: "phone", Mentorship: "phone", Education: "studies", Skills: "resume-skills", Language: "resume-languages", Testimonials: "testimonials" },
  about: { photo: false },
};

const rootBlocks = (): Block[] => [
  h(3, "Hi, I’m Júlia, a Senior Product Designer."),
  p("First paragraph about my work."),
  p("Second paragraph."),
  block("divider", {}),
  block("callout", { rich_text: [] }, [p({ t: "Linkedin", href: "https://www.linkedin.com/in/julia-moresco/" })]),
  img("/photo.png"),
  h(2, "Contact"),
  p("55 51 995427566"),
  p("hello@example.com"),
  p("Porto Alegre, Rio Grande do Sul, Brazil"),
  h(2, "Mentorship"),
  p("As a mentor, I organize weekly meetings. Please schedule a time:"),
  p({ t: "ADPList: Get mentored", href: "https://adplist.org/mentors/julia-moresco" }),
  h(1, "Projects"),
  block("child_database", { title: "Projects" }),
  h(2, "Education"),
  li("Bachelor in Visual Design\nUniversidade Federal (2016-2023)"),
  li("Specialization in AI\nPM3 — 2026"),
  h(2, "Skills"),
  li("Prototyping", [p("Figma, Adobe XD")]),
  li("Analytics", [p("Amplitude, Google Analytics")]),
  h(2, "Language"),
  li("English – Full Professional Fluency"),
  h(1, "Testimonials"),
  block("divider", {}),
  p("“She is the best designer I know."),
  p("A second quote paragraph.”"),
  p({ t: "-Valentina Costa", bold: true }, ", Product Manager at Acme"),
  p("“Rarely come across real professionals like Júlia.”"),
  p("– ", { t: "Nicolau Monteiro", bold: true }, ", Product Manager"),
];

const caseBlocks = (): Block[] => [
  h(2, "Project Summary"),
  p("Client: Acme"),
  h(2, "Design Process"),
  p("We looked at real usage."),
  img("/process.png", "sig1", "Process diagram"),
  h(2, "Results"),
  p("Conversion went up."),
  block("video", { type: "external", external: { url: "https://youtu.be/x" } }),
];

const casePage = (cover = true) => ({
  id: "page1",
  url: "u",
  cover: cover ? { type: "file", file: { url: "https://files.example.com/cover.png?sig=a" } } : null,
  properties: {
    Name: { type: "title", title: rich("Improving Loyalty") },
    Project: { type: "rich_text", rich_text: rich("One-line summary.") },
    Industry: { type: "multi_select", multi_select: [{ name: "QSR" }] },
    Expertise: { type: "multi_select", multi_select: [{ name: "Product Design" }, { name: "User Research" }] },
    Year: { type: "number", number: 2024 },
  },
});

describe("flatten", () => {
  it("turns a short bold line into a topic heading, but leaves 'Label:' bold text and bold-in-sentence alone", () => {
    const items = flatten([p({ t: "Interview Insights", bold: true }), p({ t: "Key results:", bold: true }, " one two"), p("A ", { t: "bold", bold: true }, " word")]);
    expect(items[0]).toEqual({ kind: "heading", level: 4, text: "Interview Insights" });
    expect(items.filter((i) => i.kind === "heading")).toHaveLength(1);
    expect(items.filter((i) => i.kind === "text").map((i) => (i as { text: string }).text)).toEqual(["Key results: one two", "A bold word"]);
  });

  it("numbers list items and joins paragraphs nested under an item", () => {
    const items = flatten([block("numbered_list_item", { rich_text: rich("First") }), block("numbered_list_item", { rich_text: rich("Second") }), li("Skill", [p("A, B")])]);
    expect(items.map((i) => (i as { text: string }).text)).toEqual(["1. First", "2. Second", "Skill\nA, B"]);
  });

  it("reports what it cannot show instead of dropping it silently", () => {
    const items = flatten([block("video", { type: "external", external: { url: "https://youtu.be/x" } }), block("table", {})]);
    expect(items.map((i) => i.kind)).toEqual(["note", "note"]);
  });
});

describe("paginate", () => {
  const long = Array.from({ length: 30 }, (_, i) => `Sentence number ${i} says something reasonably long about research.`).join(" ");

  it("never builds a page taller than the Reader can show", () => {
    const pages = paginate("Process", "Research Approach", [{ kind: "text", text: long }, ...Array.from({ length: 12 }, (_, i) => ({ kind: "text" as const, text: `Item ${i}: a short list entry` }))]);
    expect(pages.length).toBeGreaterThan(2);
    for (const pg of pages) expect(estimateTextHeight(pg.lines)).toBeLessThanOrEqual(textCapacity(pg.heading));
  });

  it("closes a page with its picture and never invents a picture for a text-only page", () => {
    const pages = paginate("Process", "Design", [{ kind: "text", text: "Before." }, { kind: "image", name: "a", caption: "Fig" }, { kind: "text", text: "After." }]);
    expect(pages[0].image).toBe("a");
    expect(pages[0].caption).toBe("Fig");
    expect(pages[1].image).toBeUndefined();
  });
});

describe("case entries", () => {
  it("assigns Overview / Process / Outcome from the configured headings and puts the cover first", () => {
    const r = buildCase("case1", config.cases.case1, casePage(), caseBlocks());
    const pages = r.patch.pages as { kicker: string; heading: string; image?: string | string[] }[];
    expect(pages.map((x) => x.kicker)).toEqual(["Overview", "Process", "Outcome"]);
    expect(pages[0].heading).toBe("Project Summary");
    expect(pages[0].image).toMatch(/^case1-cover-[0-9a-f]{6}$/);
    expect(pages[1].image).toMatch(/^case1-01-[0-9a-f]{6}$/);
    expect(r.patch).toMatchObject({ title: "Improving Loyalty", tag: "Case study · QSR", role: "Product Design, User Research", year: "2024" });
    expect(r.images).toHaveLength(2);
    expect(r.warnings.some((w) => /video/.test(w))).toBe(true);
  });

  it("opens the first page with the database's one-line summary", () => {
    const r = buildCase("case1", config.cases.case1, casePage(), caseBlocks());
    expect((r.patch.pages as { lines: string[] }[])[0].lines[0]).toBe("One-line summary.");
  });

  it("says so when a configured heading is gone or the cover is missing", () => {
    const r = buildCase("case1", { ...config.cases.case1, processStartsAt: "Renamed" }, casePage(false), caseBlocks());
    expect(r.warnings.join("\n")).toMatch(/no heading starting "Renamed"/);
    expect(r.warnings.join("\n")).toMatch(/no cover/);
  });

  it("keeps a picture's file name when Notion re-signs its link, and changes it when the picture is replaced", () => {
    const a = new ImageNamer("case1").next("https://files.example.com/ws/abc/x.png?sig=1");
    const b = new ImageNamer("case1").next("https://files.example.com/ws/abc/x.png?sig=2");
    const c = new ImageNamer("case1").next("https://files.example.com/ws/def/x.png?sig=1");
    expect(a).toBe(b);
    expect(a).not.toBe(c);
  });
});

describe("root page entries", () => {
  const results = buildFromRoot(config, rootBlocks());
  const byId = Object.fromEntries(results.map((r) => [r.id, r]));

  it("never publishes the phone number or the city", () => {
    const all = JSON.stringify(results);
    expect(all).not.toMatch(/995427566/);
    expect(all).not.toMatch(/Porto Alegre/);
    expect(all).toContain("hello@example.com");
  });

  it("builds the phone's links from what is in Notion", () => {
    expect(byId.phone.patch.links).toEqual([
      { label: "LinkedIn", href: "https://www.linkedin.com/in/julia-moresco/" },
      { label: "Email", href: "mailto:hello@example.com" },
      { label: "ADPList", href: "https://adplist.org/mentors/julia-moresco" },
    ]);
  });

  it("writes About with the intro, bio and each testimonial, without using the photo", () => {
    const pages = byId.about.patch.pages as { kicker: string; heading: string; lines: string[] }[];
    expect(pages[0]).toMatchObject({ kicker: "Who", lines: ["Hi, I’m Júlia, a Senior Product Designer."] });
    expect(pages.filter((x) => x.kicker === "Testimonial").map((x) => x.heading)).toEqual(["Valentina Costa", "Nicolau Monteiro"]);
    expect(pages.every((x) => !("image" in x))).toBe(true);
    expect(results[0].warnings.join("\n")).toMatch(/photo is not used/);
  });

  it("formats education and skills lines", () => {
    expect(educationLine("Bachelor in Visual Design\nUniversidade Federal (2016-2023)")).toBe("Bachelor in Visual Design — Universidade Federal (2016-2023)");
    expect(educationLine("Specialization in AI\nPM3 — 2026")).toBe("Specialization in AI — PM3 (2026)");
    expect(skillLine("Prototyping\nFigma, Adobe XD")).toBe("Prototyping: Figma, Adobe XD");
    expect((byId.studies.patch.pages as { lines: string[] }[]).flatMap((x) => x.lines)).toContain("Specialization in AI — PM3 (2026)");
    expect((byId.resume.patch.pages as { kicker: string }[]).map((x) => x.kicker)).toEqual(["Skills", "Languages"]);
  });

  it("splits testimonials at the attribution line", () => {
    const t = parseTestimonials(["“Q1.", "Q2.”", "-Ann Lee, Designer at X", "“Q3.”", "– Bo Kim, PM"]);
    expect(t).toEqual([
      { name: "Ann Lee", quote: ["“Q1.", "Q2.”"], role: "Designer at X" },
      { name: "Bo Kim", quote: ["“Q3.”"], role: "PM" },
    ]);
  });

  it("warns when a mapped section was renamed in Notion", () => {
    const r = buildFromRoot(config, rootBlocks().filter((b) => !(b.type === "heading_2" && JSON.stringify(b).includes("Education"))));
    expect(r[0].warnings.join("\n")).toMatch(/no section titled "Education"/);
  });
});

describe("plan", () => {
  const client = {
    page: async () => casePage(),
    blocks: async (id: string) => (id === "root" ? rootBlocks() : caseBlocks()),
    queryDatabase: async () => [],
  } as unknown as NotionClient;

  it("keeps fields Notion does not own, and is a no-op the second time", async () => {
    const files: Record<string, string> = { case1: JSON.stringify({ skin: "book", title: "Old", spine: "#C96B5E", pages: [{ lines: ["x"] }] }) };
    const first = await plan(client, config, ["case1"], (id) => files[id] ?? null);
    expect(first[0].changed).toBe(true);
    expect(JSON.parse(first[0].after)).toMatchObject({ skin: "book", spine: "#C96B5E", title: "Improving Loyalty" });
    const second = await plan(client, config, ["case1"], () => first[0].after);
    expect(second[0].changed).toBe(false);
  });

  it("stops with a clear message when the result would not load on the site", async () => {
    const bad = { ...client, page: async () => ({ ...casePage(), properties: {} }) } as unknown as NotionClient;
    await expect(plan(bad, config, ["case1"], () => JSON.stringify({ skin: "book", pages: [] }))).rejects.toThrow(/case1\.json: title is required/);
  });

  it("mergeEntry leaves the file's value where the patch has nothing", () => {
    expect(mergeEntry({ a: 1, b: 2 }, { a: undefined, b: 3 })).toEqual({ a: 1, b: 3 });
  });
});

describe("syncImages", () => {
  it("removes only pictures this run owns that are no longer used", async () => {
    const dir = mkdtempSync(join(tmpdir(), "imgs-"));
    mkdirSync(dir, { recursive: true });
    for (const f of ["case1-01-aaaaaa.webp", "case1-02-bbbbbb.webp", "chess-01.webp", "case2-01-cccccc.webp"]) writeFileSync(join(dir, f), "x");
    const report = await syncImages([{ name: "case1-01-aaaaaa", url: "https://unused" }], ["case1"], dir, { write: true });
    expect(report).toEqual({ downloaded: [], reused: 1, removed: ["case1-02-bbbbbb.webp"] });
    expect(readdirSync(dir).sort()).toEqual(["case1-01-aaaaaa.webp", "case2-01-cccccc.webp", "chess-01.webp"]);
  });

  it("changes nothing on a check run", async () => {
    const dir = mkdtempSync(join(tmpdir(), "imgs-"));
    writeFileSync(join(dir, "case1-old-aaaaaa.webp"), "x");
    const report = await syncImages([{ name: "case1-01-new111", url: "https://unused" }], ["case1"], dir, { write: false });
    expect(report.downloaded).toEqual(["case1-01-new111"]);
    expect(report.removed).toEqual(["case1-old-aaaaaa.webp"]);
    expect(readdirSync(dir)).toEqual(["case1-old-aaaaaa.webp"]);
  });
});
