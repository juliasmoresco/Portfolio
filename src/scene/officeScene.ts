/**
 * Port of the handoff's `office-scene.js` (a framework-free custom element)
 * to a plain class that a component can own: `new OfficeScene(container, opts)`,
 * `start()`, `update()`, `dispose()`.
 *
 * Scene contents, layout maths, lighting presets, camera framing, raycasting and
 * touch controls are carried over unchanged. What differs from the prototype is
 * only what a component lifecycle needs:
 *   - options instead of attributes; `update()` instead of attributeChangedCallback
 *   - `dispose()` releases the renderer, GL context, geometries, textures, listeners
 *   - `start()` bails out cleanly if `dispose()` ran while assets were loading
 *   - all GLBs are requested in parallel instead of one after another
 *   - optional props (llama, phone) warn instead of failing silently
 *   - `reducedMotion` switches off pointer drift and auto-pan
 *
 * Talks to the page only through the `shelf:*` window events in `./events`.
 */
import * as THREE from "three";
import { GLTFLoader, type GLTF } from "three/addons/loaders/GLTFLoader.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { emitHover, emitReady, emitSelect } from "./events";
import { makeGlobe } from "./globe";
import { MOON_LAMP_ID, MOON_LAMP_LABEL, type Daylight, type SceneHotspotId, type WallTone } from "./hotspots";

const HOVER_EMISSIVE = 0x8a5a12;

/** Hotspots that are books on the shelf: hovering one slides a book out toward the viewer, like pulling it off. */
const BOOK_IDS: readonly string[] = ["about", "case1", "case2", "case3", "case4", "case5", "resume"];
/** Of those, the ones that take their entry's `spine` colour. */
const TINTED_IDS: readonly string[] = ["about", "case1", "case2", "case3", "case4", "case5"];
/** How far a hovered book slides out (scene units; the bookcase is 3 tall). */
const PULL_DISTANCE = 0.09;

/**
 * Bookcase compartments filled with decorative books that are hotspots, by compartment key
 * (column letter + board index, bottom = 0). To move one to a different shelf, change the key;
 * every decorative book in that compartment becomes the hotspot, like a case's shelf.
 */
const FILLER_HOTSPOTS: Record<string, { compartment: string; label: string }> = {
  /** Top compartment of column A, directly under the moon lamp. */
  resume: { compartment: "a2", label: "Résumé" },
};

export interface OfficeSceneAssets {
  /** bookshelf.glb */
  src: string;
  /** wall-shelf-plant.glb */
  shelf: string;
  llama: string;
  phone: string;
  /** cat-talking-button.glb: the owner's own cat, sitting on the floor beside the bookcase. */
  cat: string;
}

export type SceneView = "wide" | `col${number}`;

export interface OfficeSceneOptions {
  assets: OfficeSceneAssets;
  daylight: Daylight;
  walltone: WallTone;
  /** Pulse every hotspot (the mobile "Hints" toggle). */
  hints: boolean;
  view: SceneView;
  /** "off" kills the pointer drift (touch layouts). */
  parallax: "on" | "off";
  autopan: boolean;
  /** "low" caps DPR at 1.5, disables MSAA and halves the shadow map. Read once at start. */
  quality: "default" | "low";
  /** "confirm": first tap arms an object (hover only), second tap selects it. Read once at start. */
  tap: "direct" | "confirm";
  /** One-finger pan and two-finger pinch. Read once at start. */
  touchControls: boolean;
  /** `prefers-reduced-motion`: no pointer drift, no auto-pan. */
  reducedMotion: boolean;
  /** Overrides the built-in hover label per hotspot id (the page feeds these from content). */
  labels: Readonly<Record<string, string>>;
  /** #RRGGBB per hotspot id (from content): tints that entry's books on the shelf. Read once at start. */
  spines: Readonly<Record<string, string>>;
}

export const DEFAULT_OPTIONS: Omit<OfficeSceneOptions, "assets"> = {
  daylight: "afternoon",
  walltone: "graphite",
  hints: false,
  view: "wide",
  parallax: "on",
  autopan: false,
  quality: "default",
  tap: "direct",
  touchControls: false,
  reducedMotion: false,
  labels: {},
  spines: {},
};

interface HotspotGroup {
  label: string;
  meshes: THREE.Mesh[];
}

interface Column {
  L: string;
  box: THREE.Box3;
  cx: number;
}

interface LightRig {
  hemi: THREE.HemisphereLight;
  amb: THREE.AmbientLight;
  key: THREE.DirectionalLight;
  fill: THREE.DirectionalLight;
  rim: THREE.DirectionalLight;
}

type Standard = THREE.MeshStandardMaterial;

const LIGHT_PRESETS: Record<
  Daylight,
  {
    exp: number;
    key: [number, number, number, number, number];
    fill: [number, number];
    rim: [number, number];
    hemi: [number, number, number];
    amb: [number, number];
  }
> = {
  afternoon: { exp: 1.22, key: [0xffd7a4, 2.2, -4.4, 3.9, 4.0], fill: [0xc8d8e2, 0.5], rim: [0xffc48c, 0.4], hemi: [0xffeedd, 0x5a564e, 1.05], amb: [0xffe4c4, 0.32] },
  "golden hour": { exp: 1.34, key: [0xff9f4d, 2.8, -6.2, 1.9, 3.0], fill: [0x8fb4cc, 0.36], rim: [0xff8a3c, 0.85], hemi: [0xffd9a8, 0x4a3a2c, 0.8], amb: [0xffc98a, 0.28] },
  overcast: { exp: 1.1, key: [0xf2f4f6, 1.5, -2.4, 4.6, 4.2], fill: [0xdfe6ea, 0.7], rim: [0xe8eef2, 0.3], hemi: [0xf4f6f8, 0x55534f, 1.15], amb: [0xeef1f3, 0.34] },
  "evening lamp": { exp: 1.12, key: [0xffb862, 1.4, -1.2, 3.4, 2.6], fill: [0x5a6f8c, 0.26], rim: [0xffa64d, 1.1], hemi: [0x6a5f52, 0x2a2622, 0.5], amb: [0xffb870, 0.22] },
};

const WALL_TONES: Record<WallTone, number> = {
  graphite: 0x4b4a47,
  greige: 0x8d8579,
  clay: 0x93604c,
  olive: 0x5c6149,
  plaster: 0xd8cfbe,
};

const POSTER_LABELS: Record<string, string> = {
  ill01: "Illustration 01",
  ill02: "Illustration 02",
  ill03: "Illustration 03",
  ill04: "Illustration 04",
  ill05: "Illustration 05",
  ill06: "Illustration 06",
};

function makePlaceholderTexture(tint: string): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 300;
  c.height = 380;
  const g = c.getContext("2d")!;
  g.fillStyle = "#e9e2d6";
  g.fillRect(0, 0, c.width, c.height);
  g.strokeStyle = tint;
  g.lineWidth = 13;
  g.globalAlpha = 0.92;
  for (let i = -c.height; i < c.width; i += 22) {
    g.beginPath();
    g.moveTo(i, 0);
    g.lineTo(i + c.height, c.height);
    g.stroke();
  }
  g.globalAlpha = 1;
  g.fillStyle = "#e9e2d6";
  g.fillRect(0, c.height - 74, c.width, 74);
  g.fillStyle = "#4a443c";
  g.font = "500 30px ui-monospace, Menlo, monospace";
  g.textAlign = "center";
  g.fillText("illustration", c.width / 2, c.height - 30);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function makeWoodTexture(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 512;
  const g = c.getContext("2d")!;
  g.fillStyle = "#8a5a33";
  g.fillRect(0, 0, 512, 512);
  const plankH = 512 / 4;
  for (let i = 0; i < 4; i++) {
    const y = i * plankH;
    const tone = ["#8f5f36", "#815330", "#946438", "#7c4f2e"][i % 4];
    g.fillStyle = tone;
    g.fillRect(0, y, 512, plankH);
    for (let k = 0; k < 26; k++) {
      g.strokeStyle = "rgba(60,36,18," + (0.05 + Math.random() * 0.08).toFixed(3) + ")";
      g.lineWidth = 0.6 + Math.random() * 1.6;
      g.beginPath();
      const gy = y + Math.random() * plankH;
      g.moveTo(0, gy);
      g.bezierCurveTo(170, gy + (Math.random() - 0.5) * 9, 340, gy + (Math.random() - 0.5) * 9, 512, gy + (Math.random() - 0.5) * 5);
      g.stroke();
    }
    g.fillStyle = "rgba(40,22,10,0.55)";
    g.fillRect(0, y, 512, 1.6);
    const seam = Math.floor(Math.random() * 3 + 1) * 128;
    g.fillRect(seam, y, 1.6, plankH);
  }
  return new THREE.CanvasTexture(c);
}

/** World-space box of every visible mesh under `root`. */
function meshBox(root: THREE.Object3D): THREE.Box3 {
  root.updateWorldMatrix(true, true);
  const bb = new THREE.Box3();
  root.traverse((o) => {
    if ((o as THREE.Mesh).isMesh && o.visible) bb.expandByObject(o);
  });
  return bb;
}

/** Nudge `obj` until its bounding box is centred on (tx, tz) and rests on ty. */
function settleOn(obj: THREE.Object3D, tx: number, ty: number, tz: number): void {
  for (let i = 0; i < 4; i++) {
    obj.updateWorldMatrix(true, true);
    const b = meshBox(obj);
    obj.position.x += tx - (b.min.x + b.max.x) / 2;
    obj.position.y += ty - b.min.y;
    obj.position.z += tz - (b.min.z + b.max.z) / 2;
  }
}

function collectMeshes(root: THREE.Object3D): THREE.Mesh[] {
  const out: THREE.Mesh[] = [];
  root.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) out.push(o as THREE.Mesh);
  });
  return out;
}

function enableShadows(root: THREE.Object3D): void {
  root.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
}

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

export class OfficeScene {
  private readonly container: HTMLElement;
  private opts: OfficeSceneOptions;

  private disposed = false;
  private started = false;
  private raf = 0;
  private ro: ResizeObserver | null = null;
  private cleanups: Array<() => void> = [];

  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private lights!: LightRig;
  private wallMat!: THREE.MeshStandardMaterial;
  private lampMat: Standard | null = null;
  private lampLight: THREE.PointLight | null = null;

  private groups: Record<string, HotspotGroup> = {};
  private cols: Column[] = [];

  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2(-2, -2);
  private mouseN = new THREE.Vector2(0, 0);
  private hovered: string | null = null;
  private pull = new Map<THREE.Mesh, { k: number; base: THREE.Vector3; dir: THREE.Vector3 }>();
  private pullMesh: THREE.Mesh | null = null;
  private lastHitMesh: THREE.Mesh | null = null;
  private heroes = new Map<string, THREE.Mesh>();
  private armed: string | null = null;

  private target = new THREE.Vector3();
  private tGoal: THREE.Vector3 | null = null;
  private camBase = new THREE.Vector3();
  private zHome = 9.2;
  private currentView: SceneView = "wide";

  private hintsOn = false;
  private hintMeshes: THREE.Mesh[] = [];
  private dragged = false;
  private touchOn = false;
  /** True once the user has panned or pinched since the last framing; resize must not undo that. */
  private userMoved = false;
  private framedPortrait: boolean | null = null;

  constructor(container: HTMLElement, options: OfficeSceneOptions) {
    this.container = container;
    this.opts = { ...options };
  }

  /** Resolves once the model, props and hotspots are built and `shelf:ready` has fired. */
  async start(): Promise<void> {
    if (this.started || this.disposed) return;
    this.started = true;

    const o = this.opts;
    const lowq = o.quality === "low";
    const a = o.assets;

    // Kick every download off up front. Optional props degrade to null.
    const loader = new GLTFLoader();
    const optional = (url: string, what: string) =>
      loader.loadAsync(url).catch((e: unknown) => {
        console.warn(`[office-scene] could not load ${what}; continuing without it`, e);
        return null;
      });
    const pRequired = Promise.all([loader.loadAsync(a.src), loader.loadAsync(a.shelf)]);
    const pLlama = optional(a.llama, "the llama bank");
    const pPhone = optional(a.phone, "the rotary phone");
    const pCat = optional(a.cat, "Zuko");

    const renderer = new THREE.WebGLRenderer({ antialias: !lowq, alpha: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, lowq ? 1.5 : 2));
    renderer.shadowMap.enabled = true;
    // Variance shadow maps blur smoothly (PCF at a wide radius turns noisy inside the shelf compartments).
    renderer.shadowMap.type = THREE.VSMShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.22;
    renderer.domElement.style.cssText = "display:block;width:100%;height:100%";
    this.container.appendChild(renderer.domElement);
    this.renderer = renderer;

    const scene = new THREE.Scene();
    this.scene = scene;
    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
    this.camera = camera;

    const hemi = new THREE.HemisphereLight(0xffeedd, 0x5a564e, 1.05);
    const amb = new THREE.AmbientLight(0xffe4c4, 0.32);
    scene.add(hemi, amb);
    const key = new THREE.DirectionalLight(0xffd7a4, 2.2);
    key.position.set(-4.4, 3.9, 4.0);
    key.castShadow = true;
    key.shadow.mapSize.set(lowq ? 1024 : 2048, lowq ? 1024 : 2048);
    key.shadow.radius = 5;
    key.shadow.blurSamples = lowq ? 8 : 16;
    key.shadow.bias = -0.0004;
    key.shadow.normalBias = 0.03;
    key.shadow.camera.left = -3.2;
    key.shadow.camera.right = 3.8;
    key.shadow.camera.top = 4.2;
    key.shadow.camera.bottom = -1.2;
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xc8d8e2, 0.42);
    fill.position.set(4.2, 1.4, 2.6);
    scene.add(fill);
    const rim = new THREE.DirectionalLight(0xffc48c, 0.4);
    rim.position.set(2.2, 1.8, -3);
    scene.add(rim);
    this.lights = { hemi, amb, key, fill, rim };

    let bookshelfGltf: GLTF;
    let wallShelfGltf: GLTF;
    try {
      [bookshelfGltf, wallShelfGltf] = await pRequired;
    } catch (e) {
      if (this.disposed) return;
      throw e;
    }
    const [llamaGltf, phoneGltf, catGltf] = await Promise.all([pLlama, pPhone, pCat]);
    // Everything below is synchronous, so a dispose() during loading is the only race.
    if (this.disposed) return;

    const model = bookshelfGltf.scene;
    enableShadows(model);

    const box = new THREE.Box3().setFromObject(model);
    const size = new THREE.Vector3();
    box.getSize(size);
    const center = new THREE.Vector3();
    box.getCenter(center);
    const s = 3.0 / size.y;
    model.scale.setScalar(s);
    model.position.set(-center.x * s, -box.min.y * s, -center.z * s);

    const root = new THREE.Group();
    root.add(model);
    root.position.x = 2.6;
    scene.add(root);

    const shelfBox = new THREE.Box3().setFromObject(model);

    const wallMat = new THREE.MeshStandardMaterial({ color: 0x4b4a47, roughness: 0.97 });
    // The wall stops at floor level: below it, variance shadow maps let the floor shade whatever wall is left showing.
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(26, 11), wallMat);
    wall.position.set(0, 5.5, shelfBox.min.z - 0.12);
    wall.receiveShadow = true;
    scene.add(wall);
    this.wallMat = wallMat;
    // Whatever shows below the floor's front edge (portrait framing) is plain dark, unlit, so it never picks up shadows.
    const below = new THREE.Mesh(new THREE.PlaneGeometry(26, 6), new THREE.MeshBasicMaterial({ color: 0x1f1d1b }));
    below.position.set(0, -3, wall.position.z);
    scene.add(below);

    const floorTex = makeWoodTexture();
    floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping;
    floorTex.repeat.set(7, 5);
    floorTex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(26, 14),
      new THREE.MeshStandardMaterial({ map: floorTex, color: 0x8f8a82, roughness: 0.68, metalness: 0.02 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, 0.001, shelfBox.min.z + 3);
    floor.receiveShadow = true;
    scene.add(floor);

    const baseboard = new THREE.Mesh(
      new THREE.BoxGeometry(26, 0.16, 0.06),
      new THREE.MeshStandardMaterial({ color: 0x8a8478, roughness: 0.6 }),
    );
    baseboard.position.set(0, 0.08, wall.position.z + 0.04);
    baseboard.castShadow = true;
    baseboard.receiveShadow = true;
    scene.add(baseboard);

    const posters = new THREE.Group();
    posters.name = "posters";
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x2f2b27, roughness: 0.55 });
    const mountMat = new THREE.MeshStandardMaterial({ color: 0xf4efe4, roughness: 0.9 });
    const WALL_Z = wall.position.z;

    // unframed prints taped flat to the wall
    const mkPrint = (w: number, h: number, x: number, y: number, tint: string, id: string) => {
      const g = new THREE.Group();
      const paper = new THREE.Mesh(
        new THREE.BoxGeometry(w, h, 0.008),
        new THREE.MeshStandardMaterial({ map: makePlaceholderTexture(tint), roughness: 0.92 }),
      );
      paper.castShadow = true;
      paper.receiveShadow = true;
      g.add(paper);
      g.position.set(x, y, WALL_Z + 0.012);
      g.name = id;
      g.userData.posterId = id;
      return g;
    };

    // framed pieces leaning on the wall shelf
    const mkLeaner = (w: number, h: number, x: number, y: number, z: number, tint: string, id: string) => {
      const g = new THREE.Group();
      const f = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.03), frameMat);
      f.castShadow = true;
      f.receiveShadow = true;
      const mount = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.035, h - 0.035), mountMat);
      mount.position.z = 0.02;
      const art = new THREE.Mesh(
        new THREE.PlaneGeometry(w - 0.1, h - 0.12),
        new THREE.MeshStandardMaterial({ map: makePlaceholderTexture(tint), roughness: 0.88 }),
      );
      art.position.z = 0.022;
      g.add(f, mount, art);
      g.position.set(x, y, z);
      g.rotation.x = -0.075;
      g.name = id;
      g.userData.posterId = id;
      return g;
    };

    const SHELF_Y = 2.6;
    posters.add(mkPrint(0.44, 0.58, -1.42, 1.76, "#c08878", "ill01"));
    posters.add(mkPrint(0.38, 0.5, -0.82, 1.64, "#7fa39c", "ill02"));
    posters.add(mkPrint(0.42, 0.56, -0.26, 1.78, "#c8a86a", "ill03"));
    posters.add(mkPrint(0.36, 0.48, 0.28, 1.62, "#9a8fae", "ill04"));
    posters.add(mkLeaner(0.4, 0.52, -0.62, SHELF_Y + 0.3, WALL_Z + 0.15, "#b8746a", "ill05"));
    posters.add(mkLeaner(0.34, 0.44, -0.12, SHELF_Y + 0.26, WALL_Z + 0.15, "#6f9f9a", "ill06"));
    scene.add(posters);

    // wall shelf + trailing plant (GLB)
    const wallShelf = new THREE.Group();
    const wsInner = wallShelfGltf.scene;
    enableShadows(wsInner);
    wallShelf.add(wsInner);

    // make the plank one continuous solid board and drop the separate cleat
    const cleat = wsInner.getObjectByName("wall_cleat");
    if (cleat) cleat.visible = false;
    const plankMesh = wsInner.getObjectByName("shelf_body");
    if (plankMesh) {
      plankMesh.scale.z = 2.05;
      plankMesh.position.z += 0.1175 * (2.05 - 1) * 0.5;
    }
    // sit the plant on top of the board, forward enough for the vines to fall over the front edge
    ["planter", "plant"].forEach((n) => {
      const obj = wsInner.getObjectByName(n);
      if (obj) obj.position.z += 0.16;
    });

    const plankNode = wsInner.getObjectByName("shelf_body") || wsInner;
    const plankBox = new THREE.Box3().setFromObject(plankNode);
    const plankW = plankBox.max.x - plankBox.min.x;
    wallShelf.scale.setScalar(2.45 / plankW);

    scene.add(wallShelf);
    for (let i = 0; i < 3; i++) {
      wallShelf.updateWorldMatrix(true, true);
      const pb = new THREE.Box3().setFromObject(plankNode);
      wallShelf.position.x += -1.86 - pb.min.x;
      wallShelf.position.y += SHELF_Y - pb.max.y;
      wallShelf.position.z += WALL_Z + 0.07 - pb.min.z;
    }

    // Named bookcase parts, and a helper for a compartment's boards sorted bottom to top.
    const named: Record<string, THREE.Mesh> = {};
    model.traverse((n) => {
      if ((n as THREE.Mesh).isMesh && n.name) named[n.name] = n as THREE.Mesh;
    });
    const bx = (n: string) => (named[n] ? meshBox(named[n]) : null);
    const compartment = (L: string) => ({
      sl: bx("side_left_" + L),
      sr: bx("side_right_" + L),
      boards: ["bottom_" + L, "shelf_" + L + "1", "shelf_" + L + "2", "shelf_" + L + "3", "top_" + L]
        .map(bx)
        .filter((b): b is THREE.Box3 => !!b)
        .sort((p, q) => p.min.y - q.min.y),
    });

    // llama bank — sits on a real shelf board next to the About books
    let llama: THREE.Object3D | null = null;
    if (llamaGltf) {
      const obj = llamaGltf.scene;
      try {
        enableShadows(obj);
        scene.add(obj);

        // empty, eye-level compartment: column B, board above the books
        const { sl, sr, boards } = compartment("b");
        const board = boards[2] || boards[boards.length - 2] || boards[0];
        const ceil = boards[boards.indexOf(board) + 1] || board;
        const gap = Math.max(ceil.min.y - board.max.y, 0.2);

        const lb0 = meshBox(obj);
        const h0 = Math.max(lb0.max.y - lb0.min.y, 1e-4);
        obj.scale.setScalar((gap * 0.72) / h0);

        const targetX = sl && sr ? (sl.max.x + sr.min.x) / 2 : 2.27;
        const targetZ = board.max.z - (board.max.z - board.min.z) * 0.38;
        settleOn(obj, targetX, board.max.y, targetZ);
        obj.rotation.y = -0.25;
        obj.updateWorldMatrix(true, true);
        llama = obj;
      } catch (e) {
        console.warn("[office-scene] could not place the llama bank", e);
        scene.remove(obj);
      }
    }

    // rotary phone (GLB) — empty compartment, top of the right-hand column
    let phoneMeshes: THREE.Mesh[] = [];
    if (phoneGltf) {
      const phone = phoneGltf.scene;
      try {
        enableShadows(phone);
        scene.add(phone);

        const { sl, sr, boards } = compartment("d");
        const bd = boards[3] || boards[boards.length - 2] || boards[0];
        const cl = boards[boards.indexOf(bd) + 1] || bd;
        const gap = Math.max(cl.min.y - bd.max.y, 0.2);
        const slot = sl && sr ? sr.min.x - sl.max.x : 0.5;

        const b0 = meshBox(phone);
        const sx = b0.max.x - b0.min.x || 1e-4;
        const sy = b0.max.y - b0.min.y || 1e-4;
        const sz = b0.max.z - b0.min.z || 1e-4;
        phone.scale.setScalar(Math.min((gap * 0.52) / sy, (slot * 0.68) / sx, (gap * 0.8) / sz));

        const targetX = sl && sr ? (sl.max.x + sr.min.x) / 2 : 3.5;
        const targetZ = bd.max.z - (bd.max.z - bd.min.z) * 0.42;
        settleOn(phone, targetX, bd.max.y, targetZ);
        phone.rotation.y = -0.42;
        phone.updateWorldMatrix(true, true);
        phoneMeshes = collectMeshes(phone);
      } catch (e) {
        console.warn("[office-scene] could not place the rotary phone", e);
        scene.remove(phone);
        phoneMeshes = [];
      }
    }

    // Zuko (GLB, the owner's own cat) — sitting on the floor, just in front of the bookcase's left edge
    let catMeshes: THREE.Mesh[] = [];
    if (catGltf) {
      const cat = catGltf.scene;
      try {
        enableShadows(cat);
        scene.add(cat);

        // meshBox (unlike shelfBox above) updates parent transforms too, so this is the true world box.
        const shelfWorld = meshBox(model);
        const b0 = meshBox(cat);
        const h0 = Math.max(b0.max.y - b0.min.y, 1e-4);
        // Scaled up from a true-to-life ratio so he still reads clearly at normal viewing size.
        cat.scale.setScalar(((shelfWorld.max.y - shelfWorld.min.y) * 0.22) / h0);

        const targetX = shelfWorld.min.x - 0.5;
        const targetZ = shelfWorld.max.z + 0.24;
        settleOn(cat, targetX, 0, targetZ);
        // The model already exports facing forward (nose and button both point toward the camera at
        // rotation 0), square to the room like the bookcase — so no added turn, unlike the llama/phone.

        // A few whiskers read stiff and oversized up close; a modest, centred shrink softens them
        // without needing new geometry. His markings and proportions are his own and untouched.
        const WHISKERS = ["whisker_0_0", "whisker_0_1", "whisker_1_0", "whisker_1_1", "whisker_2_0", "whisker_2_1", "whisker_3_0", "whisker_3_1"];
        const BROW_WHISKERS = ["brow_whisker_0_0", "brow_whisker_1_0", "brow_whisker_0_1", "brow_whisker_1_1"];
        WHISKERS.forEach((n) => cat.getObjectByName(n)?.scale.setScalar(0.78));
        BROW_WHISKERS.forEach((n) => cat.getObjectByName(n)?.scale.setScalar(0.5));
        cat.getObjectByName("chin")?.scale.setScalar(0.85);

        cat.updateWorldMatrix(true, true);
        catMeshes = collectMeshes(cat);
      } catch (e) {
        console.warn("[office-scene] could not place Zuko", e);
        scene.remove(cat);
        catMeshes = [];
      }
    }

    // desk globe (built in code, see ./globe) — middle compartment of column C
    let globeObj: THREE.Object3D | null = null;
    let globeMeshes: THREE.Mesh[] = [];
    {
      const obj = makeGlobe();
      try {
        enableShadows(obj);
        scene.add(obj);

        const { sl, sr, boards } = compartment("c");
        const gbd = boards[1] || boards[0];
        const gcl = boards[boards.indexOf(gbd) + 1] || gbd;
        const ggap = Math.max(gcl.min.y - gbd.max.y, 0.2);
        const gslot = sl && sr ? sr.min.x - sl.max.x : 0.5;

        const gb0 = meshBox(obj);
        const gsx = gb0.max.x - gb0.min.x || 1e-4;
        const gsy = gb0.max.y - gb0.min.y || 1e-4;
        obj.scale.setScalar(Math.min((ggap * 0.72) / gsy, (gslot * 0.6) / gsx));

        const gtx = sl && sr ? (sl.max.x + sr.min.x) / 2 : 2.88;
        const gtz = gbd.max.z - (gbd.max.z - gbd.min.z) * 0.42;
        settleOn(obj, gtx, gbd.max.y, gtz);
        obj.rotation.y = -0.5;
        obj.updateWorldMatrix(true, true);
        globeObj = obj;
        globeMeshes = collectMeshes(obj);
      } catch (e) {
        console.warn("[office-scene] could not place the globe", e);
        scene.remove(obj);
      }
    }

    // fill remaining empty compartments with decorative books, remembering which compartment each belongs to
    const fillerByCompartment: Record<string, THREE.Mesh[]> = {};
    try {
      const occupied: THREE.Box3[] = [];
      model.traverse((n) => {
        if ((n as THREE.Mesh).isMesh && n.name && /^(book_|chess|tube_|diploma|moon_)/.test(n.name)) occupied.push(meshBox(n));
      });
      [llama, globeObj].forEach((n) => {
        if (n) occupied.push(meshBox(n));
      });
      phoneMeshes.forEach((n) => occupied.push(meshBox(n)));

      const palette = [0x8c5b48, 0x46655d, 0xb08a4e, 0x5c5670, 0x9c4c42, 0x3f4f5e, 0xd6c6a4, 0x6e7a4a, 0x7a4a58, 0x2f3b42];
      const rnd = (() => {
        let seed = 20260921;
        return () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
      })();
      const filler = new THREE.Group();
      scene.add(filler);

      ["a", "b", "c", "d"].forEach((L) => {
        const { sl, sr, boards } = compartment(L);
        if (!sl || !sr) return;
        for (let i = 0; i < boards.length - 1; i++) {
          const bd = boards[i];
          const cl = boards[i + 1];
          const y0 = bd.max.y;
          const y1 = cl.min.y;
          const gap = y1 - y0;
          if (gap < 0.18) continue;
          const x0 = sl.max.x;
          const x1 = sr.min.x;
          const slot = x1 - x0;
          if (slot < 0.15) continue;
          const busy = occupied.some((b) => {
            const cx = (b.min.x + b.max.x) / 2;
            const cy = (b.min.y + b.max.y) / 2;
            return cx > x0 - 0.02 && cx < x1 + 0.02 && cy > y0 - 0.02 && cy < y1 + 0.02;
          });
          if (busy) continue;

          const depth = (bd.max.z - bd.min.z) * 0.74;
          const zc = bd.max.z - depth / 2 - (bd.max.z - bd.min.z) * 0.06;
          const run = slot * (0.55 + rnd() * 0.3);
          let x = x0 + 0.018;
          const maxH = Math.min(gap * 0.82, gap - 0.03);
          while (x - x0 < run) {
            const w = 0.028 + rnd() * 0.05;
            if (x + w > x1 - 0.02) break;
            const h = maxH * (0.72 + rnd() * 0.28);
            const d = depth * (0.86 + rnd() * 0.14);
            const mat = new THREE.MeshStandardMaterial({
              color: palette[Math.floor(rnd() * palette.length)],
              roughness: 0.82,
              metalness: 0.02,
            });
            const bk = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 2, Math.min(w, h, d) * 0.2), mat);
            bk.castShadow = true;
            bk.receiveShadow = true;
            const lean = rnd() < 0.12 ? rnd() * 0.16 + 0.08 : 0;
            bk.rotation.z = -lean;
            bk.position.set(x + w / 2 + (lean ? h * Math.sin(lean) * 0.5 : 0), y0 + (h / 2) * Math.cos(lean), zc);
            filler.add(bk);
            (fillerByCompartment[L + i] ||= []).push(bk);
            x += w * Math.cos(lean) + (lean ? h * Math.sin(lean) * 0.5 : 0) + 0.004;
          }
          // a short horizontal stack leaning against the row
          if (rnd() < 0.55 && x1 - x > 0.16) {
            let sy = y0;
            const n = 2 + Math.floor(rnd() * 2);
            const sw = 0.1 + rnd() * 0.05;
            for (let k = 0; k < n; k++) {
              const th = 0.026 + rnd() * 0.018;
              const mat = new THREE.MeshStandardMaterial({
                color: palette[Math.floor(rnd() * palette.length)],
                roughness: 0.84,
                metalness: 0.02,
              });
              const bk = new THREE.Mesh(new RoundedBoxGeometry(sw - k * 0.008, th, depth * 0.9, 2, th * 0.3), mat);
              bk.castShadow = true;
              bk.receiveShadow = true;
              bk.position.set(x + 0.03 + sw / 2, sy + th / 2, zc);
              bk.rotation.y = (rnd() - 0.5) * 0.12;
              filler.add(bk);
            (fillerByCompartment[L + i] ||= []).push(bk);
              sy += th;
            }
          }
        }
      });
    } catch (e) {
      console.warn("[office-scene] decorative books skipped", e); // decorative only
    }

    // moon lamp — the globe already modelled on the shelf
    const moonMeshes: THREE.Mesh[] = [];
    model.traverse((n) => {
      if ((n as THREE.Mesh).isMesh && /^moon_/.test(n.name || "")) moonMeshes.push(n as THREE.Mesh);
    });
    const moonGlobe = moonMeshes.find((m) => m.name === "moon_globe");
    if (moonGlobe) {
      const gb = new THREE.Box3().setFromObject(moonGlobe);
      const c = gb.getCenter(new THREE.Vector3());
      this.lampLight = new THREE.PointLight(0xffd9a0, 0, 2.4, 2);
      this.lampLight.position.set(c.x, c.y, c.z + 0.08);
      scene.add(this.lampLight);
    }

    this.groups = this.buildGroups(model, posters);
    if (globeMeshes.length) this.groups.travels = { label: "Where I have been", meshes: globeMeshes };
    if (phoneMeshes.length) this.groups.phone = { label: "Say hello", meshes: phoneMeshes };
    if (moonMeshes.length) this.groups[MOON_LAMP_ID] = { label: MOON_LAMP_LABEL, meshes: moonMeshes };
    if (llama) this.groups.llama = { label: "Llama bank", meshes: collectMeshes(llama) };
    if (catMeshes.length) this.groups.cat = { label: "Zuko", meshes: catMeshes };
    for (const [id, { compartment, label }] of Object.entries(FILLER_HOTSPOTS)) {
      const meshes = fillerByCompartment[compartment];
      if (meshes?.length) this.groups[id] = { label, meshes };
      else console.warn(`[office-scene] no decorative books in compartment "${compartment}" for the ${id} hotspot`);
    }
    Object.values(this.groups).forEach((g) =>
      g.meshes.forEach((m) => {
        m.material = (m.material as THREE.Material).clone();
      }),
    );
    this.applySpines();
    this.setupPull();
    if (moonGlobe) {
      this.lampMat = moonGlobe.material as Standard;
      this.lampMat.emissive = new THREE.Color(0xffe6b8);
      this.lampMat.emissiveIntensity = 0.3;
    }

    this.target.set(1.45, 1.6, 0);
    this.camBase.set(1.0, 1.95, 8.3);
    camera.position.copy(this.camBase);
    camera.lookAt(this.target);

    this.listen(this.container, "pointermove", this.onMove);
    this.listen(this.container, "pointerleave", this.onLeave);
    this.listen(this.container, "click", this.onClick);

    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(this.container);
    this.resize();

    this.applyLight(o.daylight);
    if (o.touchControls) this.enableTouchControls();
    this.applyView(o.view);
    this.applyWall(o.walltone);
    this.setHints(o.hints);

    const loop = () => {
      this.raf = requestAnimationFrame(loop);
      const c = this.camera;
      if (this.hintsOn) {
        const p = 0.5 + 0.5 * Math.sin(performance.now() / 620);
        const hx = Math.round(0x1a + p * 0x3a);
        this.hintMeshes.forEach((m) => {
          const mat = m.material as Standard;
          if (mat.emissive && m.userData.hotspot !== this.hovered) mat.emissive.setRGB((hx / 255) * 1.0, (hx / 255) * 0.62, (hx / 255) * 0.12);
        });
      }
      if (this.pull.size) {
        const on = !this.opts.reducedMotion;
        this.pull.forEach((p, m) => {
          const target = on && m === this.pullMesh ? 1 : 0;
          if (p.k === target) return;
          p.k += (target - p.k) * 0.18;
          if (Math.abs(target - p.k) < 0.002) p.k = target;
          m.position.copy(p.base).addScaledVector(p.dir, p.k * PULL_DISTANCE);
        });
      }
      const par = this.drift() ? 1 : 0;
      const pan = this.opts.autopan && !this.opts.reducedMotion ? Math.sin(performance.now() / 7200) * 0.5 : 0;
      c.position.x += (this.camBase.x + pan + this.mouseN.x * 0.5 * par - c.position.x) * 0.055;
      c.position.y += (this.camBase.y - this.mouseN.y * 0.35 * par - c.position.y) * 0.055;
      c.position.z += (this.camBase.z - c.position.z) * 0.055;
      if (this.tGoal) this.target.lerp(this.tGoal, 0.055);
      c.lookAt(this.target);
      renderer.render(scene, camera);
    };
    loop();
    emitReady();
  }

  /** Apply changed options. Mirrors the attributes the prototype observed. */
  update(next: Partial<Omit<OfficeSceneOptions, "assets">>): void {
    const prev = this.opts;
    // Props the page doesn't pass arrive as undefined; they must not overwrite the current value.
    const defined = Object.fromEntries(Object.entries(next).filter(([, v]) => v !== undefined));
    this.opts = { ...prev, ...defined };
    if (!this.lights || this.disposed) return;
    if (next.daylight !== undefined && next.daylight !== prev.daylight) this.applyLight(next.daylight);
    if (next.walltone !== undefined && next.walltone !== prev.walltone) this.applyWall(next.walltone);
    if (next.hints !== undefined && next.hints !== prev.hints) this.setHints(next.hints);
    if (next.view !== undefined && next.view !== prev.view) this.applyView(next.view);
    if (next.parallax !== undefined || next.reducedMotion !== undefined) {
      if (!this.drift()) this.mouseN.set(0, 0);
    }
  }

  /** Re-apply the current framing (the mobile "Fit" button). */
  resetView(): void {
    this.armed = null;
    this.setHover(null, null);
    this.applyView(this.currentView);
  }

  /** Drop the emissive tint (called on Reader close so nothing stays lit on touch). */
  clearHighlight(): void {
    this.armed = null;
    this.setHover(null, null);
  }

  /**
   * Light a hotspot without a pointer (keyboard focus on the hidden hotspot list).
   * Emits the same `shelf:hover` as a mouse hover, anchored at the object's screen position.
   */
  highlight(id: SceneHotspotId | null): void {
    if (this.disposed || !this.camera) return;
    if (!id || !this.groups[id]) {
      this.setHover(null, null);
      return;
    }
    const box = new THREE.Box3();
    this.groups[id].meshes.forEach((m) => box.expandByObject(m));
    const c = box.getCenter(new THREE.Vector3()).project(this.camera);
    this.setHover(id, null, { x: (c.x * 0.5 + 0.5) * 100, y: (-c.y * 0.5 + 0.5) * 100 });
  }

  /** Used by the mobile shell to open whatever is currently armed. */
  openArmed(): void {
    if (this.armed) emitSelect({ id: this.armed as SceneHotspotId });
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.ro?.disconnect();
    this.cleanups.forEach((fn) => fn());
    this.cleanups = [];
    this.container.style.cursor = "";
    this.container.style.touchAction = "";

    this.scene?.traverse((n) => {
      const m = n as THREE.Mesh;
      if (!m.isMesh) return;
      m.geometry.dispose();
      const mats = Array.isArray(m.material) ? m.material : [m.material];
      mats.forEach((mat) => {
        Object.values(mat).forEach((v) => {
          if (v instanceof THREE.Texture) v.dispose();
        });
        mat.dispose();
      });
    });
    if (this.renderer) {
      this.renderer.dispose();
      this.renderer.forceContextLoss();
      this.renderer.domElement.remove();
    }
  }

  private listen<K extends keyof HTMLElementEventMap>(el: HTMLElement, type: K, fn: (ev: HTMLElementEventMap[K]) => void): void {
    el.addEventListener(type, fn);
    this.cleanups.push(() => el.removeEventListener(type, fn));
  }

  /** Pointer drift is off for touch layouts (`parallax="off"`) and for reduced motion. */
  private drift(): boolean {
    return this.opts.parallax !== "off" && !this.opts.reducedMotion;
  }

  private buildGroups(model: THREE.Object3D, posters: THREE.Group): Record<string, HotspotGroup> {
    const named: Record<string, THREE.Mesh> = {};
    model.traverse((n) => {
      if ((n as THREE.Mesh).isMesh && n.name) named[n.name] = n as THREE.Mesh;
    });
    const bb = (n: THREE.Object3D) => new THREE.Box3().setFromObject(n);

    const cols: Column[] = ["a", "b", "c", "d"]
      .map((L) => {
        const parts = ["side_left_" + L, "side_right_" + L, "top_" + L, "bottom_" + L].map((n) => named[n]).filter(Boolean);
        const b = new THREE.Box3();
        parts.forEach((p) => b.union(bb(p)));
        return { L, box: b, cx: (b.min.x + b.max.x) / 2 };
      })
      .filter((c) => isFinite(c.cx))
      .sort((p, q) => p.cx - q.cx);
    this.cols = cols;

    interface Book {
      m: THREE.Mesh;
      x: number;
      y: number;
      top: number;
    }
    const books: Book[] = [];
    for (let i = 1; i <= 60; i++) {
      const m = named["book_" + i];
      if (!m) continue;
      const b = bb(m);
      books.push({ m, x: (b.min.x + b.max.x) / 2, y: b.min.y, top: b.max.y });
    }

    const byCol = cols.map((c) => books.filter((bk) => bk.x >= c.box.min.x - 0.02 && bk.x <= c.box.max.x + 0.02));
    const clusters = byCol.map((list) => {
      const sorted = list.slice().sort((p, q) => q.y - p.y);
      const out: Array<{ y: number; items: Book[] }> = [];
      sorted.forEach((bk) => {
        const last = out[out.length - 1];
        if (last && Math.abs(last.y - bk.y) < 0.18) last.items.push(bk);
        else out.push({ y: bk.y, items: [bk] });
      });
      return out;
    });

    const pick = (ci: number, ri: number) => (clusters[ci] && clusters[ci][ri] ? clusters[ci][ri].items.map((b) => b.m) : []);
    const byPrefix = (re: RegExp) => {
      const arr: THREE.Mesh[] = [];
      model.traverse((n) => {
        if ((n as THREE.Mesh).isMesh && n.name && re.test(n.name)) arr.push(n as THREE.Mesh);
      });
      return arr;
    };
    const last = clusters.length - 1;
    // five cases, one per shelf, clustered in the two right-hand columns
    const shelves: Array<{ y: number; items: Book[] }> = [];
    const aboutCluster = clusters[0] && clusters[0][0];
    for (let ci = last; ci >= 0 && shelves.length < 5; ci--) {
      (clusters[ci] || []).forEach((cl) => {
        if (cl !== aboutCluster && shelves.length < 5) shelves.push(cl);
      });
    }
    const groups: Record<string, HotspotGroup> = {
      about: { label: "About me", meshes: pick(0, 0) },
      chess: { label: "Chess", meshes: byPrefix(/^chess/) },
      studies: { label: "Where I studied", meshes: byPrefix(/^(tube_|diploma)/) },
    };
    // one whole shelf per case: every book in the compartment is the hotspot
    shelves.slice(0, 5).forEach((cl, i) => {
      groups["case" + (i + 1)] = { label: "Case 0" + (i + 1), meshes: cl.items.map((b) => b.m) };
    });
    // "About me" and Case 03 trade places: About sits on Case 03's shelf, and Case 03 on the small top-left one
    if (groups.case3) {
      const aboutMeshes = groups.about.meshes;
      groups.about.meshes = groups.case3.meshes;
      groups.case3.meshes = aboutMeshes;
    }
    posters.children.forEach((frame) => {
      const id = frame.userData.posterId as string;
      groups[id] = { label: POSTER_LABELS[id] || "Illustration", meshes: collectMeshes(frame) };
    });
    return groups;
  }

  private applyLight(preset: Daylight): void {
    if (!this.lights) return;
    const L = this.lights;
    const p = LIGHT_PRESETS[preset] || LIGHT_PRESETS.afternoon;
    this.renderer.toneMappingExposure = p.exp;
    L.key.color.setHex(p.key[0]);
    L.key.intensity = p.key[1];
    L.key.position.set(p.key[2], p.key[3], p.key[4]);
    L.fill.color.setHex(p.fill[0]);
    L.fill.intensity = p.fill[1];
    L.rim.color.setHex(p.rim[0]);
    L.rim.intensity = p.rim[1];
    L.hemi.color.setHex(p.hemi[0]);
    L.hemi.groundColor.setHex(p.hemi[1]);
    L.hemi.intensity = p.hemi[2];
    L.amb.color.setHex(p.amb[0]);
    L.amb.intensity = p.amb[1];
    if (this.lampMat) {
      const night = preset === "evening lamp";
      const dusk = preset === "golden hour";
      this.lampMat.emissiveIntensity = night ? 1.5 : dusk ? 0.7 : 0.3;
      if (this.lampLight) this.lampLight.intensity = night ? 1.5 : dusk ? 0.5 : 0.0;
    }
  }

  // one-finger drag pans, two-finger pinch dollies; taps still fall through to onClick
  private enableTouchControls(): void {
    if (this.touchOn) return;
    this.touchOn = true;
    const el = this.container;
    el.style.touchAction = "none";
    const pts = new Map<number, { x: number; y: number }>();
    let pinch0 = 0;
    let z0 = 0;
    const onDown = (e: PointerEvent) => {
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      this.dragged = false;
      if (pts.size === 2) {
        const [a, b] = [...pts.values()];
        pinch0 = Math.hypot(a.x - b.x, a.y - b.y);
        z0 = this.camBase.z;
      }
    };
    const onMove = (e: PointerEvent) => {
      const p = pts.get(e.pointerId);
      if (!p) return;
      const r = el.getBoundingClientRect();
      if (pts.size === 2) {
        pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
        const [a, b] = [...pts.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (pinch0 > 8) {
          this.dragged = true;
          this.userMoved = true;
          this.camBase.z = clamp(z0 * (pinch0 / Math.max(d, 1)), 2.6, (this.zHome || 9.2) * 1.15);
        }
        return;
      }
      const dx = e.clientX - p.x;
      const dy = e.clientY - p.y;
      if (!this.dragged && Math.hypot(dx, dy) < 7) return;
      this.dragged = true;
      this.userMoved = true;
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const k = (this.camBase.z / 7) * 2.6;
      this.camBase.x = clamp(this.camBase.x - (dx / r.width) * k * 2.4, -2.4, 5.4);
      this.camBase.y = clamp(this.camBase.y + (dy / r.height) * k * 1.6, 0.7, 3.6);
      if (this.tGoal) {
        this.tGoal.x = clamp(this.camBase.x + 0.45, -2.0, 5.0);
        this.tGoal.y = clamp(this.camBase.y - 0.35, 0.5, 3.2);
      }
    };
    const onUp = (e: PointerEvent) => {
      pts.delete(e.pointerId);
      if (pts.size < 2) pinch0 = 0;
    };
    this.listen(el, "pointerdown", onDown);
    this.listen(el, "pointermove", onMove);
    this.listen(el, "pointerup", onUp);
    this.listen(el, "pointercancel", onUp);
    this.listen(el, "pointerleave", onUp);
  }

  // "wide" (default) or "col0".."col3" — frames a single bookcase column for portrait screens
  private applyView(v: SceneView): void {
    if (!this.camera) return;
    if (!this.tGoal) this.tGoal = this.target.clone();
    const tGoal = this.tGoal;
    this.userMoved = false;
    const wide = () => {
      const asp = this.camera.aspect || 1.6;
      this.framedPortrait = asp < 1.15;
      if (asp >= 1.15) {
        this.camBase.set(1.0, 1.95, 8.3);
        tGoal.set(1.45, 1.6, 0);
        return;
      }
      // portrait: fit the whole room by WIDTH — wall art included — and pull the camera up a little
      const fovP = (this.camera.fov * Math.PI) / 180;
      const halfW = 3.5;
      const d = Math.min(Math.max(halfW / (Math.tan(fovP / 2) * asp), 7), 22);
      this.camBase.set(1.1, 2.0, d);
      tGoal.set(1.3, 1.7, 0);
    };
    if (!v || v === "wide" || !this.cols.length) {
      this.currentView = "wide";
      wide();
      this.zHome = this.camBase.z;
      return;
    }
    const i = parseInt(String(v).replace("col", ""), 10);
    const c = this.cols[i];
    if (!c) {
      wide();
      return;
    }
    this.currentView = v;
    const b = c.box;
    const cx = (b.min.x + b.max.x) / 2;
    const cy = (b.min.y + b.max.y) / 2;
    const w = b.max.x - b.min.x;
    const h = b.max.y - b.min.y;
    const fov = (this.camera.fov * Math.PI) / 180;
    const aspect = this.camera.aspect || 0.5;
    const dH = (h * 0.58) / Math.tan(fov / 2);
    const dW = (w * 0.66) / Math.tan(fov / 2) / aspect;
    const d = Math.max(dH, dW, 2.4);
    tGoal.set(cx, cy, 0);
    this.camBase.set(cx, cy + 0.12, b.max.z + d);
    this.zHome = this.camBase.z;
  }

  private applyWall(tone: WallTone): void {
    if (!this.wallMat) return;
    this.wallMat.color.setHex(WALL_TONES[tone] ?? WALL_TONES.graphite);
  }

  private setHints(on: boolean): void {
    this.hintsOn = !!on;
    this.hintMeshes = [];
    Object.entries(this.groups).forEach(([id, g]) =>
      g.meshes.forEach((m) => {
        m.userData.hotspot = id;
        this.hintMeshes.push(m);
      }),
    );
    if (!on) {
      this.hintMeshes.forEach((m) => {
        const mat = m.material as Standard;
        if (mat.emissive && m.userData.hotspot !== this.hovered) mat.emissive.setHex(0x000000);
      });
    }
  }

  private resize(): void {
    if (!this.renderer) return;
    const w = this.container.clientWidth || 1;
    const h = this.container.clientHeight || 1;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    if (this.currentView !== "wide") {
      this.applyView(this.currentView);
    } else if (this.tGoal) {
      // Re-fit the room when the window changes shape, unless that would undo the user's own pan/zoom.
      // Crossing the portrait/landscape threshold always re-fits: the old framing no longer suits the shape.
      const portrait = this.camera.aspect < 1.15;
      if (!this.userMoved || portrait !== this.framedPortrait) this.applyView("wide");
    }
  }

  private hitTest(ev: PointerEvent | MouseEvent): string | null {
    const r = this.container.getBoundingClientRect();
    this.pointer.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
    this.mouseN.set(this.pointer.x, this.pointer.y);
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const all: THREE.Mesh[] = [];
    Object.entries(this.groups).forEach(([id, g]) =>
      g.meshes.forEach((m) => {
        m.userData.hotspot = id;
        all.push(m);
      }),
    );
    const hit = this.raycaster.intersectObjects(all, false)[0];
    this.lastHitMesh = hit ? (hit.object as THREE.Mesh) : null;
    return hit ? (hit.object.userData.hotspot as string) : null;
  }

  /** Which book slides out: the one under the pointer, or the group's tallest when there is no pointer. */
  private choosePull(id: string | null, ev: PointerEvent | MouseEvent | null): void {
    if (!id || !BOOK_IDS.includes(id) || !this.groups[id]) {
      this.pullMesh = null;
      return;
    }
    const under = ev && this.lastHitMesh && this.groups[id].meshes.includes(this.lastHitMesh) ? this.lastHitMesh : null;
    this.pullMesh = under ?? this.heroOf(id);
  }

  private heroOf(id: string): THREE.Mesh | null {
    const cached = this.heroes.get(id);
    if (cached) return cached;
    let best: THREE.Mesh | null = null;
    let bestH = -1;
    this.groups[id]?.meshes.forEach((m) => {
      const b = new THREE.Box3().setFromObject(m);
      if (b.max.y - b.min.y > bestH) {
        bestH = b.max.y - b.min.y;
        best = m;
      }
    });
    if (best) this.heroes.set(id, best);
    return best;
  }

  /** Each case's shelf takes its entry's colour: the tallest book fully, the rest most of the way. */
  private applySpines(): void {
    for (const id of TINTED_IDS) {
      const hex = this.opts.spines[id];
      const group = this.groups[id];
      if (!hex || !group) continue;
      const target = new THREE.Color(hex);
      const hero = this.heroOf(id);
      group.meshes.forEach((m) => {
        (m.material as Standard).color.lerp(target, m === hero ? 0.92 : 0.55);
      });
    }
  }

  /** Remember where each pullable book sits, and which way is "toward the viewer" in its parent's own units. */
  private setupPull(): void {
    this.scene.updateMatrixWorld(true);
    for (const id of BOOK_IDS) {
      this.groups[id]?.meshes.forEach((m) => {
        const parent = m.parent;
        if (!parent) return;
        const origin = parent.worldToLocal(new THREE.Vector3(0, 0, 0));
        const dir = parent.worldToLocal(new THREE.Vector3(0, 0, 1)).sub(origin);
        this.pull.set(m, { k: 0, base: m.position.clone(), dir });
      });
    }
  }

  private setEmissive(id: string, hex: number): void {
    this.groups[id].meshes.forEach((m) => {
      const mat = m.material as Standard;
      if (mat.emissive) mat.emissive.setHex(hex);
    });
  }

  private setHover(id: string | null, ev: PointerEvent | MouseEvent | null, at?: { x: number; y: number }): void {
    if (this.hovered === id) {
      this.choosePull(id, ev);
      return;
    }
    if (this.hovered) this.setEmissive(this.hovered, 0x000000);
    this.hovered = id;
    this.choosePull(id, ev);
    if (id) this.setEmissive(id, HOVER_EMISSIVE);
    this.container.style.cursor = id ? "pointer" : "default";
    const r = this.container.getBoundingClientRect();
    emitHover({
      id: id as SceneHotspotId | null,
      label: id ? (this.opts.labels[id] ?? this.groups[id].label) : "",
      x: ev ? ((ev.clientX - r.left) / r.width) * 100 : (at?.x ?? 50),
      y: ev ? ((ev.clientY - r.top) / r.height) * 100 : (at?.y ?? 50),
    });
  }

  private onMove = (ev: PointerEvent) => {
    if (this.opts.parallax === "off" && ev.pointerType === "touch") return;
    this.setHover(this.hitTest(ev), ev);
  };

  private onLeave = (ev: PointerEvent) => {
    // A lifted finger "leaves" the canvas, but that is the end of a tap, not of a hover: the armed
    // object (and its name card) must stay until the user taps elsewhere or opens it.
    if (ev.pointerType === "touch") return;
    this.setHover(null, null);
    this.mouseN.set(0, 0);
  };

  private onClick = (ev: MouseEvent) => {
    const touchLayout = this.opts.parallax === "off";
    const tapConfirm = this.opts.tap === "confirm";
    if (this.dragged) {
      this.dragged = false;
      return;
    }
    const id = this.hitTest(ev);
    if (touchLayout) this.mouseN.set(0, 0);
    if (!id) {
      if (tapConfirm) {
        this.setHover(null, ev);
        this.armed = null;
      }
      return;
    }
    if (tapConfirm && this.armed !== id) {
      this.armed = id;
      this.setHover(id, ev);
      return;
    }
    this.armed = null;
    emitSelect({ id: id as SceneHotspotId });
    if (touchLayout) this.setHover(null, null);
  };
}
