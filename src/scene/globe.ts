/**
 * The desk globe, built in code so there is no third-party model to license or ship.
 * A tilted sphere wearing an equirectangular world map drawn from coarse hand-placed outlines
 * (it is 35px wide on screen, so the coastlines only need to read as continents), in a brass
 * meridian ring on a wooden base.
 */
import * as THREE from "three";

type LonLat = [lon: number, lat: number];

/** Coarse continent outlines, clockwise, as [longitude, latitude]. */
const LAND: LonLat[][] = [
  // North America and Central America
  [[-168, 66], [-160, 71], [-141, 70], [-125, 70], [-108, 68], [-95, 72], [-85, 70], [-80, 63], [-94, 59], [-92, 56], [-82, 55], [-79, 52], [-78, 58], [-70, 60], [-62, 58], [-56, 52], [-60, 47], [-66, 44], [-70, 42], [-75, 38], [-76, 35], [-81, 31], [-80, 26], [-82, 26], [-84, 30], [-90, 29.5], [-94, 29], [-97, 26], [-97, 22], [-95, 19], [-91, 18.5], [-88, 21], [-87, 16], [-83, 15], [-83, 10], [-79, 9], [-78, 8], [-81, 8], [-86, 11], [-87, 13], [-92, 14.5], [-97, 16], [-105, 20], [-109, 26], [-113, 31], [-117, 32], [-121, 35], [-124, 40], [-124, 46], [-125, 49], [-130, 54], [-134, 58], [-140, 60], [-148, 60], [-153, 58], [-160, 58], [-165, 61]],
  // Greenland
  [[-73, 78], [-60, 82], [-30, 83], [-20, 78], [-22, 70], [-40, 64], [-50, 62], [-55, 68], [-68, 76]],
  // South America
  [[-80, 9], [-72, 12], [-62, 10], [-52, 5], [-50, 0], [-44, -2], [-35, -6], [-38, -13], [-41, -22], [-48, -26], [-53, -34], [-58, -38], [-63, -41], [-65, -46], [-68, -52], [-72, -54], [-74, -48], [-73, -40], [-71, -30], [-70, -18], [-76, -14], [-81, -5], [-80, 0], [-78, 5]],
  // Africa
  [[-17, 21], [-10, 30], [-6, 36], [10, 37], [20, 32], [32, 31], [35, 28], [43, 12], [51, 12], [41, -2], [40, -15], [35, -25], [32, -29], [20, -35], [18, -32], [12, -18], [13, -6], [9, 3], [-2, 5], [-8, 4], [-13, 9], [-17, 14]],
  // Europe and Asia, with Arabia
  [[-9, 37], [-9, 43], [-2, 44], [-4, 48], [2, 51], [8, 54], [9, 57], [5, 60], [10, 64], [16, 69], [28, 71], [41, 67], [50, 68], [70, 73], [90, 76], [110, 77], [140, 72], [170, 70], [180, 66], [178, 63], [165, 60], [158, 52], [156, 51], [143, 53], [140, 47], [132, 43], [129, 36], [122, 40], [122, 32], [118, 24], [108, 21], [106, 11], [100, 13], [101, 4], [98, 10], [94, 17], [88, 22], [80, 15], [77, 8], [72, 20], [67, 25], [58, 25], [56, 27], [50, 30], [50, 26], [56, 24], [59, 22], [55, 17], [44, 12], [43, 16], [35, 28], [34, 31], [36, 36], [28, 37], [26, 40], [23, 36], [19, 41], [13, 45], [8, 44], [3, 43], [-1, 37]],
  // Australia
  [[114, -22], [122, -18], [130, -12], [136, -12], [142, -11], [146, -19], [153, -26], [151, -34], [146, -39], [140, -38], [135, -34], [129, -32], [115, -34]],
  // British Isles, Japan, Indonesia, New Zealand
  [[-5, 50], [1, 51], [0, 54], [-3, 58], [-6, 56]],
  [[130, 31], [135, 34], [141, 37], [142, 44], [140, 41], [136, 36]],
  [[95, 5], [105, -6], [115, -8], [106, -4], [98, 2]],
  [[173, -35], [178, -38], [175, -41], [172, -41]],
  // Antarctica
  [[-180, -78], [180, -78], [180, -90], [-180, -90]],
];

const W = 1024;
const H = 512;
/** The sphere's radius in `makeGlobe()`'s own local units — exported so markers can sit exactly on it. */
export const GLOBE_SPHERE_RADIUS = 0.5;

/**
 * A point on the sphere's own surface for a given [lon, lat], in the sphere mesh's local space —
 * add markers as children of `makeGlobe()`'s sphere (findable by name: `.getObjectByName("sphere")`)
 * and they inherit its rotation, staying glued to the right spot as the globe turns. Matches the
 * same lon/lat convention the map texture above uses (u = (lon+180)/360, v = (90-lat)/180),
 * combined with three.js's standard equirectangular UV-to-sphere mapping.
 */
export function pointOnGlobe(lon: number, lat: number, r: number): THREE.Vector3 {
  const u = (lon + 180) / 360;
  const v = (90 - lat) / 180;
  const phi = v * Math.PI;
  const theta = u * 2 * Math.PI;
  return new THREE.Vector3(-r * Math.sin(phi) * Math.cos(theta), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(theta));
}

/** `scale` renders the same map at a higher resolution, for close-ups. */
function makeMapTexture(scale = 1): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = W * scale;
  c.height = H * scale;
  const g = c.getContext("2d")!;
  g.scale(scale, scale);
  const x = (lon: number) => ((lon + 180) / 360) * W;
  const y = (lat: number) => ((90 - lat) / 180) * H;

  const sea = g.createLinearGradient(0, 0, 0, H);
  sea.addColorStop(0, "#1c4173");
  sea.addColorStop(0.5, "#24578f");
  sea.addColorStop(1, "#1c4173");
  g.fillStyle = sea;
  g.fillRect(0, 0, W, H);

  // faint graticule every 30 degrees
  g.strokeStyle = "rgba(255,255,255,0.09)";
  g.lineWidth = 1;
  for (let lon = -180; lon <= 180; lon += 30) {
    g.beginPath();
    g.moveTo(x(lon), 0);
    g.lineTo(x(lon), H);
    g.stroke();
  }
  for (let lat = -60; lat <= 60; lat += 30) {
    g.beginPath();
    g.moveTo(0, y(lat));
    g.lineTo(W, y(lat));
    g.stroke();
  }

  // seeded, so the land looks the same on every load
  let seed = 7;
  const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;

  g.lineJoin = "round";
  for (const poly of LAND) {
    const trace = () => {
      g.beginPath();
      poly.forEach(([lon, lat], i) => (i === 0 ? g.moveTo(x(lon), y(lat)) : g.lineTo(x(lon), y(lat))));
      g.closePath();
    };
    trace();
    g.fillStyle = "#6f9450";
    g.fill();

    // drier and greener patches so the land is not one flat colour, kept inside the coastline
    const xs = poly.map(([lon]) => x(lon));
    const ys = poly.map(([, lat]) => y(lat));
    const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
    const n = Math.round(((x1 - x0) * (y1 - y0)) / 2600);
    g.save();
    trace();
    g.clip();
    for (let k = 0; k < n; k++) {
      g.fillStyle = rnd() < 0.5 ? "rgba(196,170,104,0.35)" : "rgba(60,96,52,0.35)";
      g.beginPath();
      g.ellipse(x0 + rnd() * (x1 - x0), y0 + rnd() * (y1 - y0), 6 + rnd() * 22, 4 + rnd() * 12, rnd() * Math.PI, 0, Math.PI * 2);
      g.fill();
    }
    g.restore();

    trace();
    g.strokeStyle = "#8fb56b";
    g.lineWidth = 3;
    g.stroke();
  }

  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/** Just the map-wrapped sphere, centred at the origin. `detail` sharpens the map and mesh for close-ups. */
export function makeGlobeSphere(detail = 1): THREE.Mesh {
  const sphere = new THREE.Mesh(
    new THREE.SphereGeometry(GLOBE_SPHERE_RADIUS, 48 * detail, 32 * detail),
    new THREE.MeshStandardMaterial({ map: makeMapTexture(detail), roughness: 0.55, metalness: 0.05 }),
  );
  sphere.name = "sphere";
  return sphere;
}

/** The whole desk globe: sphere, brass meridian ring and wooden base. */
export function makeGlobe(): THREE.Group {
  const globe = new THREE.Group();
  globe.name = "globe";

  const brass = new THREE.MeshStandardMaterial({ color: 0xb08a3e, roughness: 0.38, metalness: 0.8 });
  const wood = new THREE.MeshStandardMaterial({ color: 0x5b3a22, roughness: 0.62 });

  const CENTRE_Y = 0.72;
  const RING_R = 0.53;

  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.34, 0.06, 40), wood);
  base.name = "base";
  base.position.y = 0.03;

  // Everything above the base turns together, so the ring can be shown at an angle.
  const assembly = new THREE.Group();
  assembly.name = "assembly";
  assembly.rotation.y = 0.75;

  // The stem meets the bottom of the ring.
  const ringBottom = CENTRE_Y - RING_R;
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, ringBottom - 0.04, 20), brass);
  stem.position.y = 0.06 + (ringBottom - 0.04) / 2 - 0.01;

  // A full vertical ring, like a real desk globe's meridian.
  const ring = new THREE.Mesh(new THREE.TorusGeometry(RING_R, 0.016, 12, 72), brass);
  ring.position.y = CENTRE_Y;

  // The sphere is tilted inside the ring; its axle caps touch the ring where the poles come out.
  const tilted = new THREE.Group();
  tilted.position.y = CENTRE_Y;
  tilted.rotation.z = 0.41; // 23.5 degrees
  const sphere = makeGlobeSphere();
  sphere.rotation.y = -1.2; // turn the Atlantic toward the room
  const capTop = new THREE.Mesh(new THREE.SphereGeometry(0.028, 16, 12), brass);
  capTop.position.y = GLOBE_SPHERE_RADIUS + 0.005;
  const capBottom = capTop.clone();
  capBottom.position.y = -(GLOBE_SPHERE_RADIUS + 0.005);
  tilted.add(sphere, capTop, capBottom);

  assembly.add(stem, ring, tilted);
  globe.add(base, assembly);
  return globe;
}
