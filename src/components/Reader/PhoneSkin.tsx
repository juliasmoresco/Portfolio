import { useEffect, useRef, useState } from "react";
import type * as THREE from "three";
import type { ReaderItem, SpeedDial } from "../../content";
import { usePrefersReducedMotion } from "../../hooks/usePrefersReducedMotion";
import styles from "./Reader.module.css";
import { useUi } from "./ui";
import phoneStill from "../../assets/stills/phone.webp";
import { HAS_WEBGL } from "../../webgl";

/** Timings, ms. A real dial returns at about ten pulses a second; this one is a touch quicker. */
const AUTO_TURN_MS = 320;
const RETURN_LEAD_MS = 90;
const PULSE_MS = 62;
const RING_MS = 1300;
const JIGGLE_MS = 700;

type Status = { kind: "idle" } | { kind: "dialling"; digit: string } | { kind: "ringing"; digit: string } | { kind: "answered"; digit: string; text: string; link?: string };

/** Short synthesised sounds, so there is no audio file to ship. */
function noiseBurst(ctx: AudioContext, at: number, ms: number, freq: number, vol: number): void {
  const len = Math.ceil((ctx.sampleRate * ms) / 1000);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 2;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const band = ctx.createBiquadFilter();
  band.type = "bandpass";
  band.frequency.value = freq;
  band.Q.value = 1.2;
  const gain = ctx.createGain();
  gain.gain.value = vol;
  src.connect(band).connect(gain).connect(ctx.destination);
  src.start(at);
}

/** The dial's click as it returns, one per pulse. */
const tick = (ctx: AudioContext, at = ctx.currentTime) => noiseBurst(ctx, at, 9, 2600, 0.5);
/** The wheel knocking against the finger stop. */
const clunk = (ctx: AudioContext) => noiseBurst(ctx, ctx.currentTime, 30, 700, 0.9);

/** Two bursts of ringing tone, as heard down the line while the other end rings. */
function ringback(ctx: AudioContext): void {
  const t = ctx.currentTime;
  [0, 0.62].forEach((start) => {
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, t + start);
    gain.gain.linearRampToValueAtTime(0.05, t + start + 0.02);
    gain.gain.setValueAtTime(0.05, t + start + 0.42);
    gain.gain.linearRampToValueAtTime(0, t + start + 0.46);
    gain.connect(ctx.destination);
    [440, 480].forEach((f) => {
      const osc = ctx.createOscillator();
      osc.frequency.value = f;
      osc.connect(gain);
      osc.start(t + start);
      osc.stop(t + start + 0.5);
    });
  });
}

/** Pulses a digit sends: one for 1 … ten for 0. */
const pulsesFor = (digit: string) => (digit === "0" ? 10 : Number(digit));

/**
 * The phone on the shelf (scene/phone.ts), close up and working. The speed-dial keys beside it (1 LinkedIn,
 * 2 Email, 3 ADPList, from the content file) make the phone dial by itself: the wheel turns to the number, clicks
 * back, rings, and the call connects — then one clear button opens that link (and email offers its address to
 * copy). The dial can still be turned by hand or with the number keys, and other numbers get a line of their own.
 *
 * three.js and the phone builder load on demand, as in GlobeSkin and LlamaSkin.
 */
export function PhoneSkin({ item }: { item: ReaderItem }) {
  const ui = useUi();
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduced = usePrefersReducedMotion();
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const dialRef = useRef<(digit: string) => void>(() => {});
  const connectRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  const speedDial = item.speedDial ?? [];
  const page = item.pages[0];
  // Only the opening line shows; the rest of the Contact text (email, city, mentorship) is covered by the calls.
  const intro = page?.lines[0];
  const numbered = speedDial.filter((d) => d.link).map((d) => d.digit);
  const [touch] = useState(() => typeof matchMedia === "function" && matchMedia("(pointer: coarse)").matches);
  const keys = numbered.length > 1 ? `${numbered.slice(0, -1).join(", ")} ${ui.or} ${numbered[numbered.length - 1]}` : numbered[0] ?? ui.aNumber;
  const hint = touch ? ui.phoneHint : ui.phoneHintDesk(keys);

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    if (!HAS_WEBGL) {
      // No WebGL: no dial to turn, so a call rings and is answered straight from the speed-dial buttons.
      let timer = 0;
      dialRef.current = (digit: string) => {
        const entry = speedDial.find((d) => d.digit === digit);
        setStatus({ kind: "ringing", digit });
        window.clearTimeout(timer);
        timer = window.setTimeout(() => {
          setStatus({ kind: "answered", digit, text: entry?.text ?? (item.wrongNumber ?? "Nobody home at {digit}.").replace("{digit}", digit), link: entry?.link });
        }, reduced ? 0 : 900);
      };
      return () => window.clearTimeout(timer);
    }
    let cancelled = false;
    let cleanup: (() => void) | undefined;

    Promise.all([import("three"), import("../../scene/phone")])
      .then(([THREE, { makeRotaryPhone, DIAL }]) => {
        if (cancelled) return;

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 20);
        const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
        renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.15;
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        scene.add(new THREE.HemisphereLight(0xffeedd, 0x4a453c, 0.8));
        scene.add(new THREE.AmbientLight(0xffe4c4, 0.35));
        const key = new THREE.DirectionalLight(0xffe2bd, 1.6);
        key.position.set(-1.6, 2.6, 2.2);
        key.castShadow = true;
        key.shadow.mapSize.set(1024, 1024);
        key.shadow.bias = -0.0015;
        key.shadow.radius = 3;
        Object.assign(key.shadow.camera, { left: -0.8, right: 0.8, top: 0.8, bottom: -0.8, near: 1, far: 8 });
        scene.add(key, key.target);
        const fill = new THREE.DirectionalLight(0xcfe0ea, 0.5);
        fill.position.set(2.2, 0.8, 2.4);
        scene.add(fill);

        // `jig` sits at the base, so a jiggle keeps the phone standing; `model` inside it is the phone.
        const model = makeRotaryPhone();
        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const unit = 1 / (Math.max(size.x, size.z) || 1);
        model.scale.setScalar(unit);
        box.setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        model.position.set(-center.x, -box.min.y, -center.z);
        const jig = new THREE.Group();
        const floorY = -(box.max.y - box.min.y) / 2;
        jig.position.y = floorY;
        jig.rotation.y = -0.14;
        jig.add(model);
        scene.add(jig);
        model.traverse((o) => {
          o.castShadow = true;
          o.receiveShadow = true;
        });
        const floor = new THREE.Mesh(new THREE.CircleGeometry(0.75, 48), new THREE.ShadowMaterial({ opacity: 0.28 }));
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = floorY + 0.001;
        floor.receiveShadow = true;
        scene.add(floor);

        const dial = model.getObjectByName("rotary_dial")!;
        const wheel = model.getObjectByName("dial_finger_wheel")!;

        let audio: AudioContext | null = null;
        const sound = (play: (ctx: AudioContext) => void) => {
          try {
            audio ??= new AudioContext();
            if (audio.state === "suspended") void audio.resume();
            play(audio);
          } catch {
            // no Web Audio: the dial just turns quietly.
          }
        };

        // The wheel's state. `rot` is how far it is turned clockwise, in radians.
        let rot = 0;
        let grab: { hole: number; prev: number; max: number; moved: number; atStop: boolean } | null = null;
        let auto: { hole: number; from: number; t0: number } | null = null;
        let ret: { from: number; t0: number; ms: number; pulses: number; ticked: number } | null = null;
        let ringTimer = 0;
        let jiggleStart = -Infinity;
        const maxFor = (hole: number) => DIAL.holeAngle(hole) - DIAL.stopAngle - (DIAL.holeSize / DIAL.holeRadius) * 0.9;
        const busy = () => grab !== null || auto !== null || ret !== null;

        const startReturn = (dialled: boolean, hole: number, now: number) => {
          const digit = DIAL.digits[hole];
          const pulses = dialled ? pulsesFor(digit) : 0;
          const ms = reduced ? 0 : dialled ? RETURN_LEAD_MS + pulses * PULSE_MS : 160;
          ret = { from: rot, t0: now, ms, pulses, ticked: 0 };
          if (dialled) {
            window.clearTimeout(ringTimer);
            setStatus({ kind: "dialling", digit });
          }
        };

        const answer = (digit: string) => {
          const entry: SpeedDial | undefined = speedDial.find((d) => d.digit === digit);
          setStatus({ kind: "ringing", digit });
          sound(ringback);
          ringTimer = window.setTimeout(() => {
            jiggleStart = performance.now();
            setStatus({
              kind: "answered",
              digit,
              text: entry?.text ?? (item.wrongNumber ?? "Nobody home at {digit}.").replace("{digit}", digit),
              link: entry?.link,
            });
          }, RING_MS);
        };

        const dialDigit = (digit: string) => {
          const hole = DIAL.digits.indexOf(digit);
          if (hole < 0 || busy()) return;
          sound(() => {});
          auto = { hole, from: rot, t0: performance.now() };
        };
        dialRef.current = dialDigit;

        // Where the pointer is on the dial: the dial's own plane, in its own coordinates.
        const raycaster = new THREE.Raycaster();
        const ndc = new THREE.Vector2();
        const plane = new THREE.Plane();
        const hit = new THREE.Vector3();
        const normal = new THREE.Vector3();
        const onDial = (ev: PointerEvent): { angle: number; r: number } | null => {
          const rect = canvas.getBoundingClientRect();
          ndc.set(((ev.clientX - rect.left) / rect.width) * 2 - 1, -((ev.clientY - rect.top) / rect.height) * 2 + 1);
          raycaster.setFromCamera(ndc, camera);
          dial.updateWorldMatrix(true, false);
          normal.set(0, 0, 1).transformDirection(dial.matrixWorld);
          plane.setFromNormalAndCoplanarPoint(normal, dial.getWorldPosition(hit));
          if (!raycaster.ray.intersectPlane(plane, hit)) return null;
          dial.worldToLocal(hit);
          return { angle: Math.atan2(hit.y, hit.x), r: Math.hypot(hit.x, hit.y) };
        };
        // Fingers get a wider catch round each hole than a mouse does (the holes nearly touch at that size).
        const reach = matchMedia("(pointer: coarse)").matches ? 1.9 : 1.5;
        const holeAt = (p: { angle: number; r: number }) => {
          for (let i = 0; i < 10; i++) {
            const a = DIAL.holeAngle(i);
            const dx = p.r * Math.cos(p.angle) - DIAL.holeRadius * Math.cos(a);
            const dy = p.r * Math.sin(p.angle) - DIAL.holeRadius * Math.sin(a);
            if (Math.hypot(dx, dy) < DIAL.holeSize * reach) return i;
          }
          return -1;
        };
        const wrapPi = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

        const onDown = (ev: PointerEvent) => {
          if (busy()) return;
          const p = onDial(ev);
          const hole = p ? holeAt(p) : -1;
          if (!p || hole < 0) return;
          ev.preventDefault();
          sound(() => {}); // unlock audio on the gesture
          try {
            canvas.setPointerCapture(ev.pointerId);
          } catch {
            // not a live pointer (e.g. a synthetic event): the drag still works while over the canvas.
          }
          grab = { hole, prev: p.angle, max: maxFor(hole), moved: 0, atStop: false };
          canvas.style.cursor = "grabbing";
        };
        const onMove = (ev: PointerEvent) => {
          const p = onDial(ev);
          if (!grab) {
            canvas.style.cursor = p && !busy() && holeAt(p) >= 0 ? "grab" : "default";
            return;
          }
          if (!p) return;
          const d = wrapPi(grab.prev - p.angle); // clockwise is positive
          grab.prev = p.angle;
          grab.moved += Math.abs(d);
          rot = Math.min(Math.max(rot + d, 0), grab.max);
          if (rot >= grab.max - 0.001 && !grab.atStop) {
            grab.atStop = true;
            sound(clunk);
          } else if (rot < grab.max - 0.05) grab.atStop = false;
        };
        const onUp = (ev: PointerEvent) => {
          if (!grab) return;
          const g = grab;
          grab = null;
          if (canvas.hasPointerCapture(ev.pointerId)) canvas.releasePointerCapture(ev.pointerId);
          canvas.style.cursor = "grab";
          if (g.moved < 0.08) auto = { hole: g.hole, from: rot, t0: performance.now() };
          else startReturn(g.atStop, g.hole, performance.now());
        };
        const onKey = (ev: KeyboardEvent) => {
          if (/^[0-9]$/.test(ev.key)) {
            ev.preventDefault();
            dialDigit(ev.key);
          }
        };
        canvas.addEventListener("pointerdown", onDown);
        canvas.addEventListener("pointermove", onMove);
        canvas.addEventListener("pointerup", onUp);
        canvas.addEventListener("pointercancel", onUp);
        canvas.addEventListener("keydown", onKey);

        // Frame the phone from in front and above, about square to the sloped dial, and lean the view towards
        // the dial so its holes are big enough to grab (the far end of the cord may crop a little).
        const sphere = new THREE.Box3().setFromObject(jig).getBoundingSphere(new THREE.Sphere());
        jig.updateMatrixWorld(true);
        const aim = sphere.center.clone().lerp(dial.getWorldPosition(new THREE.Vector3()), 0.45);
        const EL = 0.62;
        const AZ = 0.1;
        const resize = () => {
          const w = wrap.clientWidth || 1;
          const h = wrap.clientHeight || 1;
          renderer.setSize(w, h, false);
          camera.aspect = w / h;
          const halfV = THREE.MathUtils.degToRad(camera.fov / 2);
          const halfH = Math.atan(Math.tan(halfV) * camera.aspect);
          const dist = (sphere.radius * 0.66) / Math.sin(Math.min(halfV, halfH));
          camera.position.set(aim.x + Math.sin(AZ) * Math.cos(EL) * dist, aim.y + Math.sin(EL) * dist, aim.z + Math.cos(AZ) * Math.cos(EL) * dist);
          camera.lookAt(aim);
          camera.updateProjectionMatrix();
        };

        const ease = (t: number) => 1 - (1 - t) ** 3;
        let raf = 0;
        const loop = (now: number) => {
          raf = requestAnimationFrame(loop);

          if (auto) {
            const max = maxFor(auto.hole);
            const k = reduced ? 1 : Math.min((now - auto.t0) / AUTO_TURN_MS, 1);
            rot = auto.from + (max - auto.from) * ease(k);
            if (k >= 1) {
              const hole = auto.hole;
              auto = null;
              sound(clunk);
              startReturn(true, hole, now);
            }
          } else if (ret) {
            const r = ret;
            // The wheel pauses a beat at the stop, then runs back at an even speed, clicking once per pulse.
            const lead = r.pulses ? RETURN_LEAD_MS : 0;
            const k = r.ms === 0 ? 1 : Math.min(Math.max((now - r.t0 - lead) / (r.ms - lead), 0), 1);
            rot = r.from * (1 - k);
            const due = r.pulses ? Math.min(r.pulses, Math.floor(k * r.pulses + 1e-6)) : 0;
            while (r.ticked < due) {
              r.ticked += 1;
              sound(tick);
            }
            if (k >= 1) {
              ret = null;
              rot = 0;
              if (r.pulses) answer(r.pulses === 10 ? "0" : String(r.pulses));
            }
          }
          wheel.rotation.z = -rot;

          // A happy little jiggle when someone picks up.
          const jt = (now - jiggleStart) / JIGGLE_MS;
          if (!reduced && jt >= 0 && jt < 1) {
            const s = Math.sin(jt * Math.PI * 6) * (1 - jt);
            jig.rotation.z = 0.035 * s;
            jig.position.y = floorY + 0.012 * Math.abs(s);
          } else if (jig.rotation.z !== 0) {
            jig.rotation.z = 0;
            jig.position.y = floorY;
          }

          renderer.render(scene, camera);
        };

        const ro = new ResizeObserver(resize);
        ro.observe(wrap);
        resize();
        raf = requestAnimationFrame(loop);

        cleanup = () => {
          cancelAnimationFrame(raf);
          window.clearTimeout(ringTimer);
          ro.disconnect();
          dialRef.current = () => {};
          canvas.removeEventListener("pointerdown", onDown);
          canvas.removeEventListener("pointermove", onMove);
          canvas.removeEventListener("pointerup", onUp);
          canvas.removeEventListener("pointercancel", onUp);
          canvas.removeEventListener("keydown", onKey);
          void audio?.close();
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
        if (!cancelled) console.error("[PhoneSkin]", e);
      });

    return () => {
      cancelled = true;
      cleanup?.();
    };
    // Re-mounts (via the Reader's `key={id}`) rather than reacting to prop changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const lit = status.kind === "answered" ? status.link : undefined;
  const answeredLink = lit ? item.links?.find((l) => l.label === lit) : undefined;

  // On a short screen the button that appears when someone answers could land out of sight: bring it into view.
  useEffect(() => {
    if (answeredLink) connectRef.current?.scrollIntoView({ block: "nearest", behavior: reduced ? "auto" : "smooth" });
  }, [answeredLink, reduced]);
  const line =
    status.kind === "dialling" ? ui.dialling(status.digit) : status.kind === "ringing" ? ui.ringing(status.digit) : status.kind === "answered" ? status.text : hint;

  return (
    <div className={styles.phone}>
      <div ref={wrapRef} className={styles.phoneStage}>
        <canvas
          ref={canvasRef}
          className={styles.phoneCanvas}
          tabIndex={0}
          role="application"
          aria-roledescription="rotary phone"
          aria-label={`Pink rotary phone. Press a number key to dial: ${speedDial
            .filter((d) => d.link)
            .map((d) => `${d.digit} for ${d.link}`)
            .join(", ")}.`}
          hidden={!HAS_WEBGL}
        />
        {!HAS_WEBGL && <img className={styles.still} src={phoneStill} alt="" draggable={false} />}
      </div>
      <div className={styles.phoneText}>
        <h2 className={styles.phoneHeading}>{item.title}</h2>
        {intro && <p className={styles.phoneIntro}>{intro}</p>}
        <p key={status.kind === "answered" ? `a${status.digit}` : status.kind} className={status.kind === "answered" ? styles.phoneReply : styles.phoneStatus} aria-live="polite">
          {line}
        </p>
        {/* Speed dial: one tap and the phone dials, rings and connects by itself. */}
        <ul className={styles.phoneDirectory}>
          {speedDial
            .filter((d) => d.link)
            .map((d) => (
              <li key={d.digit}>
                <button
                  type="button"
                  className={styles.phoneKey}
                  data-lit={lit === d.link || undefined}
                  aria-label={`Call ${d.link} (dial ${d.digit})`}
                  disabled={status.kind === "dialling" || status.kind === "ringing"}
                  onClick={() => {
                    setCopied(false);
                    dialRef.current(d.digit);
                  }}
                >
                  <span className={styles.phoneDigit} aria-hidden="true">
                    {d.digit}
                  </span>
                  {d.link}
                </button>
              </li>
            ))}
        </ul>
        {/* Once someone picks up: the way through, in one obvious button (and the address to copy, for email). */}
        {answeredLink && (
          <div key={answeredLink.href} ref={connectRef} className={styles.phoneConnect}>
            <a className={styles.chessLink} href={answeredLink.href} {...(/^https?:/.test(answeredLink.href) ? { target: "_blank", rel: "noreferrer" } : {})}>
              {answeredLink.href.startsWith("mailto:") ? ui.writeEmail : ui.open(answeredLink.label)} →
            </a>
            {answeredLink.href.startsWith("mailto:") && (
              <button
                type="button"
                className={styles.phoneCopy}
                onClick={() => {
                  const address = answeredLink.href.replace(/^mailto:/, "");
                  void navigator.clipboard?.writeText(address).then(
                    () => setCopied(true),
                    () => setCopied(false),
                  );
                }}
              >
                {copied ? ui.copied : ui.copyAddress}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
