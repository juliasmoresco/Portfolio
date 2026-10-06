/**
 * The diploma tube on the shelf, built in code like the chess box. It replaces bookshelf.glb's stand-in (a plain
 * navy cylinder, one cap, a brass ring and a flat gold disc) in the same spot: a navy leatherette tube with gold
 * foil pinstripes near each end, a rounded cap at top and bottom with a brass band, a raised brass medallion
 * engraved with a laurel and star on the front, and a gold graduation tassel hanging from the top. Every mesh
 * is named `tube_*`, so the scene's "Where I studied" hotspot finds it like the original.
 */
import * as THREE from "three";

const R = 0.035;
const HALF = 0.22;
const CAP_H = 0.034;
const CAP_R = 0.0385;

function makeLeatherTexture(): THREE.CanvasTexture {
  const W = 512;
  const H = 1024;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d")!;
  g.fillStyle = "#213b82";
  g.fillRect(0, 0, W, H);
  // leather grain: soft speckle of lighter and darker flecks
  let seed = 11;
  const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
  for (let i = 0; i < 9000; i++) {
    g.fillStyle = rnd() < 0.5 ? "rgba(255,255,255,0.035)" : "rgba(0,0,0,0.08)";
    g.fillRect(rnd() * W, rnd() * H, 2 + rnd() * 3, 2 + rnd() * 3);
  }
  // gold foil pinstripes, two near each end (v runs bottom to top)
  g.fillStyle = "#c9a45c";
  for (const v of [0.06, 0.085, 0.915, 0.94]) g.fillRect(0, H * (1 - v) - 3, W, 6);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

/** The seal's face: a laurel wreath round a star, engraved into brass. */
function makeCrestTexture(): THREE.CanvasTexture {
  const S = 256;
  const c = document.createElement("canvas");
  c.width = S;
  c.height = S;
  const g = c.getContext("2d")!;
  const grad = g.createRadialGradient(S * 0.4, S * 0.35, 10, S / 2, S / 2, S / 2);
  grad.addColorStop(0, "#f1d493");
  grad.addColorStop(1, "#a8812f");
  g.fillStyle = grad;
  g.fillRect(0, 0, S, S);
  const ink = "rgba(70,45,10,0.75)";
  g.strokeStyle = ink;
  g.fillStyle = ink;
  g.lineWidth = 5;
  // two laurel branches curving up either side
  for (const side of [-1, 1]) {
    g.beginPath();
    g.arc(S / 2, S / 2, S * 0.34, Math.PI / 2 + side * 0.25, Math.PI / 2 + side * 2.5, side < 0);
    g.stroke();
    for (let i = 0; i < 7; i++) {
      const t = Math.PI / 2 + side * (0.45 + i * 0.3);
      const x = S / 2 + Math.cos(t) * S * 0.34;
      const y = S / 2 + Math.sin(t) * S * 0.34;
      g.save();
      g.translate(x, y);
      g.rotate(t + side * 0.9);
      g.beginPath();
      g.ellipse(0, 0, 16, 7, 0, 0, Math.PI * 2);
      g.fill();
      g.restore();
    }
  }
  // five-pointed star in the middle
  g.beginPath();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? S * 0.17 : S * 0.07;
    const t = -Math.PI / 2 + (i * Math.PI) / 5;
    g.lineTo(S / 2 + Math.cos(t) * r, S / 2 + Math.sin(t) * r);
  }
  g.closePath();
  g.fill();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Fine vertical threads for the tassel's fringe. */
function makeThreadTexture(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 128;
  c.height = 32;
  const g = c.getContext("2d")!;
  g.fillStyle = "#c9a14f";
  g.fillRect(0, 0, 128, 32);
  for (let x = 0; x < 128; x += 4) {
    g.fillStyle = x % 8 === 0 ? "rgba(90,60,15,0.45)" : "rgba(255,235,170,0.35)";
    g.fillRect(x, 0, 1.5, 32);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** A cap: a short cylinder with its outer end rounded over, open towards the tube. `dir` 1 = top, -1 = bottom. */
function capGeometry(dir: 1 | -1): THREE.LatheGeometry {
  const pts: THREE.Vector2[] = [new THREE.Vector2(CAP_R, 0)];
  const round = 0.007;
  pts.push(new THREE.Vector2(CAP_R, CAP_H - round));
  for (let i = 1; i <= 6; i++) {
    const a = (i / 6) * (Math.PI / 2);
    pts.push(new THREE.Vector2(CAP_R - round + Math.cos(a) * round, CAP_H - round + Math.sin(a) * round));
  }
  pts.push(new THREE.Vector2(0, CAP_H));
  const geo = new THREE.LatheGeometry(pts, 48);
  if (dir === -1) geo.rotateX(Math.PI);
  return geo;
}

/** Centred on its middle, standing up, the medallion facing +z. */
export function makeDiplomaTube(): THREE.Group {
  const tube = new THREE.Group();
  tube.name = "diploma_tube";
  const navy = new THREE.MeshPhysicalMaterial({ color: 0x1f377a, roughness: 0.55, clearcoat: 0.5, clearcoatRoughness: 0.3 });
  const brass = new THREE.MeshStandardMaterial({ color: 0xc39a48, roughness: 0.32, metalness: 0.65 });
  const add = (name: string, mesh: THREE.Mesh, y = 0, z = 0) => {
    mesh.name = name;
    mesh.position.set(0, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    tube.add(mesh);
    return mesh;
  };

  const bodyLen = HALF * 2 - CAP_H * 1.4;
  add("tube_body", new THREE.Mesh(new THREE.CylinderGeometry(R, R, bodyLen, 48, 1, true), new THREE.MeshStandardMaterial({ map: makeLeatherTexture(), roughness: 0.75 })));

  const capTop = capGeometry(1);
  const capBottom = capGeometry(-1);
  add("tube_cap_top", new THREE.Mesh(capTop, navy), bodyLen / 2 - CAP_H * 0.3);
  add("tube_cap_bottom", new THREE.Mesh(capBottom, navy), -bodyLen / 2 + CAP_H * 0.3);

  // brass bands where each cap meets the tube
  const band = new THREE.TorusGeometry(CAP_R + 0.0005, 0.0022, 8, 48);
  band.rotateX(Math.PI / 2);
  add("tube_band_top", new THREE.Mesh(band, brass), bodyLen / 2 - CAP_H * 0.3 + 0.002);
  add("tube_band_bottom", new THREE.Mesh(band, brass), -bodyLen / 2 + CAP_H * 0.3 - 0.002);

  // medallion: a raised rim round a slightly domed centre, like a stamped seal
  const medal = new THREE.LatheGeometry(
    // outside in, so the faces point out of the tube
    [
      [0.0172, 0],
      [0.0165, 0.0036],
      [0.0135, 0.0036],
      [0.0125, 0.002],
      [0.009, 0.0028],
      [0, 0.0032],
    ].map(([r, h]) => new THREE.Vector2(r, h)),
    40,
  );
  medal.rotateX(Math.PI / 2);
  add("tube_seal", new THREE.Mesh(medal, brass), 0.03, R - 0.0006);
  const crest = add(
    "tube_crest",
    new THREE.Mesh(new THREE.CircleGeometry(0.0118, 32), new THREE.MeshStandardMaterial({ map: makeCrestTexture(), roughness: 0.35, metalness: 0.55 })),
    0.03,
    R + 0.0028,
  );
  crest.castShadow = false;

  // a graduation tassel on a cord, looped round the top band and hanging down the front-right
  const gold = new THREE.MeshStandardMaterial({ color: 0xc9a14f, roughness: 0.7, metalness: 0.2 });
  const capY = bodyLen / 2 - CAP_H * 0.3;
  const a = Math.PI * 0.3; // angle round from +z towards +x
  const sx = Math.sin(a) * (CAP_R + 0.002);
  const sz = Math.cos(a) * (CAP_R + 0.002);
  const cord = new THREE.CatmullRomCurve3([
    new THREE.Vector3(sx * 0.9, capY + 0.004, sz * 0.9),
    new THREE.Vector3(sx * 1.08, capY - 0.02, sz * 1.08),
    new THREE.Vector3(Math.sin(a) * (R + 0.0056), capY - 0.055, Math.cos(a) * (R + 0.0056)),
  ]);
  add("tube_cord", new THREE.Mesh(new THREE.TubeGeometry(cord, 16, 0.0012, 6), gold));
  const knotY = capY - 0.058;
  const knotX = Math.sin(a) * (R + 0.0056);
  const knotZ = Math.cos(a) * (R + 0.0056);
  add("tube_tassel_knot", new THREE.Mesh(new THREE.SphereGeometry(0.0034, 12, 8), gold)).position.set(knotX, knotY, knotZ);
  // the fringe: a slim flared lathe, fuller at the bottom, with fine vertical threads from its texture
  const fringe = new THREE.LatheGeometry(
    [
      [0.0001, 0],
      [0.0048, 0.001],
      [0.0042, 0.012],
      [0.0026, 0.026],
      [0.0001, 0.028],
    ].map(([r, h]) => new THREE.Vector2(r, h)),
    16,
  );
  const threads = add("tube_tassel", new THREE.Mesh(fringe, new THREE.MeshStandardMaterial({ map: makeThreadTexture(), roughness: 0.8, metalness: 0.15 })));
  threads.position.set(knotX, knotY - 0.03, knotZ);

  return tube;
}

/** Swaps bookshelf.glb's diploma tube for this one, in the same place. Does nothing if the model has none. */
export function replaceDiplomaTube(bookshelf: THREE.Object3D): void {
  const old = bookshelf.getObjectByName("diploma_tube");
  const parent = old?.parent;
  if (!old || !parent) return;
  const tube = makeDiplomaTube();
  tube.position.copy(old.position);
  tube.quaternion.copy(old.quaternion);
  parent.add(tube);
  old.traverse((n) => {
    const m = n as THREE.Mesh;
    if (!m.isMesh) return;
    m.geometry.dispose();
    (Array.isArray(m.material) ? m.material : [m.material]).forEach((mat) => mat.dispose());
  });
  parent.remove(old);
}
