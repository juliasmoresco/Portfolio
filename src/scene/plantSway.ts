/**
 * Gentle idle sway for the trailing plant on the wall shelf, plus a "brush" when the pointer moves
 * through it. The plant ships as a flat list of meshes — per vine one stem and its leaves
 * (`vine_<n>_stem`, `vine_<n>_leaf_<k>`) — so each vine is gathered under a pivot at the top of
 * its stem, where it leaves the pot, and swings from there like a slow pendulum.
 */
import * as THREE from "three";

const IDLE_AMP = 0.018; // rad
const MAX_ENERGY = 0.13; // rad of extra swing from brushing
const ENERGY_DECAY = 1.6; // per second
const BRUSH_REACH = 0.28; // world units: how far from the pointer's ray a vine still feels it

interface Vine {
  pivot: THREE.Group;
  /** The vine's middle, in its pivot's space, for measuring how close the pointer passes. */
  mid: THREE.Vector3;
  phase: number;
  speed: number;
  energy: number;
}

/** The highest point of a mesh's geometry, in its parent's space. */
function topPoint(mesh: THREE.Mesh): THREE.Vector3 {
  mesh.updateMatrix();
  const pos = mesh.geometry.attributes.position;
  const v = new THREE.Vector3();
  const best = new THREE.Vector3(0, -Infinity, 0);
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i).applyMatrix4(mesh.matrix);
    if (v.y > best.y) best.copy(v);
  }
  return best;
}

export class PlantSway {
  private vines: Vine[] = [];
  private readonly tmp = new THREE.Vector3();

  constructor(plant: THREE.Object3D) {
    plant.updateWorldMatrix(true, true);
    const byVine = new Map<string, THREE.Object3D[]>();
    for (const child of [...plant.children]) {
      const m = /^vine_(\d+)_/.exec(child.name);
      if (!m) continue;
      if (!byVine.has(m[1])) byVine.set(m[1], []);
      byVine.get(m[1])!.push(child);
    }

    let i = 0;
    for (const [id, parts] of byVine) {
      const stem = parts.find((p) => p.name.endsWith("_stem")) as THREE.Mesh | undefined;
      if (!stem?.isMesh) continue;
      const pivot = new THREE.Group();
      pivot.name = `vine_${id}_pivot`;
      pivot.position.copy(topPoint(stem));
      plant.add(pivot);
      pivot.updateWorldMatrix(true, false);
      parts.forEach((p) => pivot.attach(p));

      const box = new THREE.Box3();
      parts.forEach((p) => box.union(new THREE.Box3().setFromObject(p)));
      const mid = pivot.worldToLocal(box.getCenter(new THREE.Vector3()));

      // Deterministic spread of phases and speeds, so no two vines swing in step.
      this.vines.push({ pivot, mid, phase: i * 1.7, speed: 0.75 + ((i * 37) % 10) / 22, energy: 0 });
      i++;
    }
  }

  update(t: number, dt: number): void {
    for (const v of this.vines) {
      v.energy *= Math.exp(-dt * ENERGY_DECAY);
      const amp = IDLE_AMP + v.energy;
      v.pivot.rotation.z = amp * Math.sin(t * v.speed + v.phase);
      v.pivot.rotation.x = amp * 0.6 * Math.sin(t * v.speed * 0.73 + v.phase * 1.3);
    }
  }

  /** Nudge the vines the pointer's ray passes close to; `strength` 0–1 from how fast it moved. */
  brush(ray: THREE.Ray, strength: number): void {
    if (strength <= 0) return;
    for (const v of this.vines) {
      const d2 = ray.distanceSqToPoint(v.pivot.localToWorld(this.tmp.copy(v.mid)));
      const falloff = Math.exp(-d2 / (BRUSH_REACH * BRUSH_REACH));
      if (falloff < 0.05) continue;
      v.energy = Math.min(MAX_ENERGY, v.energy + 0.04 * falloff * strength);
    }
  }
}
