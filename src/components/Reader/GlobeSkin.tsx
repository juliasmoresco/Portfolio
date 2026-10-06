import { useEffect, useRef, useState } from "react";
import type * as THREE from "three";
import type { ReaderItem } from "../../content";
import { usePrefersReducedMotion } from "../../hooks/usePrefersReducedMotion";
import styles from "./Reader.module.css";

const PIN_COLOR = 0xe4572e;
/** How far the globe may tip toward or away from the viewer, so the poles never flip over. */
const PITCH_LIMIT = 1.1;
/** Idle turn speed, rad/s, and how long after the last touch it waits before resuming. */
const AUTO_SPIN = 0.15;
const IDLE_BEFORE_SPIN_S = 2.5;
/** Pointer travel (px) before a press counts as a drag rather than a click. */
const DRAG_THRESHOLD = 5;

interface GlobeApi {
  focus: (country: string) => void;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
/** Wraps an angle difference into [-π, π], so the globe always turns the short way round. */
const wrapAngle = (a: number) => a - 2 * Math.PI * Math.round(a / (2 * Math.PI));

/**
 * The globe on its own, filling the panel: drag it to turn it, hover or tap a pin to name the
 * country, or pick a country from the list below to spin it into view.
 *
 * three.js and the globe builder are loaded on demand here (not imported at module scope), the same
 * way OfficeScene.tsx defers them — this skin sits inside the Reader, which the app loads eagerly,
 * so a static `import * as THREE` here would pull the whole 3D stack into the very first page load.
 */
export function GlobeSkin({ item }: { item: ReaderItem }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);
  const apiRef = useRef<GlobeApi | null>(null);
  const reduced = usePrefersReducedMotion();
  const [selected, setSelected] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);

  const visited = item.visited ?? [];
  const goal = item.goal;
  const label = hovered ?? selected;

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    let cancelled = false;
    let cleanup: (() => void) | undefined;

    Promise.all([import("three"), import("../../scene/globe"), import("../../scene/countries")])
      .then(([THREE, { GLOBE_SPHERE_RADIUS: R, makeGlobeSphere, pointOnGlobe }, { COUNTRY_LONLAT }]) => {
        if (cancelled) return;

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 20);

        const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
        renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.15;

        scene.add(new THREE.HemisphereLight(0xffeedd, 0x3a362f, 1.0));
        const key = new THREE.DirectionalLight(0xffd7a4, 1.8);
        key.position.set(-2, 1.6, 2.4);
        scene.add(key);
        const rim = new THREE.DirectionalLight(0xffc48c, 0.6);
        rim.position.set(2, 1, -2);
        scene.add(rim);

        // tilt (pitch, toward/away from the viewer) holds spin (yaw, around the poles) holds the map.
        const tilt = new THREE.Group();
        const spin = new THREE.Group();
        tilt.add(spin);
        scene.add(tilt);
        const sphere = makeGlobeSphere(2);
        spin.add(sphere);

        // A pin per country: a thin needle along the surface normal with a round head. The larger
        // invisible sphere around each head is the click target, since the head itself is small.
        const NEEDLE = 0.06;
        const HEAD_R = 0.018;
        const needleGeo = new THREE.CylinderGeometry(0.0035, 0.0035, NEEDLE, 8);
        needleGeo.translate(0, NEEDLE / 2, 0);
        const headGeo = new THREE.SphereGeometry(HEAD_R, 16, 12);
        const hitGeo = new THREE.SphereGeometry(0.05, 10, 8);
        const needleMat = new THREE.MeshStandardMaterial({ color: 0xd9d2c4, metalness: 0.8, roughness: 0.3 });
        const hitMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });
        const up = new THREE.Vector3(0, 1, 0);
        const pins: { name: string; head: THREE.Mesh; normal: THREE.Vector3 }[] = [];
        const hits: THREE.Object3D[] = [];
        const missing: string[] = [];
        for (const name of visited) {
          const lonlat = COUNTRY_LONLAT[name];
          if (!lonlat) {
            missing.push(name);
            continue;
          }
          const normal = pointOnGlobe(lonlat[0], lonlat[1], 1).normalize();
          const pin = new THREE.Group();
          pin.position.copy(normal).multiplyScalar(R);
          pin.quaternion.setFromUnitVectors(up, normal);
          const head = new THREE.Mesh(headGeo, new THREE.MeshStandardMaterial({ color: PIN_COLOR, emissive: PIN_COLOR, emissiveIntensity: 0.2, roughness: 0.35 }));
          head.position.y = NEEDLE;
          const hit = new THREE.Mesh(hitGeo, hitMat);
          hit.position.y = NEEDLE * 0.7;
          hit.userData.country = name;
          pin.add(new THREE.Mesh(needleGeo, needleMat), head, hit);
          spin.add(pin);
          pins.push({ name, head, normal });
          hits.push(hit);
        }
        if (missing.length) console.warn(`[GlobeSkin] no coordinates for: ${missing.join(", ")} — add them to scene/countries.ts`);

        /** The yaw/pitch that turn a point (given as a unit normal on the sphere) to face the camera. */
        const facing = (n: THREE.Vector3) => ({
          yaw: Math.atan2(-n.x, n.z),
          pitch: clamp(Math.atan2(n.y, Math.hypot(n.x, n.z)), -PITCH_LIMIT, PITCH_LIMIT),
        });

        // Open facing the middle of everywhere she has been.
        const centroid = pins.reduce((acc, p) => acc.add(p.normal), new THREE.Vector3());
        let { yaw, pitch } = centroid.lengthSq() > 1e-6 ? facing(centroid.normalize()) : { yaw: 0, pitch: 0.35 };
        let vYaw = 0;
        let target: { yaw: number; pitch: number } | null = null;
        let lastInteraction = -Infinity;

        let selectedName: string | null = null;
        let hoveredName: string | null = null;
        const paint = () => {
          for (const p of pins) {
            const on = p.name === selectedName || p.name === hoveredName;
            p.head.scale.setScalar(on ? 1.45 : 1);
            (p.head.material as THREE.MeshStandardMaterial).emissiveIntensity = on ? 0.7 : 0.2;
          }
        };
        const hover = (name: string | null) => {
          if (name === hoveredName) return;
          hoveredName = name;
          paint();
          setHovered(name);
        };
        const select = (name: string | null) => {
          selectedName = name;
          paint();
          setSelected(name);
          const p = name ? pins.find((q) => q.name === name) : undefined;
          if (p) {
            const f = facing(p.normal);
            target = { yaw: yaw + wrapAngle(f.yaw - yaw), pitch: f.pitch };
            vYaw = 0;
          }
        };
        apiRef.current = {
          focus: (name) => {
            lastInteraction = performance.now() / 1000;
            select(name === selectedName ? null : name);
          },
        };

        const raycaster = new THREE.Raycaster();
        const pointer = new THREE.Vector2();
        const pick = (ev: PointerEvent): string | null => {
          const r = canvas.getBoundingClientRect();
          pointer.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
          raycaster.setFromCamera(pointer, camera);
          const hit = raycaster.intersectObjects(hits, false)[0];
          if (!hit) return null;
          // A pin on the far side is behind the globe, not under the pointer.
          const ground = raycaster.intersectObject(sphere, false)[0];
          if (ground && ground.distance < hit.distance - 0.01) return null;
          return hit.object.userData.country as string;
        };

        let press: { id: number; x: number; y: number; lastX: number; lastY: number; lastT: number; dragging: boolean } | null = null;
        const onDown = (ev: PointerEvent) => {
          if (ev.button !== 0) return;
          press = { id: ev.pointerId, x: ev.clientX, y: ev.clientY, lastX: ev.clientX, lastY: ev.clientY, lastT: performance.now(), dragging: false };
          canvas.setPointerCapture(ev.pointerId);
          target = null;
          vYaw = 0;
        };
        const onMove = (ev: PointerEvent) => {
          if (press && ev.pointerId === press.id) {
            if (!press.dragging && Math.hypot(ev.clientX - press.x, ev.clientY - press.y) > DRAG_THRESHOLD) {
              press.dragging = true;
              canvas.style.cursor = "grabbing";
              hover(null);
            }
            if (press.dragging) {
              const k = Math.PI / Math.max(canvas.clientWidth, 1);
              const dx = (ev.clientX - press.lastX) * k;
              const now = performance.now();
              yaw += dx;
              pitch = clamp(pitch + (ev.clientY - press.lastY) * k, -PITCH_LIMIT, PITCH_LIMIT);
              vYaw = dx / Math.max((now - press.lastT) / 1000, 1 / 120);
              press.lastT = now;
              lastInteraction = now / 1000;
            }
            press.lastX = ev.clientX;
            press.lastY = ev.clientY;
            return;
          }
          if (ev.pointerType === "mouse") {
            const name = pick(ev);
            hover(name);
            canvas.style.cursor = name ? "pointer" : "grab";
          }
        };
        const onUp = (ev: PointerEvent) => {
          if (!press || ev.pointerId !== press.id) return;
          const { dragging, lastT } = press;
          press = null;
          canvas.style.cursor = "grab";
          lastInteraction = performance.now() / 1000;
          if (dragging) {
            // Holding still before letting go means "stop here", not "fling".
            if (reduced || performance.now() - lastT > 80) vYaw = 0;
            return;
          }
          select(pick(ev));
        };
        const onCancel = () => {
          press = null;
          canvas.style.cursor = "grab";
        };
        const onLeave = () => hover(null);
        canvas.style.cursor = "grab";
        canvas.addEventListener("pointerdown", onDown);
        canvas.addEventListener("pointermove", onMove);
        canvas.addEventListener("pointerup", onUp);
        canvas.addEventListener("pointercancel", onCancel);
        canvas.addEventListener("pointerleave", onLeave);

        let w = 1;
        let h = 1;
        const resize = () => {
          w = wrap.clientWidth || 1;
          h = wrap.clientHeight || 1;
          renderer.setSize(w, h, false);
          camera.aspect = w / h;
          // Fit the globe, pins included, to whichever of the width or height is tighter.
          const halfV = ((camera.fov / 2) * Math.PI) / 180;
          const halfH = Math.atan(Math.tan(halfV) * camera.aspect);
          camera.position.set(0, 0, ((R + NEEDLE + HEAD_R) / Math.sin(Math.min(halfV, halfH))) * 1.04);
          camera.lookAt(0, 0, 0);
          camera.updateProjectionMatrix();
        };

        // The name tag floats over its pin, and fades out while the pin is round the back.
        const headPos = new THREE.Vector3();
        const toCamera = new THREE.Vector3();
        const placeLabel = () => {
          const el = labelRef.current;
          const name = hoveredName ?? selectedName;
          const p = name ? pins.find((q) => q.name === name) : undefined;
          if (!el || !p) return;
          p.head.getWorldPosition(headPos);
          toCamera.copy(camera.position).sub(headPos).normalize();
          const front = headPos.clone().normalize().dot(toCamera) > 0.15;
          headPos.project(camera);
          el.style.transform = `translate(${(headPos.x * 0.5 + 0.5) * w}px, ${(-headPos.y * 0.5 + 0.5) * h}px) translate(-50%, calc(-100% - 12px))`;
          el.style.opacity = front ? "1" : "0";
        };

        let raf = 0;
        let last = performance.now();
        const loop = (now: number) => {
          raf = requestAnimationFrame(loop);
          const dt = Math.min((now - last) / 1000, 0.05);
          last = now;
          if (!press) {
            if (target) {
              const a = reduced ? 1 : 1 - Math.exp(-dt * 5);
              yaw += (target.yaw - yaw) * a;
              pitch += (target.pitch - pitch) * a;
              if (Math.abs(target.yaw - yaw) < 1e-3 && Math.abs(target.pitch - pitch) < 1e-3) target = null;
            } else if (Math.abs(vYaw) > 1e-3) {
              yaw += vYaw * dt;
              vYaw *= Math.exp(-dt * 3);
            } else if (!reduced && !selectedName && now / 1000 - lastInteraction > IDLE_BEFORE_SPIN_S) {
              yaw += AUTO_SPIN * dt;
            }
          }
          spin.rotation.y = yaw;
          tilt.rotation.x = pitch;
          renderer.render(scene, camera);
          placeLabel();
        };

        const ro = new ResizeObserver(resize);
        ro.observe(wrap);
        resize();
        raf = requestAnimationFrame(loop);

        cleanup = () => {
          cancelAnimationFrame(raf);
          ro.disconnect();
          apiRef.current = null;
          canvas.removeEventListener("pointerdown", onDown);
          canvas.removeEventListener("pointermove", onMove);
          canvas.removeEventListener("pointerup", onUp);
          canvas.removeEventListener("pointercancel", onCancel);
          canvas.removeEventListener("pointerleave", onLeave);
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
        if (!cancelled) console.error("[GlobeSkin]", e);
      });

    return () => {
      cancelled = true;
      cleanup?.();
    };
    // Re-mounts (via the Reader's `key={id}`) rather than reacting to prop changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const count = visited.length;
  return (
    <div className={styles.globe}>
      <div ref={wrapRef} className={styles.globeStage}>
        <canvas ref={canvasRef} className={styles.globeCanvas} role="img" aria-label={`A globe with a pin in each of the ${count} countries I've visited`} />
        {label && (
          <span ref={labelRef} className={styles.globeLabel} aria-hidden="true">
            {label}
          </span>
        )}
      </div>
      <div className={styles.globeText}>
        <h2 className={styles.globeHeading}>{item.title}</h2>
        {typeof goal === "number" ? (
          <>
            <div className={styles.progressBar} role="progressbar" aria-label="Countries visited toward my goal" aria-valuemin={0} aria-valuemax={goal} aria-valuenow={count}>
              <span style={{ width: `${Math.min(100, (count / goal) * 100)}%` }} />
            </div>
            <p className={styles.globeStat}>
              <strong>{count}</strong> of my {goal}-country goal
            </p>
          </>
        ) : (
          <p className={styles.globeStat}>
            <strong>{count}</strong> countries explored
          </p>
        )}
        <ul className={styles.globeChips} aria-label="Countries I've visited">
          {visited.map((c) => (
            <li key={c}>
              <button type="button" className={styles.globeChip} aria-pressed={selected === c} onClick={() => apiRef.current?.focus(c)}>
                {c}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
