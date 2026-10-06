import { HOBBY_ICONS, PANEL_KEYS, type ReaderItem } from "./types";

const SKINS = ["book", "folder", "frame", "globe", "llama", "chess", "phone", "notes", "postcard", "resume", "diploma", "chat"];
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
  if (o.hideTitle !== undefined && (typeof o.hideTitle !== "boolean" || o.skin !== "frame")) bad("hideTitle is true or false, and only for the frame skin");
  if (o.accent !== undefined) {
    const a = o.accent as Record<string, unknown> | null;
    if (!a || !["fill", "on", "text"].every((k) => typeof a[k] === "string" && HEX.test(a[k] as string))) bad("accent is { fill, on, text }, each a #RRGGBB colour");
  }
  if (o.spine !== undefined && (typeof o.spine !== "string" || !HEX.test(o.spine))) bad("spine must be a #RRGGBB colour");
  if (o.skin === "folder" && (typeof o.opening !== "string" || !OPENINGS.includes(o.opening))) {
    bad(`a folder needs an opening: ${OPENINGS.join(", ")}`);
  }
  if (o.skin !== "folder" && o.opening !== undefined) bad("opening only applies to the folder skin");
  if (o.links !== undefined) {
    if (!["frame", "chess", "phone", "notes", "resume"].includes(o.skin as string)) bad("links only apply to the frame, phone, chess, notes and resume skins");
    if (!Array.isArray(o.links) || o.links.some((l) => !l || typeof l.label !== "string" || typeof l.href !== "string")) {
      bad("links must be a list of { label, href }");
    }
  }
  if (o.visited !== undefined || o.goal !== undefined) {
    if (o.skin !== "globe") bad("visited and goal only apply to the globe skin");
    if (o.visited !== undefined && (!Array.isArray(o.visited) || o.visited.some((c) => typeof c !== "string"))) {
      bad("visited must be a list of country names");
    }
    if (o.goal !== undefined && (typeof o.goal !== "number" || o.goal <= 0)) bad("goal must be a positive number");
  }
  if (o.skin === "globe" && (!Array.isArray(o.visited) || o.visited.length === 0)) bad("a globe needs at least one visited country");
  if (o.chessUsername !== undefined && (typeof o.chessUsername !== "string" || !o.chessUsername || o.skin !== "chess")) {
    bad("chessUsername is a chess.com username, and only for the chess skin");
  }
  if (o.skin === "chess" && !o.chessUsername) bad("the chess skin needs a chessUsername");
  if (o.speedDial !== undefined || o.wrongNumber !== undefined) {
    if (o.skin !== "phone") bad("speedDial and wrongNumber only apply to the phone skin");
    if (o.wrongNumber !== undefined && (typeof o.wrongNumber !== "string" || !o.wrongNumber)) bad("wrongNumber must be a line of text");
  }
  if (o.skin === "phone") {
    const sd = o.speedDial;
    const labels = Array.isArray(o.links) ? (o.links as { label: string }[]).map((l) => l.label) : [];
    if (!Array.isArray(sd) || sd.length === 0) bad("a phone needs a speedDial list");
    (sd as Record<string, unknown>[]).forEach((d, i) => {
      if (!d || typeof d.digit !== "string" || !/^[0-9]$/.test(d.digit)) bad(`speedDial[${i}].digit must be a single digit, "0" to "9"`);
      if (typeof d.text !== "string" || !d.text) bad(`speedDial[${i}].text is required`);
      if (d.link !== undefined && (typeof d.link !== "string" || !labels.includes(d.link))) bad(`speedDial[${i}].link must be the label of one of the links`);
    });
    const digits = (sd as { digit: string }[]).map((d) => d.digit);
    if (new Set(digits).size !== digits.length) bad("speedDial digits must be different from each other");
  }
  for (const k of ["person", "location"]) {
    if (o[k] !== undefined && (typeof o[k] !== "string" || o.skin !== "resume")) bad(`${k} is a line of text, and only for the resume skin`);
  }
  if ((o.degree !== undefined || o.courses !== undefined) && o.skin !== "diploma") bad("degree and courses only apply to the diploma skin");
  if (o.skin === "diploma") {
    const d = o.degree as Record<string, unknown> | undefined;
    if (!d || ["school", "short", "degree", "person", "years"].some((k) => typeof d[k] !== "string" || !d[k])) bad("a diploma needs degree: { school, short, degree, person, years }");
    if (o.courses !== undefined && (!Array.isArray(o.courses) || (o.courses as Record<string, unknown>[]).some((c) => !c || typeof c.school !== "string" || typeof c.course !== "string" || typeof c.year !== "string"))) {
      bad("courses must be a list of { school, course, year }");
    }
  }
  if (o.chat !== undefined && o.skin !== "chat") bad("chat only applies to the chat skin");
  if (o.skin === "chat") {
    const c = o.chat as Record<string, unknown> | undefined;
    if (!c || typeof c !== "object") bad("the chat skin needs a chat script");
    const strings = (v: unknown) => Array.isArray(v) && v.length > 0 && v.every((x) => typeof x === "string" && x);
    if (!strings(c!.greeting)) bad("chat.greeting is a list of lines");
    if (!strings(c!.fallback)) bad("chat.fallback is a list of lines");
    if (typeof c!.placeholder !== "string") bad("chat.placeholder must be a string");
    if (typeof c!.avatar !== "string" || !c!.avatar) bad("chat.avatar is a picture name");
    const ph = c!.photo as { image?: unknown; alt?: unknown } | undefined;
    if (ph !== undefined && (!ph || typeof ph.image !== "string" || typeof ph.alt !== "string")) bad("chat.photo must be { image, alt }");
    const answers = c!.answers as Record<string, unknown>[];
    if (!Array.isArray(answers) || answers.length === 0) bad("chat.answers needs a list of answers");
    const ids = new Set<string>();
    answers.forEach((a, i) => {
      if (!a || typeof a.id !== "string" || !a.id) bad(`chat.answers[${i}] needs an id`);
      if (ids.has(a.id as string)) bad(`chat.answers[${i}]: the id "${a.id}" is used twice`);
      ids.add(a.id as string);
      if (typeof a.button !== "string" || !a.button) bad(`chat.answers[${i}] needs a button`);
      if (!strings(a.keywords)) bad(`chat.answers[${i}].keywords is a list of words`);
      if (!strings(a.reply)) bad(`chat.answers[${i}].reply is a list of lines`);
    });
    const checkIds = (list: unknown, where: string) => {
      if (list === undefined) return;
      if (!Array.isArray(list) || list.some((id) => !ids.has(id as string))) bad(`${where} must list answer ids that exist`);
    };
    checkIds(c!.start, "chat.start");
    if (!Array.isArray(c!.start)) bad("chat.start must list answer ids");
    answers.forEach((a, i) => checkIds(a.next, `chat.answers[${i}].next`));
    for (const [where, open] of [...answers.map((a, i) => [`chat.answers[${i}].open`, a.open] as const), ["chat.fallbackOpen", c!.fallbackOpen] as const]) {
      const op = open as { id?: unknown; label?: unknown } | undefined;
      if (op !== undefined && (!op || typeof op.id !== "string" || typeof op.label !== "string")) bad(`${where} must be { id, label }`);
    }
  }
  if (o.notes !== undefined && o.skin !== "notes") bad("notes only apply to the notes skin");
  if (o.skin === "notes") {
    const ns = o.notes;
    if (!Array.isArray(ns) || ns.length === 0) bad("the notes skin needs a list of notes");
    (ns as Record<string, unknown>[]).forEach((n, i) => {
      if (!n || typeof n.quote !== "string" || typeof n.snippet !== "string" || typeof n.name !== "string") bad(`notes[${i}] needs a quote, a snippet and a name`);
      for (const k of ["role", "date", "source"]) if (n[k] !== undefined && typeof n[k] !== "string") bad(`notes[${i}].${k} must be a string`);
      if (n.translated !== undefined && typeof n.translated !== "boolean") bad(`notes[${i}].translated is true or false`);
    });
  }
  if (o.milestones !== undefined) {
    if (o.skin !== "llama") bad("milestones only apply to the llama skin");
    const ms = o.milestones;
    if (!Array.isArray(ms) || ms.some((m) => !m || !Number.isInteger(m.at) || m.at <= 0 || typeof m.text !== "string" || !m.text)) {
      bad("milestones must be a list of { at: positive whole number, text }");
    }
    if ((ms as { at: number }[]).some((m, i, all) => i > 0 && m.at <= all[i - 1].at)) bad("milestones must be in increasing order of at");
  }
  if (!Array.isArray(o.pages) || o.pages.length === 0) return bad("pages must be a non-empty list");
  o.pages.forEach((p: unknown, i: number) => {
    const r = (p as Record<string, unknown> | null)?.right as Record<string, unknown> | undefined;
    if (r !== undefined && (!r || typeof r !== "object" || !["image", ...PANEL_KEYS].some((k) => r[k] !== undefined))) {
      bad(`pages[${i}].right needs a visual: image or one of ${PANEL_KEYS.join(", ")}`);
    }
    const pg = p as Record<string, unknown> | null;
    if (!pg || typeof pg !== "object") bad(`pages[${i}] must be an object`);
    if (pg!.plate !== undefined && typeof pg!.plate !== "string") bad(`pages[${i}].plate must be a string`);
    const img = pg!.image;
    if (img !== undefined && !(typeof img === "string" || (Array.isArray(img) && img.length > 0 && img.every((x) => typeof x === "string")))) {
      bad(`pages[${i}].image must be a file name or a list of file names`);
    }
    if (pg!.artRight !== undefined && typeof pg!.artRight !== "boolean") bad(`pages[${i}].artRight is true or false`);
    if (pg!.hideHeading !== undefined && typeof pg!.hideHeading !== "boolean") bad(`pages[${i}].hideHeading is true or false`);
    if (pg!.chart !== undefined) {
      const c = pg!.chart as Record<string, unknown> | null;
      if (!c || typeof c !== "object" || typeof c.title !== "string" || !c.title) bad(`pages[${i}].chart needs a title`);
      if (c!.kicker !== undefined && typeof c!.kicker !== "string") bad(`pages[${i}].chart.kicker must be a string`);
      if (c!.color !== undefined && (typeof c!.color !== "string" || !HEX.test(c!.color))) bad(`pages[${i}].chart.color must be a #RRGGBB colour`);
      const gs = c!.groups;
      if (!Array.isArray(gs) || gs.length === 0) bad(`pages[${i}].chart.groups must be a non-empty list`);
      (gs as Record<string, unknown>[]).forEach((g, j) => {
        if (!g || typeof g.title !== "string" || !g.title) bad(`pages[${i}].chart.groups[${j}].title is required`);
        if (g.subtitle !== undefined && typeof g.subtitle !== "string") bad(`pages[${i}].chart.groups[${j}].subtitle must be a string`);
        const bars = g.bars as { label?: unknown; value?: unknown }[] | undefined;
        if (!Array.isArray(bars) || bars.length === 0) bad(`pages[${i}].chart.groups[${j}].bars must be a non-empty list`);
        bars!.forEach((b, k) => {
          if (!b || typeof b.label !== "string" || typeof b.value !== "number" || b.value < 0 || b.value > 100) {
            bad(`pages[${i}].chart.groups[${j}].bars[${k}] must be { label, value: 0 to 100 }`);
          }
        });
      });
    }
    if (pg!.showcase !== undefined) {
      const sc = pg!.showcase as { screens?: Record<string, unknown>[]; intro?: unknown } | null;
      if (!sc || !Array.isArray(sc.screens) || sc.screens.length === 0) bad(`pages[${i}].showcase needs a list of screens`);
      sc!.screens!.forEach((x, j) => {
        if (!x || typeof x.image !== "string" || typeof x.label !== "string") bad(`pages[${i}].showcase.screens[${j}] needs an image and a label`);
      });
      if (sc!.intro !== undefined && (!Array.isArray(sc!.intro) || (sc!.intro as unknown[]).some((l) => typeof l !== "string"))) bad(`pages[${i}].showcase.intro must be a list of strings`);
    }
    if (pg!.compare !== undefined) {
      const cm = pg!.compare as { variants?: Record<string, unknown>[] } | null;
      if (!cm || !Array.isArray(cm.variants) || cm.variants.length < 2) bad(`pages[${i}].compare needs at least two variants`);
      cm!.variants!.forEach((v, j) => {
        if (!v || typeof v.label !== "string" || !Array.isArray(v.images) || v.images.length === 0 || v.images.some((n) => typeof n !== "string")) {
          bad(`pages[${i}].compare.variants[${j}] needs a label and a list of images`);
        }
      });
    }
    if (pg!.stats !== undefined) {
      const st = pg!.stats as { items?: Record<string, unknown>[] } | null;
      if (!st || !Array.isArray(st.items) || st.items.length === 0) bad(`pages[${i}].stats needs a list of items`);
      st!.items!.forEach((it, j) => {
        if (!it || typeof it.label !== "string" || (it.value === undefined ? typeof it.display !== "string" : typeof it.value !== "number")) {
          bad(`pages[${i}].stats.items[${j}] needs a label and either a number (value) or a word (display)`);
        }
      });
    }
    if (pg!.cards !== undefined) {
      const cs = pg!.cards as { items?: Record<string, unknown>[] } | null;
      if (!cs || !Array.isArray(cs.items) || cs.items.length === 0) bad(`pages[${i}].cards needs a list of items`);
      cs!.items!.forEach((c, j) => {
        if (!c || typeof c.title !== "string" || typeof c.body !== "string") bad(`pages[${i}].cards.items[${j}] needs a title and a body`);
      });
    }
    if (pg!.polaroids !== undefined) {
      const po = pg!.polaroids as { note?: unknown; photos?: { image?: unknown; caption?: unknown }[] } | null;
      if (!po || typeof po !== "object" || !Array.isArray(po.photos) || po.photos.length === 0 || po.photos.length > 6) {
        bad(`pages[${i}].polaroids needs a list of 1 to 6 photos`);
      }
      if (po!.note !== undefined && typeof po!.note !== "string") bad(`pages[${i}].polaroids.note must be a string`);
      po!.photos!.forEach((ph, j) => {
        if (!ph || typeof ph.image !== "string" || (ph.caption !== undefined && typeof ph.caption !== "string")) bad(`pages[${i}].polaroids.photos[${j}] must be { image, caption? }`);
      });
    }
    if (pg!.timeline !== undefined) {
      const tl = pg!.timeline as { stops?: Record<string, unknown>[] } | null;
      if (!tl || !Array.isArray(tl.stops) || tl.stops.length === 0) bad(`pages[${i}].timeline needs a list of stops`);
      tl!.stops!.forEach((st, j) => {
        if (!st || typeof st.year !== "string" || typeof st.name !== "string" || typeof st.role !== "string") bad(`pages[${i}].timeline.stops[${j}] needs a year, a name and a role`);
        if (st.now !== undefined && typeof st.now !== "boolean") bad(`pages[${i}].timeline.stops[${j}].now is true or false`);
      });
    }
    if (pg!.hobbies !== undefined) {
      const hb = pg!.hobbies as { items?: Record<string, unknown>[] } | null;
      if (!hb || !Array.isArray(hb.items) || hb.items.length === 0) bad(`pages[${i}].hobbies needs a list of items`);
      hb!.items!.forEach((h, j) => {
        if (!h || typeof h.label !== "string" || !(HOBBY_ICONS as readonly unknown[]).includes(h.icon)) bad(`pages[${i}].hobbies.items[${j}] needs a label and an icon (${HOBBY_ICONS.join(", ")})`);
        if (h.open !== undefined && typeof h.open !== "string") bad(`pages[${i}].hobbies.items[${j}].open must be an item id`);
      });
    }
    const list = (v: unknown): v is Record<string, unknown>[] => Array.isArray(v) && v.length > 0 && v.every((x) => x && typeof x === "object");
    if (pg!.glossary !== undefined) {
      const g = pg!.glossary as { items?: unknown };
      if (!list(g?.items)) bad(`pages[${i}].glossary needs a list of items`);
      (g.items as Record<string, unknown>[]).forEach((t, j) => {
        if (typeof t.term !== "string" || typeof t.body !== "string") bad(`pages[${i}].glossary.items[${j}] needs a term and a body`);
      });
    }
    if (pg!.poll !== undefined) {
      const q = pg!.poll as { question?: unknown; options?: unknown; answer?: unknown; reveal?: unknown };
      if (!q || typeof q.question !== "string" || typeof q.reveal !== "string") bad(`pages[${i}].poll needs a question and a reveal`);
      if (!list(q.options) || q.options.length < 2 || q.options.some((o) => typeof o.label !== "string")) bad(`pages[${i}].poll needs two or more options, each with a label`);
      if (!Number.isInteger(q.answer) || (q.answer as number) < 0 || (q.answer as number) >= (q.options as unknown[]).length) bad(`pages[${i}].poll.answer must be the index of one of its options`);
    }
    if (pg!.funnel !== undefined) {
      const f = pg!.funnel as { steps?: unknown };
      if (!list(f?.steps)) bad(`pages[${i}].funnel needs a list of steps`);
      (f.steps as Record<string, unknown>[]).forEach((st, j) => {
        if (typeof st.value !== "number" || st.value < 0 || typeof st.label !== "string") bad(`pages[${i}].funnel.steps[${j}] needs a value (0 or more) and a label`);
      });
    }
    if (pg!.migration !== undefined) {
      const mg = pg!.migration as Record<string, unknown>;
      if (!mg || typeof mg.from !== "string" || typeof mg.to !== "string" || typeof mg.caption !== "string" || typeof mg.value !== "number") bad(`pages[${i}].migration needs from, to, value and caption`);
      if (!Array.isArray(mg.items) || mg.items.length === 0 || mg.items.some((x) => typeof x !== "string")) bad(`pages[${i}].migration.items is a list of names`);
    }
    if (pg!.quotes !== undefined) {
      const qs = pg!.quotes as { items?: unknown };
      if (!list(qs?.items) || (qs.items as Record<string, unknown>[]).some((x) => typeof x.text !== "string")) bad(`pages[${i}].quotes needs a list of items, each with a text`);
    }
    if (pg!.personas !== undefined) {
      const ps = pg!.personas as { items?: unknown };
      if (!list(ps?.items)) bad(`pages[${i}].personas needs a list of items`);
      (ps.items as Record<string, unknown>[]).forEach((p, j) => {
        const strs = (v: unknown) => Array.isArray(v) && v.every((x) => typeof x === "string");
        if (typeof p.name !== "string" || typeof p.role !== "string" || typeof p.about !== "string" || !["facts", "traits", "context", "needs"].every((k) => strs(p[k]))) {
          bad(`pages[${i}].personas.items[${j}] needs a name, role, about, and lists of facts, traits, context and needs`);
        }
        if (p.behavior !== undefined && !strs(p.behavior)) bad(`pages[${i}].personas.items[${j}].behavior is a list of lines`);
      });
    }
    if (pg!.journey !== undefined) {
      const jn = pg!.journey as { people?: unknown };
      if (!list(jn?.people)) bad(`pages[${i}].journey needs a list of people`);
      (jn.people as Record<string, unknown>[]).forEach((pp, k) => {
        if (typeof pp.who !== "string" || !list(pp.stages)) bad(`pages[${i}].journey.people[${k}] needs who and a list of stages`);
      });
      (jn.people as { stages: Record<string, unknown>[] }[]).flatMap((pp) => pp.stages).forEach((st, j) => {
        const moods = st.moods as unknown[];
        if (typeof st.name !== "string" || typeof st.doing !== "string" || typeof st.feeling !== "string") bad(`pages[${i}].journey.stages[${j}] needs a name, doing and feeling`);
        if (!Array.isArray(moods) || moods.length === 0 || moods.some((m) => typeof m !== "number" || m < 1 || m > 5)) bad(`pages[${i}].journey.stages[${j}].moods is a list of numbers from 1 to 5`);
      });
    }
    if (pg!.palette !== undefined) {
      const pl = pg!.palette as { colors?: unknown };
      if (!list(pl?.colors) || (pl.colors as Record<string, unknown>[]).some((c) => typeof c.name !== "string" || typeof c.hex !== "string" || !HEX.test(c.hex))) bad(`pages[${i}].palette needs colours, each { name, hex }`);
    }
    if (pg!.prototype !== undefined) {
      const pt = pg!.prototype as { path?: unknown; screens?: unknown };
      if (!pt || typeof pt.path !== "string" || pt.path.startsWith("/")) bad(`pages[${i}].prototype.path is a site path without a leading slash`);
      if (!list(pt.screens) || (pt.screens as Record<string, unknown>[]).some((x) => typeof x.id !== "string" || typeof x.label !== "string")) bad(`pages[${i}].prototype.screens needs { id, label } items`);
    }
    if (pg!.model3d !== undefined) {
      const md = pg!.model3d as { model?: unknown };
      if (!md || !["bookshelf", "wall-shelf"].includes(md.model as string)) bad(`pages[${i}].model3d.model is "bookshelf" or "wall-shelf"`);
    }
    for (const k of ["compare", "showcase"] as const) {
      const dv = (pg![k] as { device?: unknown } | undefined)?.device;
      if (dv !== undefined && dv !== "phone" && dv !== "desktop") bad(`pages[${i}].${k}.device is "phone" or "desktop"`);
    }
    if (pg!.fullPage !== undefined && (typeof pg!.fullPage !== "boolean" || pg!.image === undefined)) bad(`pages[${i}].fullPage is true or false, and needs an image`);
    if (pg!.pageColor !== undefined && (typeof pg!.pageColor !== "string" || !HEX.test(pg!.pageColor) || !pg!.fullPage)) bad(`pages[${i}].pageColor is a #RRGGBB colour, and needs fullPage`);
    if (pg!.caption !== undefined && typeof pg!.caption !== "string") bad(`pages[${i}].caption must be a string`);
    if (!Array.isArray(pg!.lines) || pg!.lines.some((l) => typeof l !== "string")) bad(`pages[${i}].lines must be a list of strings`);
    (pg!.lines as string[]).forEach((l, j) => {
      if ((l.match(/\*\*/g) ?? []).length % 2) bad(`pages[${i}].lines[${j}] has a ** without its partner (bold goes between two **)`);
    });
    for (const k of ["kicker", "heading"]) {
      if (pg![k] !== undefined && typeof pg![k] !== "string") bad(`pages[${i}].${k} must be a string`);
    }
  });
}

export { estimateTextHeight, textCapacity } from "./pageFit.ts";
