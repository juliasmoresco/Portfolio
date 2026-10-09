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
