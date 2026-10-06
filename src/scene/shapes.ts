import * as THREE from "three";

/** A tube along `curve` whose radius eases from r0 at the start to r1 at the end. Open at both ends. */
export function taperedTube(curve: THREE.Curve<THREE.Vector3>, r0: number, r1: number, tubular = 32, radial = 24): THREE.TubeGeometry {
  const geo = new THREE.TubeGeometry(curve, tubular, 1, radial, false);
  const pos = geo.attributes.position;
  const p = new THREE.Vector3();
  const c = new THREE.Vector3();
  for (let i = 0; i <= tubular; i++) {
    const t = i / tubular;
    curve.getPointAt(t, c);
    const r = r0 + (r1 - r0) * t;
    for (let j = 0; j <= radial; j++) {
      const k = i * (radial + 1) + j;
      p.fromBufferAttribute(pos, k).sub(c).multiplyScalar(r).add(c);
      pos.setXYZ(k, p.x, p.y, p.z);
    }
  }
  return geo;
}
