import { useEffect, useRef, useState } from "react";
import bookshelfUrl from "../../assets/models/bookshelf.glb?url";
import wallShelfUrl from "../../assets/models/wall-shelf-plant.glb?url";
import type { PageModel } from "../../content";
import { usePrefersReducedMotion } from "../../hooks/usePrefersReducedMotion";
import styles from "./Reader.module.css";
import { useUi } from "./ui";
import bookshelfStill from "../../assets/stills/bookshelf.webp";
import { HAS_WEBGL } from "../../webgl";

const MODELS: Record<PageModel["model"], string> = { bookshelf: bookshelfUrl, "wall-shelf": wallShelfUrl };
/** Shown instead when the browser has no WebGL. */
const STILLS: Partial<Record<PageModel["model"], string>> = { bookshelf: bookshelfStill };

/**
 * One of the office's 3D models on its own, on a turntable: it turns slowly by itself and can be dragged round. three.js and
 * the model load only when the page is shown, like the globe and the llama.
 */
export function Model3D({ model }: { model: PageModel }) {
  const ui = useUi();
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduced = usePrefersReducedMotion();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas || !HAS_WEBGL) return;
    let cancelled = false;
    let cleanup: (() => void) | undefined;

    Promise.all([import("three"), import("three/addons/loaders/GLTFLoader.js"), import("three/addons/libs/meshopt_decoder.module.js")]).then(([THREE, { GLTFLoader }, { MeshoptDecoder }]) => {
      if (cancelled) return;
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 50);
      const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
      renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.1;
      scene.add(new THREE.HemisphereLight(0xfff3e0, 0x4a453c, 1.1));
      const key = new THREE.DirectionalLight(0xffe2b8, 1.6);
      key.position.set(-3, 4, 4);
      scene.add(key);
      const fill = new THREE.DirectionalLight(0xcfe0ea, 0.5);
      fill.position.set(3, 1, 3);
      scene.add(fill);

      const turn = new THREE.Group();
      scene.add(turn);
      let raf = 0;
      let angle = -0.45;
      let dragging = false;
      let lastX = 0;
      let idleFrom = performance.now();
      let placeRef: (() => void) | null = null;

      const fit = () => {
        const w = wrap.clientWidth || 1;
        const h = wrap.clientHeight || 1;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        placeRef?.();
      };

      new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).load(MODELS[model.model], (gltf) => {
        if (cancelled) return;
        const obj = gltf.scene;
        const box = new THREE.Box3().setFromObject(obj);
        const size = new THREE.Vector3();
        const center = new THREE.Vector3();
        box.getSize(size);
        box.getCenter(center);
        const s = 2 / Math.max(size.x, size.y, size.z);
        obj.scale.setScalar(s);
        obj.position.set(-center.x * s, -center.y * s, -center.z * s);
        turn.add(obj);
        // Close enough to fill the stage: the height fits, and so does the widest turn of the footprint.
        const half = Math.tan((camera.fov * Math.PI) / 360);
        const reach = (Math.hypot(size.x, size.z) * s) / 2;
        const fitDist = () => Math.max((size.y * s) / 2, reach / camera.aspect) / half;
        const place = () => {
          camera.position.set(0, size.y * s * 0.08, fitDist() * 1.08 + reach);
          camera.lookAt(0, 0, 0);
        };
        placeRef = place;
        place();
        setReady(true);
      });

      const tick = (now: number) => {
        if (!dragging && !reduced && now - idleFrom > 1200) angle += 0.0035;
        turn.rotation.y = angle;
        renderer.render(scene, camera);
        raf = requestAnimationFrame(tick);
      };

      const down = (e: PointerEvent) => {
        dragging = true;
        lastX = e.clientX;
        canvas.setPointerCapture(e.pointerId);
      };
      const move = (e: PointerEvent) => {
        if (!dragging) return;
        angle += (e.clientX - lastX) * 0.012;
        lastX = e.clientX;
      };
      const up = () => {
        dragging = false;
        idleFrom = performance.now();
      };
      canvas.addEventListener("pointerdown", down);
      canvas.addEventListener("pointermove", move);
      canvas.addEventListener("pointerup", up);
      canvas.addEventListener("pointercancel", up);
      const ro = new ResizeObserver(fit);
      ro.observe(wrap);
      fit();
      raf = requestAnimationFrame(tick);

      cleanup = () => {
        cancelAnimationFrame(raf);
        ro.disconnect();
        canvas.removeEventListener("pointerdown", down);
        canvas.removeEventListener("pointermove", move);
        canvas.removeEventListener("pointerup", up);
        canvas.removeEventListener("pointercancel", up);
        renderer.dispose();
      };
    });
    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [model.model, reduced]);

  return (
    <div className={styles.model3d}>
      {model.kicker && <span className={styles.chartKicker}>{model.kicker}</span>}
      {model.title && <h2 className={styles.chartTitle}>{model.title}</h2>}
      <div ref={wrapRef} className={styles.model3dStage} data-ready={ready || !HAS_WEBGL || undefined}>
        {HAS_WEBGL || !STILLS[model.model] ? (
          <canvas ref={canvasRef} aria-label={model.note ?? "A 3D model you can turn"} />
        ) : (
          <img className={styles.still} src={STILLS[model.model]} alt={model.title ?? ""} draggable={false} />
        )}
      </div>
      {HAS_WEBGL && <p className={styles.model3dHint}>{model.note ?? ui.dragToTurn}</p>}
    </div>
  );
}
