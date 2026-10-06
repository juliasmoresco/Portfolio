/**
 * Small details that make the shelf's plain blocks read as books: the cream page block showing
 * along the top between the covers, and two thin bands across the spine near its head and foot,
 * like a cloth hardcover. Children of the book, so they come along when it slides out or flies.
 *
 * Expects a standing book whose geometry is centred on its origin: x = thickness, y = height,
 * z = depth, spine facing +z (true of both the model's books and the decorative ones).
 */
import * as THREE from "three";

const PAGES = new THREE.MeshStandardMaterial({ color: 0xece0c6, roughness: 0.95 });
const GOLD = new THREE.Color(0xc9a45c);

export function dressBook(book: THREE.Mesh): void {
  const geo = book.geometry;
  geo.computeBoundingBox();
  const size = geo.boundingBox!.getSize(new THREE.Vector3());
  const [w, h, d] = [size.x, size.y, size.z];
  if (h < w * 2) return; // lying flat, not standing: nothing on top to show

  const pages = new THREE.Mesh(new THREE.BoxGeometry(w * 0.72, 0.002, d * 0.86), PAGES);
  pages.position.set(0, h / 2 + 0.0004, -d * 0.05);
  book.add(pages);

  // Dark books get a gilt-ish band, light ones a band a shade deeper than the cloth.
  const cloth = (book.material as THREE.MeshStandardMaterial).color;
  const hsl = cloth.getHSL({ h: 0, s: 0, l: 0 });
  const bandColor = hsl.l < 0.18 ? cloth.clone().lerp(GOLD, 0.55) : cloth.clone().multiplyScalar(0.62);
  const bandMat = new THREE.MeshStandardMaterial({ color: bandColor, roughness: 0.6 });
  const bandGeo = new THREE.BoxGeometry(w * 0.84, Math.max(0.005, h * 0.022), 0.002);
  for (const at of [0.38, -0.38]) {
    const band = new THREE.Mesh(bandGeo, bandMat);
    band.position.set(0, h * at, d / 2 + 0.0006);
    book.add(band);
  }
}
