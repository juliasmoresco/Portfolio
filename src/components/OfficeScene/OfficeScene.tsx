import { useEffect, useImperativeHandle, useLayoutEffect, useRef, useState, type Ref } from "react";
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
/** Keep in step with `.poster`'s transition in the CSS. */
const POSTER_FADE_MS = 500;

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
 * Until the model and props are built it shows a poster: a real frame of the scene rendered at the
 * same framing, so the room is on screen from first paint while ~8 MB of GLBs load. It cross-fades
 * out once `shelf:ready` would fire. If the scene fails to start (no WebGL), the poster stays.
 */
export function OfficeScene({ className, ref, ...props }: OfficeSceneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<OfficeSceneInstance | null>(null);
  const reducedMotion = usePrefersReducedMotion();
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [posterMounted, setPosterMounted] = useState(true);
  // Which poster to show is decided once, from the container's shape, before first paint.
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
        return instance.start().then(() => {
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

  // Once the scene is up the poster fades out; drop it from the DOM after that so its decoded bitmap is freed.
  useEffect(() => {
    if (status !== "ready") return;
    const t = window.setTimeout(() => setPosterMounted(false), POSTER_FADE_MS + 100);
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
      {posterMounted && portrait !== null && (
        <img
          className={[styles.poster, status === "ready" && styles.posterGone].filter(Boolean).join(" ")}
          src={portrait ? posterPortraitUrl : posterLandscapeUrl}
          alt=""
          aria-hidden="true"
          decoding="async"
          fetchPriority="high"
          draggable={false}
        />
      )}
    </div>
  );
}
