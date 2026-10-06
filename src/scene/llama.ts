/**
 * The llama piggy bank, built in code like the desk globe. Proportions and glazes follow the
 * original GLB (about 0.55 tall, facing +z), but the parts now flow into each other: legs taper
 * up into rounded haunches instead of stopping flat under the belly, the neck flares into the
 * chest, and the tail is a small curled tuft rather than a lone blob.
 */
import * as THREE from "three";
import { taperedTube } from "./shapes";

type V3 = [number, number, number];

function glaze(rgb: V3, roughness: number): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color: new THREE.Color().setRGB(...rgb),
    roughness,
    clearcoat: 0.45,
    clearcoatRoughness: 0.3,
  });
}

/** A lathe from [radius, y] pairs, closed at both ends. */
function lathe(profile: [number, number][], segments = 32): THREE.LatheGeometry {
  const first = profile[0][1];
  const last = profile[profile.length - 1][1];
  const pts = [new THREE.Vector2(0, first), ...profile.map(([r, y]) => new THREE.Vector2(r, y)), new THREE.Vector2(0, last)];
  return new THREE.LatheGeometry(pts, segments);
}

/** Where a ray from an ellipsoid's centre along `dir` meets its surface. */
function onEllipsoid(center: V3, radii: V3, dir: V3): THREE.Vector3 {
  const d = new THREE.Vector3(...dir).normalize();
  const s = 1 / Math.hypot(d.x / radii[0], d.y / radii[1], d.z / radii[2]);
  return new THREE.Vector3(...center).addScaledVector(d, s);
}

export function makeLlama(): THREE.Group {
  const llama = new THREE.Group();
  llama.name = "llama";

  const cream = glaze([0.896, 0.839, 0.745], 0.45);
  const black = glaze([0.012, 0.01, 0.009], 0.35);
  const tan = glaze([0.807, 0.584, 0.262], 0.5);
  const terracotta = glaze([0.527, 0.162, 0.091], 0.55);
  const mustard = glaze([0.807, 0.546, 0.084], 0.55);

  const sphere = new THREE.SphereGeometry(1, 40, 28);
  const add = (name: string, geo: THREE.BufferGeometry, mat: THREE.Material, pos: V3, scale: V3 = [1, 1, 1]) => {
    const m = new THREE.Mesh(geo, mat);
    m.name = name;
    m.position.set(...pos);
    m.scale.set(...scale);
    llama.add(m);
    return m;
  };

  const BODY_C: V3 = [0, 0.205, 0];
  add("body", sphere, cream, BODY_C, [0.074, 0.086, 0.126]);
  add("chest", sphere, cream, [0, 0.25, 0.062], [0.052, 0.06, 0.05]);

  // Legs: rounded haunches bulge out of the belly, and each leg tapers up into its haunch,
  // so there is no hard edge where a straight tube meets the body.
  const legGeo = lathe([[0.023, 0.024], [0.0235, 0.06], [0.025, 0.1], [0.0275, 0.14], [0.03, 0.175]]);
  const hoofGeo = lathe([[0.026, 0], [0.0285, 0.004], [0.029, 0.018], [0.0265, 0.03]]);
  for (const [side, x] of [["left", -0.043], ["right", 0.043]] as const) {
    for (const [end, z] of [["rear", -0.07], ["front", 0.07]] as const) {
      add(`haunch_${end}_${side}`, sphere, cream, [x, 0.168, z], [0.03, 0.05, 0.036]);
      add(`leg_${end}_${side}`, legGeo, cream, [x, 0, z]);
      add(`hoof_${end}_${side}`, hoofGeo, black, [x, 0, z]);
    }
  }

  // Neck: widest where it leaves the chest, easing in toward the head.
  const neck = add(
    "neck",
    lathe([[0.06, -0.12], [0.057, -0.08], [0.051, -0.04], [0.048, 0], [0.046, 0.05], [0.045, 0.11]]),
    cream,
    [0, 0.345, 0.07],
  );
  neck.rotation.x = 0.19;

  const HEAD_C: V3 = [0, 0.438, 0.084];
  const HEAD_R: V3 = [0.047, 0.054, 0.057];
  add("head", sphere, cream, HEAD_C, HEAD_R);

  // Snout: a tan root on the face, a capsule leaning a little down, a black nose on the tip.
  add("muzzle_root", sphere, tan, [0, 0.422, 0.098], [0.037, 0.04, 0.05]);
  const tilt = 0.24;
  const muzzle = add("muzzle", new THREE.CapsuleGeometry(0.03, 0.045, 8, 24), tan, [0, 0.414, 0.135]);
  muzzle.rotation.x = Math.PI / 2 + tilt;
  const tip = new THREE.Vector3(0, 0.414 - 0.0525 * Math.sin(tilt), 0.135 + 0.0525 * Math.cos(tilt));
  add("nose", sphere, black, [0, tip.y + 0.003, tip.z - 0.004], [0.011, 0.008, 0.008]);

  // Closed, smiling eyes: short arcs sitting on the head's surface.
  const eyeGeo = new THREE.TorusGeometry(0.0085, 0.0017, 8, 20, Math.PI);
  for (const s of [-1, 1]) {
    const p = onEllipsoid(HEAD_C, HEAD_R, [0.75 * s, 0.28, 0.6]);
    const eye = add(s < 0 ? "eye_left" : "eye_right", eyeGeo, black, [p.x, p.y, p.z]);
    eye.lookAt(p.clone().sub(new THREE.Vector3(...HEAD_C)).add(p));
  }

  const earGeo = new THREE.ConeGeometry(0.02, 0.1, 20);
  for (const s of [-1, 1]) {
    const ear = add(s < 0 ? "ear_left" : "ear_right", earGeo, cream, [0.027 * s, 0.498, 0.058], [1, 1, 0.55]);
    ear.rotation.set(-0.12, 0, -0.2 * s);
  }

  // Tail: one smooth, tapering curl that lifts off the rump and tips back down, rounded at the end.
  const tailCurve = new THREE.CatmullRomCurve3(
    ([[0, 0.24, -0.095], [0, 0.26, -0.123], [0, 0.27, -0.145], [0, 0.262, -0.163], [0, 0.245, -0.168]] as V3[]).map((p) => new THREE.Vector3(...p)),
  );
  const TAIL_TIP_R = 0.011;
  const tail = new THREE.Group();
  tail.name = "tail";
  tail.add(new THREE.Mesh(taperedTube(tailCurve, 0.022, TAIL_TIP_R), cream));
  const tailTip = new THREE.Mesh(sphere, cream);
  tailTip.position.copy(tailCurve.getPointAt(1));
  tailTip.scale.setScalar(TAIL_TIP_R);
  tail.add(tailTip);
  llama.add(tail);

  // Saddle blanket: stacked caps of slightly larger ellipsoids, so the edges read as painted bands.
  const bands: [string, THREE.Material, number, V3][] = [
    ["blanket_outer", terracotta, 0.27, [0.075, 0.087, 0.127]],
    ["blanket_band", mustard, 0.398, [0.076, 0.088, 0.129]],
    ["blanket_inner", terracotta, 0.529, [0.077, 0.089, 0.131]],
    ["blanket_core", cream, 0.655, [0.078, 0.09, 0.133]],
  ];
  for (const [name, mat, minY, scale] of bands) {
    add(name, new THREE.SphereGeometry(1, 48, 16, 0, Math.PI * 2, 0, Math.acos(minY)), mat, BODY_C, scale);
  }

  add("coin_slot", new THREE.BoxGeometry(0.008, 0.01, 0.052), black, [0, 0.293, -0.02]);

  return llama;
}
