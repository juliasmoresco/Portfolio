/**
 * The Awwwards Honorable Mention, as a small award on the shelf, built in code like the globe: Awwwards' "W." cut
 * from gold and standing on a low black base, with a brass plate on the base's front ("Honorable Mention"). The
 * letter's outline is the one in Awwwards' own ribbon. Facing +z, resting on y = 0. Every mesh is named `award_*`
 * and has its own material, since the scene clones each hotspot mesh's material to light it on hover.
 */
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

const gold = () => new THREE.MeshStandardMaterial({ color: 0xe2b652, roughness: 0.26, metalness: 0.55 });
const lacquer = () => new THREE.MeshStandardMaterial({ color: 0x15130f, roughness: 0.38, metalness: 0.1 });

/** The W's outline from the ribbon's SVG (y down there), and the dot's centre and radius. */
const W_OUTLINE: [number, number][] = [
  [35.481, 16.926], [30.699, 31.895], [27.433, 31.895], [24.849, 22.213], [22.265, 31.895], [18.997, 31.895],
  [14.216, 16.926], [17.929, 16.926], [20.602, 27.202], [23.126, 16.926], [26.571, 16.926], [29.095, 27.202], [31.769, 16.926],
];
const DOT = { x: 37.979, y: 29.578, r: 2.495 };
const SVG_LEFT = 14.216;
const SVG_BASE = 31.895;

/** The plate's face: the award's name engraved dark into brass. */
function makePlateTexture(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 1024;
  c.height = 160;
  const g = c.getContext("2d")!;
  const grad = g.createLinearGradient(0, 0, 0, c.height);
  grad.addColorStop(0, "#e6c475");
  grad.addColorStop(1, "#b88c3a");
  g.fillStyle = grad;
  g.fillRect(0, 0, c.width, c.height);
  g.strokeStyle = "#7a5a22";
  g.lineWidth = 6;
  g.strokeRect(12, 12, c.width - 24, c.height - 24);
  g.fillStyle = "#2a1f10";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.font = "600 64px 'Work Sans', Helvetica, Arial, sans-serif";
  g.fillText("HONORABLE  MENTION", c.width / 2, c.height / 2 + 2);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

export function makeTrophy(): THREE.Group {
  const trophy = new THREE.Group();
  trophy.name = "award";
  const add = (name: string, mesh: THREE.Mesh) => {
    mesh.name = `award_${name}`;
    trophy.add(mesh);
    return mesh;
  };

  // low base, with the plate across its front
  const baseW = 0.34;
  const baseH = 0.05;
  const baseD = 0.12;
  add("base", new THREE.Mesh(new RoundedBoxGeometry(baseW, baseH, baseD, 2, 0.006), lacquer())).position.y = baseH / 2;
  const plate = add("plate", new THREE.Mesh(new THREE.PlaneGeometry(0.24, 0.0375), new THREE.MeshStandardMaterial({ map: makePlateTexture(), roughness: 0.35, metalness: 0.45 })));
  plate.position.set(0, baseH / 2, baseD / 2 + 0.0004);

  // the "W." standing on the base, centred on it, its letters extruded front to back
  const k = 0.28 / (DOT.x + DOT.r - SVG_LEFT);
  const at = (x: number, y: number) => new THREE.Vector2((x - SVG_LEFT) * k, (SVG_BASE - y) * k);
  const depth = 0.05;
  const bevel = { bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.0025, bevelSegments: 3, curveSegments: 32 };
  // ExtrudeGeometry wants the outline counter-clockwise; the SVG's runs clockwise once y is flipped
  const letter = new THREE.ExtrudeGeometry(new THREE.Shape(W_OUTLINE.map(([x, y]) => at(x, y)).reverse()), { depth, ...bevel });
  const dotShape = new THREE.Shape();
  const dc = at(DOT.x, DOT.y);
  dotShape.absarc(dc.x, dc.y, DOT.r * k, 0, Math.PI * 2, false);
  const dot = new THREE.ExtrudeGeometry(dotShape, { depth, ...bevel });
  const width = (DOT.x + DOT.r - SVG_LEFT) * k;
  for (const [name, geo] of [["w", letter], ["dot", dot]] as const) {
    geo.translate(-width / 2, baseH + bevel.bevelSize, -depth / 2);
    add(name, new THREE.Mesh(geo, gold()));
  }
  return trophy;
}
