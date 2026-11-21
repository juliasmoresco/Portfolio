import { useEffect, useRef } from "react";
import type * as THREE from "three";
import type { ReaderItem } from "../../content";
import { usePrefersReducedMotion } from "../../hooks/usePrefersReducedMotion";
import styles from "./Reader.module.css";
import { HAS_WEBGL } from "../../webgl";

/** A soft warm pool of light under the base, as under the llama (see LlamaSkin). */
function makeGlowTexture(mod: typeof import("three")): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 256;
  const g = c.getContext("2d")!;
  const grad = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  grad.addColorStop(0, "rgba(240,196,106,0.55)");
  grad.addColorStop(0.6, "rgba(240,196,106,0.22)");
  grad.addColorStop(1, "rgba(240,196,106,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 256);
  return new mod.CanvasTexture(c);
}

/**
 * The shelf's Awwwards trophy (scene/trophy.ts), close up: it turns slowly on a turntable and can be spun by dragging,
 * with the award's words and a button to its page on Awwwards under it. three.js and the trophy are loaded on demand,
 * like LlamaSkin, so they stay out of the first page load. Without WebGL only the words and the button show.
 */
export function TrophySkin({ item }: { item: ReaderItem }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas || !HAS_WEBGL) return;
    let cancelled = false;
    let cleanup: (() => void) | undefined;

    Promise.all([import("three"), import("../../scene/trophy")])
      .then(([THREE, { makeTrophy }]) => {
        if (cancelled) return;

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 20);
        const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
        renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.2;
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        scene.add(new THREE.HemisphereLight(0xffeedd, 0x4a453c, 0.8));
        scene.add(new THREE.AmbientLight(0xffe4c4, 0.4));
        const key = new THREE.DirectionalLight(0xffd7a4, 1.6);
        key.position.set(-2.2, 2.4, 2.0);
        key.castShadow = true;
        key.shadow.mapSize.set(1024, 1024);
        key.shadow.bias = -0.0015;
        key.shadow.radius = 3;
        Object.assign(key.shadow.camera, { left: -0.8, right: 0.8, top: 0.8, bottom: -0.8, near: 1, far: 8 });
        scene.add(key, key.target);
        const fill = new THREE.DirectionalLight(0xcfe0ea, 0.55);
        fill.position.set(2.2, 0.6, 2.6);
        scene.add(fill);
        // a bright rim from behind, so the gold catches a highlight along its edge as it turns
        const rim = new THREE.DirectionalLight(0xffe2b0, 0.9);
        rim.position.set(1.5, 1.6, -2.2);
        scene.add(rim);

        // `model` turns on its own vertical axis, centred over the origin, its base on the floor.
        const model = makeTrophy();
        const box = new THREE.Box3().setFromObject(model);
        const size = new THREE.Vector3();
        box.getSize(size);
        model.scale.setScalar(1 / (Math.max(size.x, size.y, size.z) || 1));
        box.setFromObject(model);
        box.getSize(size);
        const center = new THREE.Vector3();
        box.getCenter(center);
        const floorY = -size.y / 2;
        model.position.set(-center.x, floorY - box.min.y, -center.z);
        const turn = new THREE.Group();
        turn.add(model);
        turn.rotation.y = -0.35;
        scene.add(turn);
        model.traverse((o) => {
          if ((o as THREE.Mesh).isMesh) {
            o.castShadow = true;
            o.receiveShadow = true;
          }
        });
        // Widest reach from the turning axis (the base's corners), so framing holds at every angle.
        const reach = Math.hypot(size.x, size.z) / 2;

        const glowTex = makeGlowTexture(THREE);
        const glow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, depthWrite: false }));
        glow.rotation.x = -Math.PI / 2;
        glow.position.y = floorY + 0.004;
        glow.scale.set(reach * 2.2, reach * 1.8, 1);
        scene.add(glow);

        // Drag to spin; let go and it keeps a little of the throw before easing back to the slow turntable.
        let dragging = false;
        let lastX = 0;
        let spin = 0;
        const onDown = (ev: PointerEvent) => {
          dragging = true;
          lastX = ev.clientX;
          canvas.setPointerCapture(ev.pointerId);
          canvas.style.cursor = "grabbing";
        };
        const onMove = (ev: PointerEvent) => {
          if (!dragging) return;
          const dx = ev.clientX - lastX;
          lastX = ev.clientX;
          turn.rotation.y += dx * 0.012;
          spin = dx * 0.6;
        };
        const onUp = (ev: PointerEvent) => {
          dragging = false;
          if (canvas.hasPointerCapture(ev.pointerId)) canvas.releasePointerCapture(ev.pointerId);
          canvas.style.cursor = "grab";
        };
        const onKey = (ev: KeyboardEvent) => {
          if (ev.key === "ArrowLeft" || ev.key === "ArrowRight") {
            ev.preventDefault();
            turn.rotation.y += ev.key === "ArrowLeft" ? -0.3 : 0.3;
          }
        };
        canvas.style.cursor = "grab";
        canvas.addEventListener("pointerdown", onDown);
        canvas.addEventListener("pointermove", onMove);
        canvas.addEventListener("pointerup", onUp);
        canvas.addEventListener("pointercancel", onUp);
        canvas.addEventListener("keydown", onKey);

        // Fit it, glow included, to whichever of the stage's width or height is tighter, from a little above.
        const EL = 0.18;
        const resize = () => {
          const w = wrap.clientWidth || 1;
          const h = wrap.clientHeight || 1;
          renderer.setSize(w, h, false);
          camera.aspect = w / h;
          const halfV = ((camera.fov / 2) * Math.PI) / 180;
          const halfH = Math.atan(Math.tan(halfV) * camera.aspect);
          const dist = Math.max((size.y / 2 + 0.04) / Math.tan(halfV), (reach * 1.05) / Math.tan(halfH)) * 1.06 + reach * 0.6;
          camera.position.set(0, Math.sin(EL) * dist, Math.cos(EL) * dist);
          camera.lookAt(0, 0, 0);
          camera.updateProjectionMatrix();
        };

        let raf = 0;
        let last = performance.now();
        const loop = (now: number) => {
          raf = requestAnimationFrame(loop);
          const dt = Math.min((now - last) / 1000, 0.05);
          last = now;
          if (!dragging) {
            turn.rotation.y += (reduced ? 0 : 0.25 * dt) + spin * dt;
            spin *= Math.max(0, 1 - dt * 3);
          }
          renderer.render(scene, camera);
        };

        const ro = new ResizeObserver(resize);
        ro.observe(wrap);
        resize();
        raf = requestAnimationFrame(loop);

        cleanup = () => {
          cancelAnimationFrame(raf);
          ro.disconnect();
          canvas.removeEventListener("pointerdown", onDown);
          canvas.removeEventListener("pointermove", onMove);
          canvas.removeEventListener("pointerup", onUp);
          canvas.removeEventListener("pointercancel", onUp);
          canvas.removeEventListener("keydown", onKey);
          glowTex.dispose();
          scene.traverse((o) => {
            const m = o as THREE.Mesh;
            m.geometry?.dispose();
            const mats = Array.isArray(m.material) ? m.material : m.material ? [m.material] : [];
            mats.forEach((mat) => {
              (mat as THREE.MeshStandardMaterial).map?.dispose();
              mat.dispose();
            });
          });
          renderer.dispose();
        };
      })
      .catch((e: unknown) => {
        if (!cancelled) console.error("[TrophySkin]", e);
      });

    return () => {
      cancelled = true;
      cleanup?.();
    };
    // Re-mounts (via the Reader's `key={id}`) rather than reacting to prop changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const lines = item.pages[0]?.lines ?? [];
  return (
    <div className={styles.llama}>
      {HAS_WEBGL && (
        <div ref={wrapRef} className={styles.llamaStage}>
          <canvas ref={canvasRef} className={styles.llamaCanvas} tabIndex={0} aria-label={item.hotspotLabel ?? item.title} />
        </div>
      )}
      <div className={styles.llamaText}>
        <h2 className={styles.llamaHeading}>{item.title}</h2>
        {lines.map((l) => (
          <p key={l} className={styles.llamaHint}>
            {l}
          </p>
        ))}
        {item.links?.map((l) => (
          <a key={l.href} className={styles.chessLink} href={l.href} target="_blank" rel="noreferrer">
            {l.label}
          </a>
        ))}
      </div>
    </div>
  );
}
