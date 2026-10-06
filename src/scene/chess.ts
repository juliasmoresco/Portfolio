/**
 * The chess set on the shelf: a closed wooden chess box standing on its edge, built in code like the globe and
 * llama. It replaces bookshelf.glb's flat stand-in (a plain slab with 32 loose dark tiles) in the same spot:
 * a walnut body and lid with rounded edges and the seam where they meet, an inlaid 8 × 8 board on the lid
 * with a little grain in every square and a brass line round it, two brass hinges and a clasp. Every mesh is
 * named `chess_*`, so the scene's chess hotspot (and its shelf-space check) find it like the original.
 */
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

const W = 0.31;
const H = 0.31;
const T = 0.052;

function varnished(color: number): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({ color, roughness: 0.5, clearcoat: 0.55, clearcoatRoughness: 0.35 });
}

function makeBoardTexture(): THREE.CanvasTexture {
  const S = 1024;
  const c = document.createElement("canvas");
  c.width = S;
  c.height = S;
  const g = c.getContext("2d")!;
  let seed = 64;
  const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;

  const cell = S / 8;
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const light = (row + col) % 2 === 0;
      g.fillStyle = light ? "#d9ba88" : "#4a3222";
      g.fillRect(col * cell, row * cell, cell, cell);
      // grain: a few faint, slightly wavy lines, running the same way in every square like cut veneer
      g.strokeStyle = light ? "rgba(150,105,55,0.22)" : "rgba(20,8,2,0.28)";
      g.lineWidth = 2;
      for (let k = 0; k < 7; k++) {
        const y = row * cell + rnd() * cell;
        g.beginPath();
        g.moveTo(col * cell, y);
        g.bezierCurveTo(col * cell + cell * 0.33, y + (rnd() - 0.5) * 10, col * cell + cell * 0.66, y + (rnd() - 0.5) * 10, (col + 1) * cell, y + (rnd() - 0.5) * 6);
        g.stroke();
      }
    }
  }
  // thin dark joints between squares, as inlay has
  g.strokeStyle = "rgba(30,15,5,0.35)";
  g.lineWidth = 2;
  for (let i = 1; i < 8; i++) {
    g.beginPath();
    g.moveTo(i * cell, 0);
    g.lineTo(i * cell, S);
    g.moveTo(0, i * cell);
    g.lineTo(S, i * cell);
    g.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

/** Origin at the centre of its base, standing up, the board facing +z. */
export function makeClosedChessBox(): THREE.Group {
  const box = new THREE.Group();
  box.name = "chess_set";
  const walnut = varnished(0x4e301c);
  const brass = new THREE.MeshStandardMaterial({ color: 0xb08a3e, roughness: 0.35, metalness: 0.8 });

  const add = (name: string, mesh: THREE.Mesh) => {
    mesh.name = name;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    box.add(mesh);
    return mesh;
  };

  // Body (back ~60%) and lid (front ~36%), with a hairline of shadow between them all round.
  const bodyT = T * 0.6;
  const lidT = T * 0.37;
  const seamZ = -T / 2 + bodyT + 0.0015;
  add("chess_box", new THREE.Mesh(new RoundedBoxGeometry(W, H, bodyT, 3, 0.005), walnut)).position.set(0, H / 2, -T / 2 + bodyT / 2);
  add("chess_lid", new THREE.Mesh(new RoundedBoxGeometry(W, H, lidT, 3, 0.005), walnut)).position.set(0, H / 2, T / 2 - lidT / 2);

  // The board, inlaid in the lid with a walnut border and a brass line round it.
  const border = 0.016;
  const inlay = add("chess_inlay", new THREE.Mesh(new THREE.PlaneGeometry(W - border * 2 + 0.006, H - border * 2 + 0.006), brass));
  inlay.position.set(0, H / 2, T / 2 + 0.0004);
  inlay.castShadow = false;
  const face = add("chess_face", new THREE.Mesh(new THREE.PlaneGeometry(W - border * 2, H - border * 2), new THREE.MeshPhysicalMaterial({ map: makeBoardTexture(), roughness: 0.45, clearcoat: 0.6, clearcoatRoughness: 0.3 })));
  face.position.set(0, H / 2, T / 2 + 0.0008);
  face.castShadow = false;

  // Two hinges down the left side at the seam, a clasp on the right.
  const hingeGeo = new THREE.CylinderGeometry(0.0045, 0.0045, 0.034, 12);
  for (const y of [H * 0.22, H * 0.78]) {
    add(`chess_hinge_${y < H / 2 ? "low" : "high"}`, new THREE.Mesh(hingeGeo, brass)).position.set(-W / 2 - 0.0015, y, seamZ);
  }
  add("chess_clasp", new THREE.Mesh(new RoundedBoxGeometry(0.008, 0.026, 0.014, 2, 0.002), brass)).position.set(W / 2 + 0.002, H / 2, seamZ);

  return box;
}

/**
 * Swaps bookshelf.glb's chess stand-in for the closed box: same shelf, same spot and angle, base on the board.
 * Does nothing if the model has no `chess_case`.
 */
export function replaceChessSet(bookshelf: THREE.Object3D): void {
  const old = bookshelf.getObjectByName("chess_case") as THREE.Mesh | undefined;
  const parent = old?.parent;
  if (!old || !parent) return;
  old.geometry.computeBoundingBox();
  const bottom = old.geometry.boundingBox!.min.y;

  const set = makeClosedChessBox();
  set.position.copy(old.position).setY(old.position.y + bottom);
  set.quaternion.copy(old.quaternion);
  parent.add(set);

  for (const name of ["chess_case", "chess_squares", "chess_case_spine"]) {
    const o = bookshelf.getObjectByName(name);
    if (!o) continue;
    o.traverse((n) => {
      const m = n as THREE.Mesh;
      if (!m.isMesh) return;
      m.geometry.dispose();
      (Array.isArray(m.material) ? m.material : [m.material]).forEach((mat) => mat.dispose());
    });
    o.parent?.remove(o);
  }
}
