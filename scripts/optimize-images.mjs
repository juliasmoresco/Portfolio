// Turns the raw images in content-source/notion-images into the web versions the Reader loads.
//   npm run images            convert everything new or changed
// Raw files are named <case>-<NN>.<ext> (or <case>-cover.<ext>); output is src/assets/cases/<same>.webp,
// at most 1024px wide, so a tall screenshot stays sharp without shipping a multi-megabyte original.
import { readdirSync, mkdirSync, statSync, existsSync } from "node:fs";
import { join, parse } from "node:path";
import sharp from "sharp";

const SRC = "content-source/notion-images";
const OUT = "src/assets/cases";
const MAX_WIDTH = 1024;
mkdirSync(OUT, { recursive: true });

let done = 0;
let skipped = 0;
for (const file of readdirSync(SRC)) {
  const { name, ext } = parse(file);
  if (!/^\.(png|jpe?g|webp|gif)$/i.test(ext)) continue;
  const from = join(SRC, file);
  const to = join(OUT, name + ".webp");
  if (existsSync(to) && statSync(to).mtimeMs >= statSync(from).mtimeMs) {
    skipped++;
    continue;
  }
  const info = await sharp(from).resize({ width: MAX_WIDTH, withoutEnlargement: true }).webp({ quality: 82 }).toFile(to);
  console.log(`${name.padEnd(14)} ${String(Math.round(statSync(from).size / 1024)).padStart(5)} KB -> ${String(Math.round(info.size / 1024)).padStart(4)} KB  ${info.width}x${info.height}`);
  done++;
}
console.log(`${done} converted, ${skipped} already up to date`);
