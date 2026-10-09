// Regenerates src/scene/posterHotspots.json: where each object sits on the two loading posters, so the posters can be
// clicked when a browser has no WebGL (some locked-down company browsers block it). Run with the dev server up
// (npm run dev) after re-rendering the posters: node scripts/poster-hotspots.mjs [http://localhost:5173]
import { spawn } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const base = process.argv[2] ?? "http://localhost:5173";
const chromePath = process.env.CHROME_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const port = 9222 + Math.floor(Math.random() * 500);
const chrome = spawn(chromePath, ["--headless=new", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", `--remote-debugging-port=${port}`, `--user-data-dir=${mkdtempSync(join(tmpdir(), "hotspots-"))}`, "about:blank"], { stdio: "ignore" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
for (let i = 0; i < 50; i++) { try { await fetch(`http://127.0.0.1:${port}/json/version`); break; } catch { await sleep(200); } }

async function rects(width, height, mobile) {
  const t = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: "PUT" })).json();
  const ws = new WebSocket(t.webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener("open", r, { once: true }));
  let n = 0; const pend = new Map();
  ws.addEventListener("message", (e) => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m.result); pend.delete(m.id); } });
  const send = (method, params = {}) => new Promise((r) => { const i = ++n; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  await send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile });
  await send("Page.navigate", { url: base });
  for (let i = 0; i < 120; i++) {
    const r = await send("Runtime.evaluate", { expression: "typeof window.__hotspotRects === 'function'", returnByValue: true });
    if (r.result.value) break;
    await sleep(500);
  }
  await sleep(1500);
  const r = await send("Runtime.evaluate", { expression: "window.__hotspotRects()", returnByValue: true });
  ws.close();
  return r.result.value;
}

const out = { landscape: await rects(1600, 960, false), portrait: await rects(390, 844, true) };
chrome.kill();
writeFileSync(new URL("../src/scene/posterHotspots.json", import.meta.url), JSON.stringify(out, null, 2) + "\n");
console.log("wrote", Object.keys(out.landscape).length, "landscape and", Object.keys(out.portrait).length, "portrait hotspots");
process.exit(0);
