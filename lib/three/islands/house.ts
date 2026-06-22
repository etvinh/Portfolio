import * as THREE from 'three';
import type { IslandDef } from './builder';

// About Me — cottage with red roof, chimney, door, flower beds.
export const houseIsland: IslandDef = {
  id: 'house',
  title: 'About Me',
  panel: 'house',
  x: 78,
  z: -16,
  radius: 14,
  mini: '#82d96b',
  grass: '#82d96b',
  build: (g, h) => {
    const walls = h.box(7, 5, 6, '#ffe8c2');
    walls.position.set(0, 5.4, 0);
    g.add(walls);

    const cornerProto = h.box(0.6, 5, 0.6, '#e8c79a');
    ([[-3.2, 2.7], [3.2, 2.7], [-3.2, -2.7], [3.2, -2.7]] as const).forEach(([cx, cz]) => {
      const cc = cornerProto.clone();
      cc.position.set(cx, 5.4, cz);
      g.add(cc);
    });

    const roofA = h.box(8.4, 1.0, 7.2, '#c44b3a');
    roofA.position.set(0, 8.0, 0);
    g.add(roofA);
    const roofB = h.box(6.4, 1.0, 7.2, '#d65f4d');
    roofB.position.set(0, 8.9, 0);
    g.add(roofB);
    const roofC = h.box(4.2, 1.0, 7.2, '#e0705f');
    roofC.position.set(0, 9.7, 0);
    g.add(roofC);
    const ridge = h.box(2.2, 1.0, 7.2, '#b13e2e');
    ridge.position.set(0, 10.4, 0);
    g.add(ridge);
    const chim = h.box(1.2, 3, 1.2, '#b85c4a');
    chim.position.set(2.2, 10.6, -1.5);
    g.add(chim);

    const door = h.box(1.7, 2.8, 0.4, '#7a4e28');
    door.position.set(0, 4.3, 3.05);
    g.add(door);
    const knob = h.box(0.22, 0.22, 0.22, '#ffd43b');
    knob.position.set(0.55, 4.4, 3.22);
    g.add(knob);

    [-2.3, 2.3].forEach((wx) => {
      const fr = h.box(1.9, 1.9, 0.25, '#ffffff');
      fr.position.set(wx, 5.7, 3.0);
      g.add(fr);
      const w = h.box(1.4, 1.4, 0.3, '#bfe9ff', {
        emissive: new THREE.Color('#bfe9ff'),
        emissiveIntensity: 0.3,
      });
      w.position.set(wx, 5.7, 3.05);
      g.add(w);
    });

    g.add(h.tree(-9, 7, 1.0));
    g.add(h.tree(9, 7, 0.9, '#37b24d'));
    g.add(h.tree(-8, -7, 0.95, '#2f9e44'));
    g.add(h.flower(-5, 6, '#ff6b9d'));
    g.add(h.flower(5, 6, '#ffd43b'));
    g.add(h.flower(-3, 7, '#9775fa'));
    g.add(h.flower(4, 7, '#74c0fc'));
    g.add(h.lamp(6, -5));
    g.add(h.rock(-8, 2, 1.4));
    g.add(h.rock(8, -2, 1.2, '#7a8086'));
  },
};
