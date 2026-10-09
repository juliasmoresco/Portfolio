import { HAS_WASM } from "./webgl";

/**
 * `?debug` in the address bar: a small panel listing what this browser supports and every error the page raises.
 * For finding out why the site misbehaves in a browser we can't open ourselves (locked-down company browsers).
 */
export function mountDebugPanel(): void {
  if (typeof window === "undefined" || !new URLSearchParams(window.location.search).has("debug")) return;

  const lines: string[] = [];
  const panel = document.createElement("pre");
  panel.setAttribute("style", "position:fixed;left:8px;bottom:8px;z-index:99999;max-width:min(560px,calc(100vw - 16px));max-height:60vh;overflow:auto;margin:0;padding:10px 12px;border-radius:8px;background:rgba(0,0,0,.85);color:#9f9;font:11px/1.45 ui-monospace,Menlo,monospace;white-space:pre-wrap;user-select:text");
  const render = () => (panel.textContent = lines.join("\n"));
  const add = (s: string) => {
    lines.push(s);
    render();
  };

  const gl = (kind: "webgl" | "webgl2") => {
    try {
      const c = document.createElement("canvas").getContext(kind) as WebGLRenderingContext | null;
      if (!c) return "no";
      const dbg = c.getExtension("WEBGL_debug_renderer_info");
      const gpu = dbg ? c.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : c.getParameter(c.RENDERER);
      return `yes · ${gpu} · max texture ${c.getParameter(c.MAX_TEXTURE_SIZE)} · float buffers ${c.getExtension("EXT_color_buffer_float") ? "yes" : "no"}`;
    } catch (e) {
      return `error ${String(e)}`;
    }
  };

  add(`browser  ${navigator.userAgent}`);
  add(`screen   ${innerWidth}×${innerHeight} @${devicePixelRatio}x · touch ${navigator.maxTouchPoints}`);
  add(`webgl2   ${gl("webgl2")}`);
  add(`webgl1   ${gl("webgl")}`);
  add(`wasm     present ${typeof WebAssembly === "object" ? "yes" : "no"} · runs ${HAS_WASM ? "yes" : "no"}`);
  add(`workers  ${typeof Worker === "function" ? "yes" : "no"} · audio ${typeof AudioContext === "function" ? "yes" : "no"} · storage ${(() => { try { localStorage.setItem("__t", "1"); localStorage.removeItem("__t"); return "yes"; } catch { return "no"; } })()}`);
  add(`motion   reduced ${matchMedia("(prefers-reduced-motion: reduce)").matches ? "yes" : "no"} · pointer ${matchMedia("(pointer: coarse)").matches ? "coarse" : "fine"}`);

  window.addEventListener("error", (e) => add(`ERROR    ${e.message} (${(e.filename || "").split("/").pop()}:${e.lineno})`));
  window.addEventListener("unhandledrejection", (e) => add(`REJECT   ${String((e.reason as Error)?.message ?? e.reason)}`));
  for (const level of ["error", "warn"] as const) {
    const original = console[level].bind(console);
    console[level] = (...args: unknown[]) => {
      add(`${level.toUpperCase().padEnd(8)} ${args.map((a) => (a instanceof Error ? a.message : typeof a === "string" ? a : JSON.stringify(a))).join(" ").slice(0, 300)}`);
      original(...args);
    };
  }
  window.addEventListener("shelf:ready", () => add("scene    ready"));
  // Every second for the first 15, whether the 3D scene is drawing frames.
  let frames = 0;
  const count = () => {
    frames++;
    requestAnimationFrame(count);
  };
  requestAnimationFrame(count);
  let secs = 0;
  const tick = window.setInterval(() => {
    secs++;
    const canvas = document.querySelector("canvas");
    add(`t+${String(secs).padStart(2)}s    frames ${frames} · canvas ${canvas ? `${canvas.width}×${canvas.height}` : "none"} · poster ${document.querySelector("img[src*=poster]") ? "shown" : "no"}`);
    frames = 0;
    if (secs >= 15) window.clearInterval(tick);
  }, 1000);

  const attach = () => document.body.append(panel);
  if (document.body) attach();
  else window.addEventListener("DOMContentLoaded", attach);
}
