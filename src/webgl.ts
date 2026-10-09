/**
 * Whether this browser can draw WebGL. Some locked-down company browsers (Island, for one) block it by policy; the
 * office then shows its poster with clickable objects, and the Readers that are 3D show a still instead.
 */
export const HAS_WEBGL: boolean = (() => {
  if (typeof document === "undefined") return true;
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") ?? c.getContext("webgl"));
  } catch {
    return false;
  }
})();

/**
 * Whether this browser will actually run WebAssembly. Some keep the `WebAssembly` object but refuse to compile
 * anything ("Wasm code generation disallowed by embedder" in Island), so this compiles the smallest valid module.
 * Zuko's compressed model needs it; without it the scene loads a copy that needs no decoder.
 */
export const HAS_WASM: boolean = (() => {
  try {
    if (typeof WebAssembly !== "object") return false;
    const empty = new WebAssembly.Module(Uint8Array.of(0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00));
    return new WebAssembly.Instance(empty) instanceof WebAssembly.Instance;
  } catch {
    return false;
  }
})();
