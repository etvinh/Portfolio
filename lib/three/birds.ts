import * as THREE from 'three';
import { box } from './primitives';

export type BirdData = {
  r: number; // orbit radius
  a: number; // current angle
  cx: number; // orbit center x
  cz: number; // orbit center z
  y: number; // height
  sp: number; // angular speed
};

// Seagull groups orbiting the scene in horizontal circles, wings flapping.
// Each bird is two thin white boxes (the wings) — pure voxel silhouette.
// Per-bird orbit parameters live in `userData` so the game loop can advance
// them each frame.
export function createBirds(scene: THREE.Scene): THREE.Group[] {
  const groups: THREE.Group[] = [];
  for (let i = 0; i < 6; i++) {
    const bg = new THREE.Group();

    const wl = box(1.3, 0.16, 0.55, '#ffffff');
    wl.castShadow = false;
    wl.position.x = -0.62;
    wl.rotation.z = 0.32;
    bg.add(wl);

    const wr = box(1.3, 0.16, 0.55, '#ffffff');
    wr.castShadow = false;
    wr.position.x = 0.62;
    wr.rotation.z = -0.32;
    bg.add(wr);

    const data: BirdData = {
      r: 55 + Math.random() * 130,
      a: Math.random() * 6.28,
      cx: (Math.random() - 0.5) * 140,
      cz: -60 - Math.random() * 120,
      y: 42 + Math.random() * 26,
      sp: 0.08 + Math.random() * 0.08,
    };
    bg.userData = data;
    scene.add(bg);
    groups.push(bg);
  }
  return groups;
}
