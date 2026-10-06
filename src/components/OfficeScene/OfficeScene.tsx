import { useEffect, useImperativeHandle, useLayoutEffect, useRef, useState, type CSSProperties, type Ref } from "react";
import { usePrefersReducedMotion } from "../../hooks/usePrefersReducedMotion";
import type { OfficeScene as OfficeSceneInstance, OfficeSceneOptions } from "../../scene/officeScene";
import type { SceneHotspotId } from "../../scene/hotspots";
import bookshelfUrl from "../../assets/models/bookshelf.glb?url";
import wallShelfUrl from "../../assets/models/wall-shelf-plant.glb?url";
import catUrl from "../../assets/models/cat-talking-button.glb?url";
import posterLandscapeUrl from "../../assets/poster-landscape.webp";
import posterPortraitUrl from "../../assets/poster-portrait.webp";
import styles from "./OfficeScene.module.css";

const ASSETS: OfficeSceneOptions["assets"] = {
  src: bookshelfUrl,
  shelf: wallShelfUrl,
  cat: catUrl,
};

/** Same threshold the scene uses to pick its portrait framing. */
const PORTRAIT_BELOW_ASPECT = 1.15;
/** Keep in step with `.poster` and `.loader`'s transitions in the CSS. */
const FADE_MS = 500;
/** The loader's little shelf: one book stands up for each share of the models downloaded. */
const LOADER_BOOKS: { color: string; h: number }[] = [
  { color: "#2f5d50", h: 30 },
  { color: "#b2364f", h: 36 },
  { color: "#d9a514", h: 26 },
  { color: "#2c4a7a", h: 34 },
  { color: "#e07a5f", h: 28 },
  { color: "#6b4fa0", h: 32 },
];
/** The download takes the bar this far; building the room from the models takes it the rest of the way. */
const DOWNLOAD_SHARE = 0.9;

/** Imperative surface the mobile shell needs; everything else flows through props and `shelf:*` events. */
export interface OfficeSceneHandle {
  resetView(): void;
  clearHighlight(): void;
  openArmed(): void;
  /** Light a hotspot from the keyboard; `null` clears it. */
  highlight(id: SceneHotspotId | null): void;
}

type SceneProps = Partial<Omit<OfficeSceneOptions, "assets" | "reducedMotion">>;

export interface OfficeSceneProps extends SceneProps {
  className?: string;
  ref?: Ref<OfficeSceneHandle>;
}

/**
 * Owns the lifecycle of the three.js scene: the module (and three) is loaded on
 * demand, started on mount, and fully disposed on unmount. Props map 1:1 to the
 * prototype's attributes. Quality / tap / touchControls are read once at start.
 *
 * Until the model and props are built it shows a loader: a little shelf whose books stand up as the ~8 MB of GLBs
 * download, with a bar under it. It fades out once `shelf:ready` would fire. If the scene fails to start (no WebGL),
 * a rendered frame of the room (the poster) shows instead.
 */
export function OfficeScene({ className, ref, ...props }: OfficeSceneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<OfficeSceneInstance | null>(null);
  const reducedMotion = usePrefersReducedMotion();
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [loaderMounted, setLoaderMounted] = useState(true);
  const [progress, setProgress] = useState(0);
  // Which poster to fall back on (no WebGL) is decided once, from the container's shape, before first paint.
  const [portrait, setPortrait] = useState<boolean | null>(null);
  useLayoutEffect(() => {
    const el = containerRef.current;
    if (el) setPortrait(el.clientWidth / Math.max(el.clientHeight, 1) < PORTRAIT_BELOW_ASPECT);
  }, []);

  const optionsRef = useRef<Omit<OfficeSceneOptions, "assets"> | null>(null);
  const { daylight, walltone, hints, view, parallax, autopan, quality, tap, touchControls, labels, spines, art, notes } = props;
  // Keep the latest props reachable from the async start below (assigned in an effect, not during render).
  useEffect(() => {
    optionsRef.current = {
      daylight: daylight ?? "afternoon",
      walltone: walltone ?? "graphite",
      hints: hints ?? false,
      view: view ?? "wide",
      parallax: parallax ?? "on",
      autopan: autopan ?? false,
      quality: quality ?? "default",
      tap: tap ?? "direct",
      touchControls: touchControls ?? false,
      reducedMotion,
      labels: labels ?? {},
      spines: spines ?? {},
      art: art ?? {},
      notes: notes ?? [],
    };
  });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let cancelled = false;
    let instance: OfficeSceneInstance | null = null;

    import("../../scene/officeScene")
      .then(({ OfficeScene: Scene }) => {
        if (cancelled || !optionsRef.current) return;
        instance = new Scene(el, { ...optionsRef.current, assets: ASSETS });
        sceneRef.current = instance;
        return instance.start((f) => setProgress((p) => Math.max(p, f * DOWNLOAD_SHARE))).then(() => {
          if (!cancelled) setStatus("ready");
        });
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        console.error("[office-scene]", e);
        setStatus("error");
      });

    return () => {
      cancelled = true;
      instance?.dispose();
      sceneRef.current = null;
    };
  }, []);

  useEffect(() => {
    sceneRef.current?.update({ daylight, walltone, hints, view, parallax, autopan, reducedMotion, labels });
  }, [daylight, walltone, hints, view, parallax, autopan, reducedMotion, labels]);

  // Once the scene is up the loader fades out; drop it from the DOM after that.
  useEffect(() => {
    if (status !== "ready") return;
    const t = window.setTimeout(() => setLoaderMounted(false), FADE_MS + 100);
    return () => window.clearTimeout(t);
  }, [status]);

  useImperativeHandle(
    ref,
    () => ({
      resetView: () => sceneRef.current?.resetView(),
      clearHighlight: () => sceneRef.current?.clearHighlight(),
      openArmed: () => sceneRef.current?.openArmed(),
      highlight: (id) => sceneRef.current?.highlight(id),
    }),
    [],
  );

  return (
    <div ref={containerRef} className={[styles.root, className].filter(Boolean).join(" ")}>
      {loaderMounted && status !== "error" && (
        <div className={[styles.loader, status === "ready" && styles.loaderGone].filter(Boolean).join(" ")} role="status" aria-label="Setting up the office">
          <div className={styles.loaderShelf} aria-hidden="true">
            {LOADER_BOOKS.map((b, i) => (
              <span
                key={b.color}
                className={[styles.loaderBook, (status === "ready" ? 1 : progress) >= (i + 1) / (LOADER_BOOKS.length + 1) && styles.loaderBookUp].filter(Boolean).join(" ")}
                style={{ "--c": b.color, "--h": `${b.h}px`, "--i": i } as CSSProperties}
              />
            ))}
          </div>
          <span className={styles.loaderLabel} aria-hidden="true">
            Setting up the office
          </span>
          <span className={styles.loaderBar} aria-hidden="true">
            <span style={{ transform: `scaleX(${status === "ready" ? 1 : progress})` }} />
          </span>
        </div>
      )}
      {status === "error" && portrait !== null && (
        <img
          className={styles.poster}
          src={portrait ? posterPortraitUrl : posterLandscapeUrl}
          alt=""
          aria-hidden="true"
          decoding="async"
          draggable={false}
        />
      )}
    </div>
  );
}
