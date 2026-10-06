/**
 * The cork board on the wall: a light wooden frame round a cork panel, with a "Kind words" label and a handful of
 * paper notes pinned to it, each carrying a few words from a mentee's review. Built in code like the globe and the
 * chess box. The notes are only legible close up; the Reader (NotesSkin) shows the reviews in full.
 */
import * as THREE from "three";

export interface BoardNote {
  /** A few words from the review, for the paper note. */
  snippet: string;
  /** Who wrote it ("Diogo R."). */
  name: string;
}

const PAPERS = ["#fbf6e9", "#fbeeb0", "#f6d9d2", "#dcebdc", "#e4e6f3", "#fbf6e9"];
const PIN_COLORS = [0xd62300, 0x2f5fa8, 0xe2b13c, 0x3d8a5a, 0xd62300, 0x2f5fa8];

function makeCorkTexture(): THREE.CanvasTexture {
  const W = 512;
  const H = 340;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d")!;
  g.fillStyle = "#b98a5a";
  g.fillRect(0, 0, W, H);
  let seed = 7;
  const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
  // cork: dense flecks of darker and lighter granules
  for (let i = 0; i < 14000; i++) {
    const r = rnd();
    g.fillStyle = r < 0.45 ? "rgba(90,55,25,0.35)" : r < 0.8 ? "rgba(215,170,120,0.35)" : "rgba(60,35,15,0.45)";
    const s = 1 + rnd() * 2.2;
    g.fillRect(rnd() * W, rnd() * H, s, s);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

/** Wraps `text` to `maxWidth`, returning the lines (no more than `maxLines`, the last one ending in "…" if cut). */
function wrap(g: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (g.measureText(next).width > maxWidth && line) {
      lines.push(line);
      line = w;
      if (lines.length === maxLines) break;
    } else line = next;
  }
  if (lines.length < maxLines && line) lines.push(line);
  else if (lines.length === maxLines && line) lines[maxLines - 1] = lines[maxLines - 1].replace(/\W*$/, "…");
  return lines;
}

function makeNoteTexture(note: BoardNote, paper: string): THREE.CanvasTexture {
  const W = 360;
  const H = 260;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d")!;
  g.fillStyle = paper;
  g.fillRect(0, 0, W, H);
  // a faint fold shadow at the bottom edge, as paper curls off a board
  const grad = g.createLinearGradient(0, H * 0.82, 0, H);
  grad.addColorStop(0, "rgba(0,0,0,0)");
  grad.addColorStop(1, "rgba(80,60,40,0.10)");
  g.fillStyle = grad;
  g.fillRect(0, 0, W, H);
  g.fillStyle = "#c2475f";
  g.font = "700 64px Georgia, serif";
  g.fillText("“", 22, 66);
  g.fillStyle = "#3a2a22";
  g.font = "600 29px Karla, 'Helvetica Neue', Arial, sans-serif";
  wrap(g, note.snippet, W - 52, 4).forEach((l, i) => g.fillText(l, 26, 92 + i * 36));
  g.font = "600 21px Georgia, serif";
  g.fillStyle = "#6b5345";
  g.fillText(`— ${note.name}`, 26, H - 22);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function makeLabelTexture(text: string): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 420;
  c.height = 110;
  const g = c.getContext("2d")!;
  g.fillStyle = "#f7f0e2";
  g.fillRect(0, 0, c.width, c.height);
  g.fillStyle = "#2e211c";
  g.font = "600 50px Karla, 'Helvetica Neue', Arial, sans-serif";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText(text, c.width / 2, c.height / 2 + 4);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** A cork board `w` × `h`, centred on its origin, facing +z, its back on z = 0. */
export function makeCorkBoard(w: number, h: number, notes: readonly BoardNote[], label = "Kind words"): THREE.Group {
  const board = new THREE.Group();
  board.name = "mentees_board";
  const shadows = (m: THREE.Mesh, cast = true) => {
    m.castShadow = cast;
    m.receiveShadow = true;
    return m;
  };

  // frame: four light-wood battens round the cork
  const FR = 0.035;
  const D = 0.03;
  const wood = new THREE.MeshStandardMaterial({ color: 0xc8a473, roughness: 0.6 });
  for (const [bw, bh, x, y] of [
    [w, FR, 0, h / 2 - FR / 2],
    [w, FR, 0, -h / 2 + FR / 2],
    [FR, h - FR * 2, -w / 2 + FR / 2, 0],
    [FR, h - FR * 2, w / 2 - FR / 2, 0],
  ] as const) {
    const b = shadows(new THREE.Mesh(new THREE.BoxGeometry(bw, bh, D), wood));
    b.position.set(x, y, D / 2);
    board.add(b);
  }
  const cork = shadows(new THREE.Mesh(new THREE.BoxGeometry(w - FR * 2, h - FR * 2, D * 0.6), new THREE.MeshStandardMaterial({ map: makeCorkTexture(), roughness: 0.95 })));
  cork.position.z = D * 0.3;
  board.add(cork);
  const surface = D * 0.6 + 0.002;

  // the notes, scattered in two loose rows, each a little crooked, pinned at the top
  const cols = Math.ceil(notes.length / 2);
  const noteW = Math.min(0.24, ((w - FR * 2) / cols) * 0.86);
  const noteH = noteW * (260 / 360);
  // room for the notes' centres, less a margin so a tilted corner never crosses the frame
  const innerW = w - FR * 2 - noteW - 0.04;
  const tilts = [-0.07, 0.05, -0.03, 0.08, -0.06, 0.04];
  const pinGeo = new THREE.SphereGeometry(0.011, 14, 10);
  notes.forEach((note, i) => {
    const row = i < cols ? 0 : 1;
    const col = row ? i - cols : i;
    const n = row ? notes.length - cols : cols;
    // the second row is nudged right for a looser look, within the same span so it never runs off the board
    const shift = row ? noteW * 0.18 : 0;
    const x = -innerW / 2 + shift + (n > 1 ? (col / (n - 1)) * (innerW - shift) : (innerW - shift) / 2);
    const y = row ? -h * 0.22 : h * 0.12;
    const paper = shadows(new THREE.Mesh(new THREE.PlaneGeometry(noteW, noteH), new THREE.MeshStandardMaterial({ map: makeNoteTexture(note, PAPERS[i % PAPERS.length]), roughness: 0.9 })));
    paper.position.set(x, y, surface + 0.002 + i * 0.0006);
    paper.rotation.z = tilts[i % tilts.length];
    paper.name = `mentees_note_${i + 1}`;
    board.add(paper);
    const pin = shadows(new THREE.Mesh(pinGeo, new THREE.MeshStandardMaterial({ color: PIN_COLORS[i % PIN_COLORS.length], roughness: 0.35 })));
    const off = new THREE.Vector2(0, noteH / 2 - 0.022).rotateAround(new THREE.Vector2(), paper.rotation.z);
    pin.position.set(x + off.x, y + off.y, surface + 0.012);
    pin.name = `mentees_pin_${i + 1}`;
    board.add(pin);
  });

  // a paper label across the top left
  const lw = Math.min(0.3, w * 0.32);
  const tag = shadows(new THREE.Mesh(new THREE.PlaneGeometry(lw, lw * (110 / 420)), new THREE.MeshStandardMaterial({ map: makeLabelTexture(label), roughness: 0.9 })), false);
  tag.position.set(-w / 2 + FR + lw / 2 + 0.03, h / 2 - FR - lw * 0.17, surface + 0.004);
  tag.rotation.z = 0.02;
  tag.name = "mentees_label";
  board.add(tag);

  return board;
}
