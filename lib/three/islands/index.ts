import * as THREE from 'three';
import { mkIsland, type Island } from './builder';
import { homeIsland } from './home';
import { houseIsland } from './house';
import { socialsIsland } from './socials';
import { neonIsland } from './neon';

export type { Island } from './builder';

// Order matters: islands[0] is "home", used by the autopilot when the player
// taps "Lost? Sail home".
export function buildAllIslands(scene: THREE.Scene): Island[] {
  return [
    mkIsland(scene, homeIsland),
    mkIsland(scene, socialsIsland),
    mkIsland(scene, houseIsland),
    mkIsland(scene, neonIsland),
  ];
}
