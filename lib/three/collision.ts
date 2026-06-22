import type * as THREE from 'three';
import type { Island } from './islands/builder';

const BOAT_RADIUS = 2.8;

// Per-frame push-out collision against each island's circle colliders
// (one per land lump + several down the pier). Mutates boatPos in place and
// returns the updated speed (we damp it on contact so a head-on ram doesn't
// rebound endlessly).
//
// The early-out (skipping islands the boat is nowhere near) keeps this O(1)
// in practice — only the nearby island runs the inner loop.
export function collideBoat(
  boatPos: THREE.Vector3,
  islands: Island[],
  speed: number,
): number {
  for (const is of islands) {
    if (boatPos.distanceTo(is.pos) > is.collR + 14) continue;
    for (const col of is.colliders) {
      const dx = boatPos.x - col.x;
      const dz = boatPos.z - col.z;
      const rr = col.r + BOAT_RADIUS;
      const d = Math.hypot(dx, dz);
      if (d < rr && d > 0.0001) {
        const push = rr - d;
        boatPos.x += (dx / d) * push;
        boatPos.z += (dz / d) * push;
        speed *= 0.55;
      }
    }
  }
  return speed;
}
