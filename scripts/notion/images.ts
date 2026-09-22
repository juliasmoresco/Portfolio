import { existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";
import type { ImageJob } from "./entries.ts";

const MAX_WIDTH = 1024;

export interface ImageReport {
  downloaded: string[];
  reused: number;
  removed: string[];
}

/**
 * Makes src/assets/cases match what the entries use. A picture's file name carries a fingerprint of where Notion
 * stores it, so an unchanged picture is never downloaded again and a replaced one gets a new name.
 * `entryIds` are the entries this run owns: only their files are ever cleaned up, never anything else in the folder.
 */
export async function syncImages(jobs: ImageJob[], entryIds: string[], outDir: string, opts: { write: boolean }): Promise<ImageReport> {
  const report: ImageReport = { downloaded: [], reused: 0, removed: [] };
  if (opts.write) mkdirSync(outDir, { recursive: true });

  for (const job of jobs) {
    const target = join(outDir, `${job.name}.webp`);
    if (existsSync(target)) {
      report.reused++;
      continue;
    }
    report.downloaded.push(job.name);
    if (!opts.write) continue;
    // Notion's links to uploaded files expire after an hour, which is why this runs straight after reading the page.
    const res = await fetch(job.url);
    if (!res.ok) throw new Error(`Could not download the picture for ${job.name} (${res.status}).`);
    const bytes = Buffer.from(await res.arrayBuffer());
    await sharp(bytes).rotate().resize({ width: MAX_WIDTH, withoutEnlargement: true }).webp({ quality: 82 }).toFile(target);
  }

  const keep = new Set(jobs.map((j) => `${j.name}.webp`));
  if (existsSync(outDir)) {
    for (const file of readdirSync(outDir)) {
      const owned = entryIds.some((id) => file.startsWith(`${id}-`));
      if (owned && file.endsWith(".webp") && !keep.has(file)) {
        report.removed.push(file);
        if (opts.write) rmSync(join(outDir, file));
      }
    }
  }
  return report;
}
