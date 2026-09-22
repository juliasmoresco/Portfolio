// Notion → the site's content files.
//   npm run sync                 read Notion, rewrite src/content/reader/*.json and src/assets/cases/*.webp
//   npm run sync -- --check      read Notion and report what would change; writes nothing, downloads nothing
//   npm run sync -- --only case1,about
// It never commits and never publishes: you review `git diff`, then commit and push when you are happy.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { assertReaderItem } from "../../src/content/validate.ts";
import { createNotionClient, type NotionClient } from "./api.ts";
import { buildCase, buildFromRoot, type EntryResult, type SyncConfig } from "./entries.ts";
import { syncImages } from "./images.ts";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const CONTENT_DIR = join(ROOT, "src/content/reader");
const IMAGE_DIR = join(ROOT, "src/assets/cases");

/** Everything the run wants to say about one entry. */
export interface Planned extends EntryResult {
  before: string | null;
  after: string;
  changed: boolean;
}

/** Merge `patch` into the existing file's fields. Missing fields in the patch (undefined) leave the file's value alone. */
export function mergeEntry(existing: Record<string, unknown> | null, patch: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...(existing ?? {}) };
  for (const [k, v] of Object.entries(patch)) if (v !== undefined) out[k] = v;
  return out;
}

const serialize = (o: unknown) => JSON.stringify(o, null, 2) + "\n";

/** Reads Notion and works out every entry's new content. Touches no files except to read the current ones. */
export async function plan(client: NotionClient, config: SyncConfig, only: string[] | null, readCurrent: (id: string) => string | null): Promise<Planned[]> {
  const results: EntryResult[] = [];
  const wants = (id: string) => !only || only.includes(id);

  for (const [id, cfg] of Object.entries(config.cases)) {
    if (!wants(id)) continue;
    const [page, blocks] = await Promise.all([client.page(cfg.page), client.blocks(cfg.page)]);
    results.push(buildCase(id, cfg, page, blocks));
  }
  if (["about", "studies", "resume", "phone"].some(wants)) {
    const blocks = await client.blocks(config.root);
    results.push(...buildFromRoot(config, blocks).filter((r) => wants(r.id)));
  }

  return results.map((r) => {
    const before = readCurrent(r.id);
    const merged = mergeEntry(before ? (JSON.parse(before) as Record<string, unknown>) : null, r.patch);
    assertReaderItem(r.id, merged);
    const after = serialize(merged);
    return { ...r, before, after, changed: before !== after };
  });
}

function loadToken(): string {
  const envFile = join(ROOT, ".env");
  if (existsSync(envFile)) process.loadEnvFile(envFile);
  const token = process.env.NOTION_TOKEN?.trim();
  if (!token) {
    throw new Error("No NOTION_TOKEN found. Create a .env file in the project folder containing NOTION_TOKEN=... (see docs/notion-sync.md, step 1).");
  }
  return token;
}

async function main() {
  const args = process.argv.slice(2);
  const check = args.includes("--check");
  const onlyArg = args.find((a) => a.startsWith("--only="))?.slice(7) ?? (args.includes("--only") ? args[args.indexOf("--only") + 1] : undefined);
  const only = onlyArg ? onlyArg.split(",").map((s) => s.trim()) : null;

  const config = JSON.parse(readFileSync(join(ROOT, "notion.config.json"), "utf8")) as SyncConfig;
  const client = createNotionClient(loadToken());
  const file = (id: string) => join(CONTENT_DIR, `${id}.json`);

  console.log(check ? "Checking Notion (nothing will be written)…\n" : "Syncing from Notion…\n");
  const planned = await plan(client, config, only, (id) => (existsSync(file(id)) ? readFileSync(file(id), "utf8") : null));

  const images = planned.flatMap((p) => p.images);
  const report = await syncImages(images, planned.map((p) => p.id), IMAGE_DIR, { write: !check });
  if (!check) for (const p of planned) if (p.changed) writeFileSync(file(p.id), p.after);

  const verb = check ? "would change" : "updated";
  for (const p of planned) console.log(`${p.changed ? "●" : "○"} ${p.id.padEnd(8)} ${p.changed ? verb : "no change"}  (${JSON.parse(p.after).pages.length} pages)`);
  console.log(`\nPictures: ${report.downloaded.length} ${check ? "to download" : "downloaded"}, ${report.reused} already here, ${report.removed.length} ${check ? "to remove" : "removed"} (no longer in Notion)`);

  const warnings = planned.flatMap((p) => p.warnings);
  if (warnings.length) {
    console.log(`\nWorth a look (${warnings.length}):`);
    for (const w of warnings) console.log(`  - ${w}`);
  }
  console.log(check ? "\nNothing was written." : "\nDone. Next: run `git diff --stat`, look at the site with `npm run dev`, then commit when you are happy.");
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((e) => {
    console.error(`\nSync stopped: ${e instanceof Error ? e.message : e}`);
    process.exit(1);
  });
}
