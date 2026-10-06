/**
 * The rotary phone, built in code like the globe, llama and chess box. It replaces rotary-telephone.glb
 * (a flat-topped box with the dial lying on top and a coiled cord that ended in mid-air) with a 1950s desk
 * phone in the same pink: a sculpted body that tapers towards the top, the dial on a sloped front, a
 * clear finger wheel over a numbered plate with a "say hello" card in the middle, a cradle with two
 * horns, a handset with proper ear and mouth cups, and a coiled cord from the body round to the handset.
 * Sizes are real-world metres (about 20 cm wide), facing +z; the scene scales it to fit its shelf.
 */
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { toCreasedNormals } from "three/addons/utils/BufferGeometryUtils.js";

/** How far the body's bevel pushes its surface out beyond the side profile below. */
const BEVEL = 0.01;
/** The body sits this high, on its base plate. */
const LIFT = 0.004;
const Y0 = BEVEL + LIFT;

function plastic(color: THREE.ColorRepresentation, roughness = 0.35): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({ color, roughness, clearcoat: 0.6, clearcoatRoughness: 0.25 });
}

/**
 * The body: a side profile (front slope, flat top, back slope) extruded across the width with rounded
 * edges, then drawn in towards the top so it doesn't read as a box.
 */
function bodyGeometry(): THREE.BufferGeometry {
  const s = new THREE.Shape();
  // (z, y) — z towards the front
  s.moveTo(-0.095, 0);
  s.lineTo(0.095, 0);
  s.quadraticCurveTo(0.108, 0, 0.104, 0.014);
  s.lineTo(0.052, 0.07);
  s.quadraticCurveTo(0.04, 0.084, 0.02, 0.086);
  s.lineTo(-0.06, 0.088);
  s.quadraticCurveTo(-0.085, 0.089, -0.092, 0.07);
  s.lineTo(-0.104, 0.014);
  s.quadraticCurveTo(-0.108, 0, -0.095, 0);

  const depth = 0.17;
  const geo = new THREE.ExtrudeGeometry(s, {
    depth,
    bevelEnabled: true,
    bevelThickness: 0.012,
    bevelSize: BEVEL,
    bevelSegments: 6,
    curveSegments: 10,
  });
  // shape x → world z, extrusion → world x, centred across the width
  geo.rotateY(-Math.PI / 2);
  geo.translate(depth / 2, Y0, 0);

  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const t = THREE.MathUtils.clamp((pos.getY(i) - LIFT) / 0.1, 0, 1);
    pos.setX(i, pos.getX(i) * (1 - 0.24 * t * t));
  }
  geo.deleteAttribute("normal");
  const smooth = toCreasedNormals(geo, Math.PI / 3);
  geo.dispose();
  return smooth;
}

/** Digits round the plate, where the finger holes will show them. Angles run anticlockwise from 3 o'clock. */
const HOLE_R = 0.0245;
const HOLE_SIZE = 0.0052;
const holeAngle = (i: number) => THREE.MathUtils.degToRad(30 + i * 30);
const PLATE_R = 0.031;
const STOP_ANGLE = THREE.MathUtils.degToRad(-28);

/**
 * The dial's layout, for making it turn (see PhoneSkin): hole `i` (digit `digits[i]`) sits at `holeAngle(i)`,
 * `holeRadius` from the centre of the `rotary_dial` group, and the finger wheel (`dial_finger_wheel`) turns
 * clockwise about the group's z axis until that hole meets the finger stop at `stopAngle`.
 */
export const DIAL = {
  digits: "1234567890",
  holeAngle,
  holeRadius: HOLE_R,
  holeSize: HOLE_SIZE,
  stopAngle: STOP_ANGLE,
} as const;

function makePlateTexture(): THREE.CanvasTexture {
  const S = 512;
  const px = S / (PLATE_R * 2);
  const c = document.createElement("canvas");
  c.width = S;
  c.height = S;
  const g = c.getContext("2d")!;
  g.fillStyle = "#f4efe4";
  g.fillRect(0, 0, S, S);
  // a fine ring just inside the edge
  g.strokeStyle = "rgba(120,100,90,0.35)";
  g.lineWidth = 3;
  g.beginPath();
  g.arc(S / 2, S / 2, S / 2 - 10, 0, Math.PI * 2);
  g.stroke();
  g.fillStyle = "#2b2326";
  g.font = `600 ${Math.round(HOLE_SIZE * px * 1.05)}px Georgia, serif`;
  g.textAlign = "center";
  g.textBaseline = "middle";
  "1234567890".split("").forEach((d, i) => {
    const a = holeAngle(i);
    g.fillText(d, S / 2 + Math.cos(a) * HOLE_R * px, S / 2 - Math.sin(a) * HOLE_R * px + 2);
  });
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

/** The card in the middle of the dial, where the number would be typed. */
function makeCardTexture(): THREE.CanvasTexture {
  const S = 256;
  const c = document.createElement("canvas");
  c.width = S;
  c.height = S;
  const g = c.getContext("2d")!;
  g.fillStyle = "#fbf8f1";
  g.fillRect(0, 0, S, S);
  g.fillStyle = "#c2475f";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.font = "700 50px Georgia, serif";
  g.fillText("SAY", S / 2, S / 2 - 30);
  g.fillText("HELLO", S / 2, S / 2 + 28);
  g.strokeStyle = "rgba(194,71,95,0.6)";
  g.lineWidth = 4;
  g.beginPath();
  g.moveTo(S * 0.28, S / 2);
  g.lineTo(S * 0.72, S / 2);
  g.stroke();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** The dial, facing +z, centred on the origin. */
function makeDial(chrome: THREE.Material): THREE.Group {
  const dial = new THREE.Group();
  dial.name = "rotary_dial";

  const plate = new THREE.Mesh(new THREE.CircleGeometry(PLATE_R, 48), new THREE.MeshStandardMaterial({ map: makePlateTexture(), roughness: 0.5 }));
  plate.name = "dial_number_plate";
  plate.position.z = 0.0008;
  dial.add(plate);

  // the clear finger wheel, with a hole over each digit
  const wheelShape = new THREE.Shape().absarc(0, 0, 0.0335, 0, Math.PI * 2, false);
  for (let i = 0; i < 10; i++) {
    const a = holeAngle(i);
    wheelShape.holes.push(new THREE.Path().absarc(Math.cos(a) * HOLE_R, Math.sin(a) * HOLE_R, HOLE_SIZE, 0, Math.PI * 2, true));
  }
  const wheel = new THREE.Mesh(
    new THREE.ExtrudeGeometry(wheelShape, { depth: 0.0018, bevelEnabled: true, bevelThickness: 0.0006, bevelSize: 0.0005, bevelSegments: 2, curveSegments: 24 }),
    new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.12, clearcoat: 1, transparent: true, opacity: 0.38, depthWrite: false }),
  );
  wheel.name = "dial_finger_wheel";
  wheel.position.z = 0.0022;
  wheel.renderOrder = 1;
  dial.add(wheel);

  const hub = new THREE.Mesh(new THREE.TorusGeometry(0.0118, 0.0013, 10, 40), chrome);
  hub.name = "dial_hub";
  hub.position.z = 0.0045;
  dial.add(hub);
  const card = new THREE.Mesh(new THREE.CircleGeometry(0.0115, 40), new THREE.MeshStandardMaterial({ map: makeCardTexture(), roughness: 0.6 }));
  card.name = "dial_label_card";
  card.position.z = 0.0042;
  dial.add(card);

  // the finger stop, a little chrome hook at about four o'clock
  const stop = new THREE.Mesh(new THREE.CapsuleGeometry(0.0013, 0.009, 4, 8), chrome);
  stop.name = "finger_stop";
  const sa = STOP_ANGLE;
  stop.position.set(Math.cos(sa) * 0.03, Math.sin(sa) * 0.03, 0.0052);
  stop.rotation.z = sa - Math.PI / 2; // lies along the radius
  dial.add(stop);
  return dial;
}

/** One cup of the handset: a closed bell, its face at y = 0 (downwards) and its neck at the top. */
function cupGeometry(): THREE.LatheGeometry {
  const pts = [
    [0.0001, 0.0012],
    [0.021, 0.0012],
    [0.024, 0],
    [0.0262, 0.004],
    [0.0252, 0.009],
    [0.0205, 0.016],
    [0.0155, 0.022],
    [0.0148, 0.027],
    [0.0001, 0.027],
  ].map(([r, y]) => new THREE.Vector2(r, y));
  return new THREE.LatheGeometry(pts, 40);
}

/** A coil of cord wound round `path`: `turns` loops of `coil` radius, in wire of radius `wire`. */
function coiledCord(path: THREE.Curve<THREE.Vector3>, turns: number, coil: number, wire: number): THREE.TubeGeometry {
  const steps = turns * 12;
  const frames = path.computeFrenetFrames(steps, false);
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const a = (i / 12) * Math.PI * 2;
    // the coil loosens where the cord leaves the body and the handset, like a real one pulled straight
    const r = coil * Math.min(1, Math.min(t, 1 - t) * 14);
    pts.push(
      path
        .getPointAt(t)
        .addScaledVector(frames.normals[i], Math.cos(a) * r)
        .addScaledVector(frames.binormals[i], Math.sin(a) * r),
    );
  }
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), steps * 2, wire, 5, false);
}

/** Origin at the centre of its base, facing +z. */
export function makeRotaryPhone(): THREE.Group {
  const phone = new THREE.Group();
  phone.name = "rotary_telephone";
  const shell = plastic(new THREE.Color().setRGB(0.9, 0.37, 0.44));
  const chrome = new THREE.MeshStandardMaterial({ color: 0xdfe3e8, roughness: 0.22, metalness: 0.55 });
  const add = <T extends THREE.Object3D>(name: string, obj: T, parent: THREE.Object3D = phone): T => {
    obj.name = name;
    obj.traverse((n) => {
      n.castShadow = true;
      n.receiveShadow = true;
    });
    parent.add(obj);
    return obj;
  };

  add("base_plate", new THREE.Mesh(new RoundedBoxGeometry(0.2, 0.006, 0.224, 2, 0.0025), plastic(0x5b3f45, 0.6))).position.y = 0.003;
  add("body_shell", new THREE.Mesh(bodyGeometry(), shell));

  // Dial: in the middle of the front slope, lifted off it by the bevel.
  const slopeMid = new THREE.Vector2(0.078, 0.042); // (z, y) in the side profile
  const n = new THREE.Vector2(0.056, 0.052).normalize(); // outward normal of the slope
  const dial = add("rotary_dial", makeDial(chrome));
  dial.position.set(0, slopeMid.y + Y0 + n.y * (BEVEL - 0.0005), slopeMid.x + n.x * (BEVEL - 0.0005));
  dial.rotation.x = -Math.atan2(n.y, n.x);
  // a raised pink collar round the dial
  const collar = add("dial_bezel", new THREE.Mesh(new THREE.TorusGeometry(0.0352, 0.0026, 10, 56), shell), dial);
  collar.position.z = 0.001;

  // Cradle: two horns on the back of the top with a low saddle between them.
  const topY = 0.0875 + Y0;
  const cradleZ = -0.022;
  for (const x of [-0.06, 0.06]) {
    add(`cradle_prong_${x < 0 ? "left" : "right"}`, new THREE.Mesh(new RoundedBoxGeometry(0.034, 0.03, 0.05, 3, 0.011), shell)).position.set(x, topY + 0.008, cradleZ);
  }
  add("cradle_saddle", new THREE.Mesh(new RoundedBoxGeometry(0.1, 0.012, 0.03, 3, 0.005), shell)).position.set(0, topY + 0.001, cradleZ);

  // Handset, resting in the cradle: two cups joined by an arched, slightly oval handle.
  const handset = add("handset", new THREE.Group());
  const rimY = topY + 0.019;
  handset.position.set(0, rimY, cradleZ);
  const cup = cupGeometry();
  for (const [x, name] of [
    [-0.066, "mouthpiece_shell"],
    [0.066, "earpiece_shell"],
  ] as const) {
    const c = add(name, new THREE.Mesh(cup, shell), handset);
    c.position.x = x;
    c.rotation.z = x < 0 ? 0.14 : -0.14;
  }
  const handle = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.074, 0.019, 0),
    new THREE.Vector3(-0.058, 0.032, 0),
    new THREE.Vector3(0, 0.037, 0),
    new THREE.Vector3(0.058, 0.032, 0),
    new THREE.Vector3(0.074, 0.019, 0),
  ]);
  const bar = add("handset_bar", new THREE.Mesh(new THREE.TubeGeometry(handle, 40, 0.0105, 16, false), shell), handset);
  bar.scale.z = 1.3;

  // Coiled cord: out of the body's left side, down across the shelf and back up to the mouthpiece.
  const hy = rimY;
  const path = new THREE.CatmullRomCurve3(
    [
      new THREE.Vector3(-0.094, 0.024, -0.07),
      new THREE.Vector3(-0.118, 0.012, -0.06),
      new THREE.Vector3(-0.142, 0.0075, -0.01),
      new THREE.Vector3(-0.132, 0.0075, 0.045),
      new THREE.Vector3(-0.11, 0.03, 0.02),
      new THREE.Vector3(-0.1, 0.075, -0.01),
      new THREE.Vector3(-0.09, hy + 0.012, cradleZ),
    ],
    false,
    "centripetal",
  );
  add("handset_cord", new THREE.Mesh(coiledCord(path, 70, 0.0048, 0.0015), plastic(new THREE.Color().setRGB(0.83, 0.34, 0.41), 0.45)));

  return phone;
}
