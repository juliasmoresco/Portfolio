/**
 * Touch-ups applied to Zuko's model (cat-talking-button.glb) after it loads, and his idle life. His
 * face, markings and proportions are his own and stay untouched; this only softens the parts that
 * read as stiff up close, and moves a few of them.
 */
import * as THREE from "three";
import { taperedTube } from "./shapes";

const WHISKERS = ["whisker_0_0", "whisker_0_1", "whisker_1_0", "whisker_1_1", "whisker_2_0", "whisker_2_1", "whisker_3_0", "whisker_3_1"];
const BROW_WHISKERS = ["brow_whisker_0_0", "brow_whisker_1_0", "brow_whisker_0_1", "brow_whisker_1_1"];

/**
 * The forelegs ship as straight, even-width cylinders with flat ends, which read as sticks pushed
 * into the body. Each is rebuilt as a tube that tapers from shoulder to wrist. `forward` bows the
 * left leg out in front of the belly (the original line runs just under its surface); the right
 * one already reaches forward to the button.
 */
const FORELEGS = [
  { leg: "foreleg_left", shoulder: "shoulder_left", paw: "paw_left", forward: 0.035 },
  { leg: "foreleg_right", shoulder: "shoulder_right", paw: "paw_right_pressing", forward: 0.01 },
];

export function refineZuko(cat: THREE.Object3D): void {
  WHISKERS.forEach((n) => cat.getObjectByName(n)?.scale.setScalar(0.78));
  BROW_WHISKERS.forEach((n) => cat.getObjectByName(n)?.scale.setScalar(0.5));
  cat.getObjectByName("chin")?.scale.setScalar(0.85);

  for (const f of FORELEGS) {
    const leg = cat.getObjectByName(f.leg) as THREE.Mesh | undefined;
    const shoulder = cat.getObjectByName(f.shoulder);
    const paw = cat.getObjectByName(f.paw);
    // All three are siblings, so their positions share one space.
    if (!leg || !shoulder || !paw || leg.parent !== shoulder.parent || leg.parent !== paw.parent) continue;

    const top = shoulder.position.clone().add(new THREE.Vector3(0, -0.008, 0.02 + f.forward * 0.15));
    const bottom = paw.position.clone().add(new THREE.Vector3(0, 0.006, 0));
    const mid = top.clone().lerp(bottom, 0.5).add(new THREE.Vector3(0, 0, f.forward));

    leg.geometry.dispose();
    leg.geometry = taperedTube(new THREE.CatmullRomCurve3([top, mid, bottom]), 0.042, 0.03);
    leg.position.set(0, 0, 0);
    leg.quaternion.identity();
    leg.scale.set(1, 1, 1);
  }
}

/** A mesh's bounding box in its parent's space. */
function localBox(mesh: THREE.Mesh): THREE.Box3 {
  mesh.updateMatrix();
  return new THREE.Box3().setFromBufferAttribute(mesh.geometry.attributes.position as THREE.BufferAttribute).applyMatrix4(mesh.matrix);
}

/**
 * Gathers sibling meshes under a new group at `pivot` (in their shared parent's space), without
 * moving them, so they can be turned or scaled about that point together. Null if any is missing.
 */
function gather(cat: THREE.Object3D, names: string[], pivot: (parts: THREE.Mesh[]) => THREE.Vector3): THREE.Group | null {
  const parts = names.map((n) => cat.getObjectByName(n) as THREE.Mesh | undefined);
  if (parts.some((p) => !p?.isMesh)) return null;
  const meshes = parts as THREE.Mesh[];
  const parent = meshes[0].parent;
  if (!parent || meshes.some((m) => m.parent !== parent)) return null;
  const group = new THREE.Group();
  group.position.copy(pivot(meshes));
  parent.add(group);
  parent.updateWorldMatrix(true, true);
  meshes.forEach((m) => group.attach(m));
  return group;
}

const rand = (lo: number, hi: number) => lo + Math.random() * (hi - lo);
/** 0 → 1 → 0 over p in [0, 1]. */
const bump = (p: number) => Math.sin(Math.PI * Math.min(Math.max(p, 0), 1));

/**
 * Zuko's idle life: he blinks every few seconds (sometimes twice), flicks an ear now and then,
 * sways the tail and gives it the odd flick, and presses his talking button when the pointer finds
 * him. Call `update` every frame; with `reduced` (prefers-reduced-motion) only the press plays.
 */
export class ZukoLife {
  private eyes: THREE.Group[] = [];
  private ears: { group: THREE.Group; sign: number }[] = [];
  private tail: THREE.Group | null = null;
  private press: THREE.Group | null = null;
  private pressRest = 0;

  private nextBlink = performance.now() + rand(1500, 4000);
  private blinkAt = -Infinity;
  private nextTwitch = performance.now() + rand(4000, 9000);
  private twitchAt = -Infinity;
  private twitchEar = 0;
  private nextFlick = performance.now() + rand(3000, 7000);
  private flickAt = -Infinity;
  private pressAt = -Infinity;

  constructor(cat: THREE.Object3D) {
    for (const side of ["left", "right"]) {
      const eye = gather(cat, [`eye_rim_${side}`, `eye_${side}`, `pupil_${side}`, `eye_gloss_${side}`, `eye_gloss2_${side}`], (m) =>
        localBox(m[1]).getCenter(new THREE.Vector3()),
      );
      if (eye) this.eyes.push(eye);

      const ear = gather(cat, [`ear_${side}`, `ear_inner_${side}`, `ear_tuft_${side}`, `ear_${side}_outline`], (m) => {
        const b = localBox(m[0]);
        return new THREE.Vector3((b.min.x + b.max.x) / 2, b.min.y, (b.min.z + b.max.z) / 2);
      });
      if (ear) this.ears.push({ group: ear, sign: side === "left" ? 1 : -1 });
    }

    // The tail curls round his feet to a round tip; it turns about the end furthest from that tip.
    this.tail = gather(cat, ["tail", "tail_outline", "tail_tip", "tail_tip_outline"], (m) => {
      const tip = m[2].position;
      const pos = m[0].geometry.attributes.position;
      m[0].updateMatrix();
      const v = new THREE.Vector3();
      const root = new THREE.Vector3();
      let far = -1;
      for (let i = 0; i < pos.count; i++) {
        v.fromBufferAttribute(pos, i).applyMatrix4(m[0].matrix);
        const d = v.distanceToSquared(tip);
        if (d > far) {
          far = d;
          root.copy(v);
        }
      }
      return root;
    });

    this.press = gather(cat, ["paw_right_pressing", "paw_right_pressing_outline", "button_face", "button_label"], (m) => m[0].position.clone());
    if (this.press) this.pressRest = this.press.position.y;
  }

  /** Press the talking button (on hover). */
  poke(): void {
    const now = performance.now();
    if (now - this.pressAt > 380) this.pressAt = now;
  }

  update(now: number, reduced: boolean): void {
    if (this.press) this.press.position.y = this.pressRest - 0.008 * bump((now - this.pressAt) / 380);
    if (reduced) return;

    // Blink: a quick squash of each whole eye (rim, eye, pupil, gloss) to a line and back.
    if (now >= this.nextBlink) {
      this.blinkAt = now;
      this.nextBlink = now + (Math.random() < 0.25 ? 260 : rand(2500, 6000));
    }
    const lid = 1 - 0.88 * bump((now - this.blinkAt) / 180);
    this.eyes.forEach((e) => (e.scale.y = lid));

    if (now >= this.nextTwitch) {
      this.twitchAt = now;
      this.twitchEar = Math.floor(Math.random() * this.ears.length);
      this.nextTwitch = now + rand(5000, 11000);
    }
    this.ears.forEach((ear, i) => {
      ear.group.rotation.z = i === this.twitchEar ? ear.sign * 0.2 * bump((now - this.twitchAt) / 240) : 0;
    });

    if (this.tail) {
      if (now >= this.nextFlick) {
        this.flickAt = now;
        this.nextFlick = now + rand(4000, 9000);
      }
      const p = (now - this.flickAt) / 900;
      const flick = p >= 0 && p <= 1 ? 0.06 * Math.sin(p * Math.PI * 3) * (1 - p) : 0;
      this.tail.rotation.y = 0.025 * Math.sin(now / 520) + flick;
    }
  }
}
