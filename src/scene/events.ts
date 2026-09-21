import type { SceneHotspotId } from "./hotspots";

/**
 * The scene's public contract. It is framework-agnostic and talks to the page
 * through `window` CustomEvents, so nothing here depends on React.
 */
export const SHELF_READY = "shelf:ready";
export const SHELF_HOVER = "shelf:hover";
export const SHELF_SELECT = "shelf:select";

export interface ShelfHoverDetail {
  /** `null` when nothing is hovered / armed. */
  id: SceneHotspotId | null;
  label: string;
  /** Percentages (0–100) of the canvas box. 50/50 when there is no pointer. */
  x: number;
  y: number;
}

export interface ShelfSelectDetail {
  id: SceneHotspotId;
}

declare global {
  interface WindowEventMap {
    "shelf:ready": CustomEvent<null>;
    "shelf:hover": CustomEvent<ShelfHoverDetail>;
    "shelf:select": CustomEvent<ShelfSelectDetail>;
  }
}

export function emitReady(): void {
  window.dispatchEvent(new CustomEvent(SHELF_READY, { detail: null }));
}

export function emitHover(detail: ShelfHoverDetail): void {
  window.dispatchEvent(new CustomEvent(SHELF_HOVER, { detail }));
}

export function emitSelect(detail: ShelfSelectDetail): void {
  window.dispatchEvent(new CustomEvent(SHELF_SELECT, { detail }));
}

/** Subscribe helpers return an unsubscribe function, ready for `useEffect`. */
export function onShelfReady(fn: () => void): () => void {
  window.addEventListener(SHELF_READY, fn);
  return () => window.removeEventListener(SHELF_READY, fn);
}

export function onShelfHover(fn: (detail: ShelfHoverDetail) => void): () => void {
  const h = (e: CustomEvent<ShelfHoverDetail>) => fn(e.detail);
  window.addEventListener(SHELF_HOVER, h);
  return () => window.removeEventListener(SHELF_HOVER, h);
}

export function onShelfSelect(fn: (detail: ShelfSelectDetail) => void): () => void {
  const h = (e: CustomEvent<ShelfSelectDetail>) => fn(e.detail);
  window.addEventListener(SHELF_SELECT, h);
  return () => window.removeEventListener(SHELF_SELECT, h);
}
