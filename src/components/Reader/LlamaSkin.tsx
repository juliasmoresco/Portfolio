import { useEffect, useRef, useState } from "react";
import type * as THREE from "three";
import type { ReaderItem } from "../../content";
import { usePrefersReducedMotion } from "../../hooks/usePrefersReducedMotion";
import styles from "./Reader.module.css";

const STORAGE_KEY = "portfolio.llamaCoins";

/** Coin timeline, ms: it pops in above her back, spins, then lines up with the slot and drops in. */
const COIN_APPEAR = 160;
const COIN_DROP_AT = 420;
const COIN_IN_AT = 640;
const COIN_DONE = 720;
/** How high above the slot a coin appears, in the llama model's own units (she is ~0.55 tall). */
const COIN_LIFT = 0.12;

/** Hop length, ms, and how close together coins must land (ms) to count as a streak. */
const HOP_MS = 440;
const STREAK_MS = 1500;

const MESSAGE_MS = 4500;
const FLOAT_MS = 900;

type Milestone = NonNullable<ReaderItem["milestones"]>[number];

function readStoredCoins(): number {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const n = raw ? parseInt(raw, 10) : 0;
    return Number.isFinite(n) && n >= 0 ? n : 0;
  } catch {
    return 0;
  }
}

function writeStoredCoins(n: number): void {
  try {
    localStorage.setItem(STORAGE_KEY, String(n));
  } catch {
    // private browsing / storage disabled — the count just won't survive a reload.
  }
}

/** A soft warm pool of light under her feet — a dark shadow would vanish against this panel's dark
 *  glass, so this reads as a little spotlight instead, which is what keeps her from looking afloat. */
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

/** A short two-note "clink", synthesised so there is no audio file to ship. */
function clink(ctx: AudioContext): void {
  const t = ctx.currentTime;
  const detune = 1 + (Math.random() - 0.5) * 0.08;
  [
    [2350, 0, 0.12],
    [3520, 0.035, 0.07],
  ].forEach(([freq, delay, vol]) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.value = freq * detune;
    gain.gain.setValueAtTime(0, t + delay);
    gain.gain.linearRampToValueAtTime(vol, t + delay + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + delay + 0.32);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t + delay);
    osc.stop(t + delay + 0.35);
  });
}

/** The next milestone above `count`, and the one before it (or 0), for the progress bar. */
function milestoneRange(milestones: Milestone[], count: number): { from: number; to: number } | null {
  const next = milestones.find((m) => m.at > count);
  if (!next) return null;
  const prev = [...milestones].reverse().find((m) => m.at <= count);
  return { from: prev?.at ?? 0, to: next.at };
}

/**
 * The shelf's llama piggy bank (scene/llama.ts), close up: tap her and a coin pops up above her
 * back, spins, and drops into her coin slot with a clink — and she gives a happy hop, bigger the
 * faster the coins come. Purely playful, no real money involved. The count persists in
 * localStorage, and passing a milestone (from the content file) shows a little message.
 *
 * three.js and the llama builder are loaded on demand here, same reasoning as GlobeSkin: this skin
 * lives inside the eagerly-mounted Reader, so a static `import * as THREE` would bloat the first
 * page load even for a visitor who never opens this frame.
 */
export function LlamaSkin({ item }: { item: ReaderItem }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduced = usePrefersReducedMotion();
  const [coins, setCoins] = useState<number>(() => readStoredCoins());
  const [message, setMessage] = useState<string | null>(null);
  const [floats, setFloats] = useState<{ id: number; x: number; y: number }[]>([]);
  const dropRef = useRef<() => void>(() => {});

  const hint = item.pages[0]?.lines.join(" ");
  const milestones = item.milestones ?? [];

  useEffect(() => {
    writeStoredCoins(coins);
  }, [coins]);

  useEffect(() => {
    if (!message) return;
    const t = window.setTimeout(() => setMessage(null), MESSAGE_MS);
    return () => window.clearTimeout(t);
  }, [message]);

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    let cancelled = false;
    let cleanup: (() => void) | undefined;

    Promise.all([import("three"), import("../../scene/llama")])
      .then(([THREE, { makeLlama }]) => {
        if (cancelled) return;

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 20);

        const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
        renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.2;
        // Self-shadowing gives the joints (legs into haunches, neck into chest) their contact shade.
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        scene.add(new THREE.HemisphereLight(0xffeedd, 0x4a453c, 0.8));
        scene.add(new THREE.AmbientLight(0xffe4c4, 0.4));
        const key = new THREE.DirectionalLight(0xffd7a4, 1.5);
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
        const rim = new THREE.DirectionalLight(0xffc48c, 0.45);
        rim.position.set(1.5, 1.4, -2.2);
        scene.add(rim);

        // Scene layout: `hop` sits at her feet (so a squash/stretch keeps her feet planted) and
        // holds `model`, which turns on its own axis like a turntable.
        const model = makeLlama();
        const box = new THREE.Box3().setFromObject(model);
        const size = new THREE.Vector3();
        box.getSize(size);
        const unit = 1 / (Math.max(size.x, size.y, size.z) || 1);
        model.scale.setScalar(unit);
        box.setFromObject(model);
        box.getSize(size);
        const center = new THREE.Vector3();
        box.getCenter(center);
        model.position.set(-center.x, -box.min.y, -center.z);
        model.rotation.y = -0.35;

        const hop = new THREE.Group();
        const floorY = -size.y / 2;
        hop.position.y = floorY;
        hop.add(model);
        scene.add(hop);

        // Widest reach from her turning axis, so framing holds at every angle of the turntable.
        let reach = 0;
        const v = new THREE.Vector3();
        model.updateMatrixWorld(true);
        model.traverse((o) => {
          const m = o as THREE.Mesh;
          if (!m.isMesh) return;
          const pos = m.geometry.attributes.position;
          for (let i = 0; i < pos.count; i += 7) {
            v.fromBufferAttribute(pos, i).applyMatrix4(m.matrixWorld);
            reach = Math.max(reach, Math.hypot(v.x + center.x, v.z + center.z));
          }
        });

        const glowTex = makeGlowTexture(THREE);
        const glow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, depthWrite: false }));
        glow.rotation.x = -Math.PI / 2;
        glow.position.y = floorY + 0.004;
        glow.scale.set(reach * 1.5, reach * 1.2, 1);
        scene.add(glow);

        const pickable: THREE.Object3D[] = [];
        model.traverse((o) => {
          if ((o as THREE.Mesh).isMesh) {
            o.castShadow = true;
            o.receiveShadow = true;
            pickable.push(o);
          }
        });

        // Coins are children of the model, so they follow the slot round as she turns. The disc
        // stands on edge in the slot's plane (the slot runs nose to tail).
        const slot = model.getObjectByName("coin_slot");
        const slotTop = slot ? slot.position.clone().setY(slot.position.y + 0.005) : new THREE.Vector3(0, 0.3, 0);
        const coinGeo = new THREE.CylinderGeometry(0.022, 0.022, 0.006, 28);
        coinGeo.rotateZ(Math.PI / 2);
        const coinMat = new THREE.MeshStandardMaterial({ color: 0xf0c46a, metalness: 0.85, roughness: 0.28, emissive: 0x6b4a10, emissiveIntensity: 0.3 });
        const flying: { mesh: THREE.Mesh; t0: number; landed: boolean }[] = [];

        let count = readStoredCoins();
        let audio: AudioContext | null = null;
        let hopStart = -Infinity;
        let hopStrength = 1;
        const landings: number[] = [];
        let floatId = 0;
        const project = new THREE.Vector3();

        const land = (coin: THREE.Mesh, now: number) => {
          count += 1;
          setCoins(count);
          const hit = milestones.find((m) => m.at === count);
          if (hit) setMessage(hit.text);

          try {
            audio ??= new AudioContext();
            if (audio.state === "suspended") void audio.resume();
            clink(audio);
          } catch {
            // no Web Audio: the coin just lands quietly.
          }

          while (landings.length && now - landings[0] > STREAK_MS) landings.shift();
          landings.push(now);
          if (!reduced) {
            hopStart = now;
            hopStrength = Math.min(1 + 0.35 * (landings.length - 1), 2.2);
          }

          coin.getWorldPosition(project).project(camera);
          const id = ++floatId;
          setFloats((f) => [...f, { id, x: (project.x * 0.5 + 0.5) * w, y: (-project.y * 0.5 + 0.5) * h }]);
          window.setTimeout(() => setFloats((f) => f.filter((x) => x.id !== id)), FLOAT_MS);
        };

        const drop = () => {
          const mesh = new THREE.Mesh(coinGeo, coinMat);
          mesh.castShadow = true;
          mesh.position.set(slotTop.x, slotTop.y + COIN_LIFT, slotTop.z);
          mesh.scale.setScalar(0.001);
          model.add(mesh);
          flying.push({ mesh, t0: performance.now(), landed: false });
        };
        dropRef.current = drop;

        const raycaster = new THREE.Raycaster();
        const pointer = new THREE.Vector2();
        const pick = (ev: PointerEvent) => {
          const r = canvas.getBoundingClientRect();
          pointer.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
          raycaster.setFromCamera(pointer, camera);
          return raycaster.intersectObjects(pickable, false).length > 0;
        };
        const onClick = (ev: MouseEvent) => {
          if (pick(ev as PointerEvent)) drop();
        };
        const onMove = (ev: PointerEvent) => {
          canvas.style.cursor = pick(ev) ? "pointer" : "default";
        };
        const onKey = (ev: KeyboardEvent) => {
          if (ev.key === "Enter" || ev.key === " ") {
            ev.preventDefault();
            drop();
          }
        };
        canvas.addEventListener("click", onClick);
        canvas.addEventListener("pointermove", onMove);
        canvas.addEventListener("keydown", onKey);

        // Fit her, glow included, to whichever of the stage's width or height is tighter, from a
        // little above so we look slightly down on her back (where the coins go in).
        const EL = 0.2;
        let w = 1;
        let h = 1;
        const resize = () => {
          w = wrap.clientWidth || 1;
          h = wrap.clientHeight || 1;
          renderer.setSize(w, h, false);
          camera.aspect = w / h;
          const halfV = ((camera.fov / 2) * Math.PI) / 180;
          const halfH = Math.atan(Math.tan(halfV) * camera.aspect);
          const halfHeight = size.y / 2 + 0.05; // room for the hop
          const dist = Math.max(halfHeight / Math.tan(halfV), (reach * 1.05) / Math.tan(halfH)) * 1.06 + reach * 0.6;
          camera.position.set(0, Math.sin(EL) * dist, Math.cos(EL) * dist);
          camera.lookAt(0, 0.02, 0);
          camera.updateProjectionMatrix();
        };

        const easeOutBack = (t: number) => 1 + 2.2 * (t - 1) ** 3 + 1.2 * (t - 1) ** 2;
        let raf = 0;
        let last = performance.now();
        const loop = (now: number) => {
          raf = requestAnimationFrame(loop);
          const dt = Math.min((now - last) / 1000, 0.05);
          last = now;
          if (!reduced) model.rotation.y += 0.1 * dt;

          for (let i = flying.length - 1; i >= 0; i--) {
            const c = flying[i];
            const t = now - c.t0;
            const m = c.mesh;
            if (t < COIN_APPEAR) {
              m.scale.setScalar(Math.max(0.001, easeOutBack(t / COIN_APPEAR)));
              m.rotation.y += dt * 14;
            } else if (t < COIN_DROP_AT) {
              m.scale.setScalar(1);
              m.rotation.y += dt * 14;
              m.position.y = slotTop.y + COIN_LIFT + Math.sin(((t - COIN_APPEAR) / (COIN_DROP_AT - COIN_APPEAR)) * Math.PI) * 0.012;
            } else {
              // Square up with the slot, then fall in; her body hides the part that has gone in.
              const k = Math.min((t - COIN_DROP_AT) / (COIN_DONE - COIN_DROP_AT), 1);
              const aligned = Math.round(m.rotation.y / Math.PI) * Math.PI;
              m.rotation.y += (aligned - m.rotation.y) * Math.min(1, dt * 30);
              m.position.y = slotTop.y + COIN_LIFT - (COIN_LIFT + 0.03) * k * k;
              if (!c.landed && t >= COIN_IN_AT) {
                c.landed = true;
                land(m, now);
              }
            }
            if (t >= COIN_DONE) {
              model.remove(m);
              flying.splice(i, 1);
            }
          }

          // Happy hop: up and back down with a stretch in the air, and a wiggle when on a streak.
          const ht = (now - hopStart) / HOP_MS;
          if (ht >= 0 && ht < 1) {
            const lift = Math.sin(Math.PI * ht);
            hop.position.y = floorY + 0.045 * hopStrength * lift;
            hop.scale.set(1 - 0.03 * hopStrength * lift, 1 + 0.06 * hopStrength * lift, 1 - 0.03 * hopStrength * lift);
            hop.rotation.z = hopStrength > 1.2 ? 0.06 * (hopStrength - 1) * Math.sin(ht * Math.PI * 4) * (1 - ht) : 0;
            glow.scale.set(reach * 1.5 * (1 - 0.25 * lift), reach * 1.2 * (1 - 0.25 * lift), 1);
          } else if (hop.position.y !== floorY) {
            hop.position.y = floorY;
            hop.scale.set(1, 1, 1);
            hop.rotation.z = 0;
            glow.scale.set(reach * 1.5, reach * 1.2, 1);
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
          dropRef.current = () => {};
          canvas.removeEventListener("click", onClick);
          canvas.removeEventListener("pointermove", onMove);
          canvas.removeEventListener("keydown", onKey);
          void audio?.close();
          coinGeo.dispose();
          coinMat.dispose();
          glowTex.dispose();
          scene.traverse((o) => {
            const m = o as THREE.Mesh;
            m.geometry?.dispose();
            const mats = Array.isArray(m.material) ? m.material : m.material ? [m.material] : [];
            mats.forEach((mat) => mat.dispose());
          });
          renderer.dispose();
        };
      })
      .catch((e: unknown) => {
        if (!cancelled) console.error("[LlamaSkin]", e);
      });

    return () => {
      cancelled = true;
      cleanup?.();
    };
    // Re-mounts (via the Reader's `key={id}`) rather than reacting to prop changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const range = milestoneRange(milestones, coins);
  return (
    <div className={styles.llama}>
      <div ref={wrapRef} className={styles.llamaStage}>
        <canvas
          ref={canvasRef}
          className={styles.llamaCanvas}
          tabIndex={0}
          role="button"
          aria-label="Drop a coin in the llama bank"
        />
        {floats.map((f) => (
          <span key={f.id} className={styles.llamaFloat} style={{ left: f.x, top: f.y }} aria-hidden="true">
            +1
          </span>
        ))}
      </div>
      <div className={styles.llamaText}>
        <h2 className={styles.llamaHeading}>{item.title}</h2>
        <p key={message ?? "hint"} className={message ? styles.llamaMessage : styles.llamaHint} aria-live="polite">
          {message ?? hint}
        </p>
        {range && (
          <div
            className={styles.progressBar}
            role="progressbar"
            aria-label="Coins toward the next milestone"
            aria-valuemin={range.from}
            aria-valuemax={range.to}
            aria-valuenow={coins}
          >
            <span style={{ width: `${((coins - range.from) / (range.to - range.from)) * 100}%` }} />
          </div>
        )}
        <p className={styles.llamaCount}>
          <strong>{coins}</strong> {coins === 1 ? "coin" : "coins"}
          {range ? ` · next milestone at ${range.to}` : " · every milestone reached"}
        </p>
      </div>
    </div>
  );
}
