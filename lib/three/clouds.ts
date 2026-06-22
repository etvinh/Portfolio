import * as THREE from 'three';
import { box } from './primitives';

// Voxel cloud groups scattered across the sky. Each cloud is 2-4 white boxes
// clustered around a center point. The game loop drifts them in +x and wraps
// them around at the world edge so the sky has perpetual gentle motion.
export function createClouds(scene: THREE.Scene): THREE.Group[] {
  const groups: THREE.Group[] = [];
  for (let i = 0; i < 9; i++) {
    const cg = new THREE.Group();
    const n = 2 + Math.floor(Math.random() * 3);
    for (let j = 0; j < n; j++) {
      const c = box(
        6 + Math.random() * 5,
        4,
        5 + Math.random() * 4,
        '#ffffff',
        { roughness: 1 },
      );
      c.castShadow = false;
      c.position.set(j * 4 - n * 2, Math.random() * 2, Math.random() * 3);
      cg.add(c);
    }
    cg.position.set(
      (Math.random() - 0.5) * 460,
      70 + Math.random() * 40,
      (Math.random() - 0.5) * 460,
    );
    scene.add(cg);
    groups.push(cg);
  }
  return groups;
}
