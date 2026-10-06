/**
 * The postcard from home, taped to the wall: a thin card showing postcardArt's front (drawn into a texture once the
 * SVG has loaded, plain cream until then) and two strips of washi tape across its top corners.
 */
import * as THREE from "three";
import { POSTCARD_ASPECT, postcardFrontSvg } from "./postcardArt";

/** A postcard `w` wide, centred on its origin, facing +z, its back on z = 0. */
export function makePostcard(w: number): THREE.Group {
  const card = new THREE.Group();
  card.name = "home_postcard";
  const h = w / POSTCARD_ASPECT;

  const canvas = document.createElement("canvas");
  canvas.width = 900;
  canvas.height = Math.round(900 / POSTCARD_ASPECT);
  const g = canvas.getContext("2d")!;
  g.fillStyle = "#fbf6ea";
  g.fillRect(0, 0, canvas.width, canvas.height);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  const img = new Image();
  img.onload = () => {
    g.drawImage(img, 0, 0, canvas.width, canvas.height);
    tex.needsUpdate = true;
  };
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(postcardFrontSvg())}`;

  // One material per mesh: the scene clones each hotspot mesh's material to light it on hover.
  const face = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.75 }));
  face.position.z = 0.002;
  face.castShadow = true;
  face.receiveShadow = true;
  face.name = "home_postcard_face";
  card.add(face);

  // washi tape over the two top corners
  const tape = new THREE.MeshStandardMaterial({ color: 0xe9b7a8, roughness: 0.85, transparent: true, opacity: 0.85 });
  for (const side of [-1, 1]) {
    const strip = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.26, w * 0.065), tape);
    strip.position.set(side * (w / 2 - w * 0.07), h / 2 - w * 0.02, 0.004);
    strip.rotation.z = side * -0.6;
    strip.name = `home_postcard_tape_${side < 0 ? "left" : "right"}`;
    card.add(strip);
  }
  return card;
}
