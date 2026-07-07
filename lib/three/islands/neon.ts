import * as THREE from 'three';
import type { IslandDef } from './builder';

// Projects — a marble town hall: stepped base, columns, entablature, dome.
export const neonIsland: IslandDef = {
  id: 'neon',
  title: 'Projects',
  panel: 'neon',
  // North of Home Harbor (spawn water to the south stays open).
  x: 10,
  z: -115,
  radius: 13,
  mini: '#b0b8c0',
  grass: '#9fce7a',
  labelY: 23, // just clears the dome finial (~y=20)
  build: (g, h) => {
    // stepped marble base
    const steps1 = h.box(17, 1.2, 14, '#dfe6ec');
    steps1.position.set(0, 2.4, 4.2);
    g.add(steps1);
    const steps2 = h.box(15, 1.2, 12.5, '#e9eef2');
    steps2.position.set(0, 3.4, 4.0);
    g.add(steps2);
    const steps3 = h.box(13.5, 1.2, 11, '#f2f5f8');
    steps3.position.set(0, 4.4, 3.8);
    g.add(steps3);

    // main hall block
    const hall = h.box(13, 9, 9, '#eef2f6');
    hall.position.set(0, 9.4, -1);
    g.add(hall);
    const plinth = h.box(13.6, 1.0, 9.6, '#dfe6ec');
    plinth.position.set(0, 5.4, -1);
    g.add(plinth);
    // Foundation under the hall: the steps only run along the front, so
    // without this the building's rear sat on air (plinth bottom ~4.9 vs
    // grass ~2.95). Front face is hidden inside the steps.
    const foundation = h.box(13.6, 2.2, 9.6, '#dfe6ec');
    foundation.position.set(0, 3.85, -1);
    g.add(foundation);

    // square block columns with caps + bases — bases sit flush on the top
    // step (y=5.0), shafts run from inside the base up into the caps.
    for (let i = 0; i < 5; i++) {
      const cx = -6 + i * 3;
      const shaft = h.box(1.3, 7.9, 1.3, '#ffffff');
      shaft.position.set(cx, 9.35, 4.5);
      g.add(shaft);
      const cap = h.box(1.8, 0.8, 1.8, '#f2f5f8');
      cap.position.set(cx, 13.5, 4.5);
      g.add(cap);
      const bs = h.box(1.8, 0.8, 1.8, '#f2f5f8');
      bs.position.set(cx, 5.4, 4.5);
      g.add(bs);
    }

    // entablature + stepped pediment
    const arch = h.box(15, 1.8, 3.6, '#f7f9fb');
    arch.position.set(0, 14.7, 4.3);
    g.add(arch);
    const ped: Array<[number, number]> = [
      [14, 16.3],
      [11, 17.1],
      [8, 17.9],
      [5, 18.7],
      [2.2, 19.5],
    ];
    ped.forEach(([w, y]) => {
      const b = h.box(w, 0.9, 3.6, '#e9eef2');
      b.position.set(0, y, 4.3);
      g.add(b);
    });

    // stepped voxel dome on a square drum
    const drum = h.box(7, 2.6, 7, '#f2f5f8');
    drum.position.set(0, 14.4, -1.5);
    g.add(drum);
    const domeT: Array<[number, number]> = [
      [6, 16.0],
      [4.6, 17.0],
      [3.2, 17.9],
      [1.8, 18.7],
    ];
    domeT.forEach(([s, y]) => {
      const b = h.box(s, 1.1, s, '#9ec5e8');
      b.position.set(0, y, -1.5);
      g.add(b);
    });
    const finial = h.box(0.5, 2.2, 0.5, '#ffd43b');
    finial.position.set(0, 19.7, -1.5);
    g.add(finial);

    // windows
    [-3.6, 3.6].forEach((wx) => {
      const w = h.box(1.5, 2.4, 0.4, '#bcd4ea', {
        emissive: new THREE.Color('#cfe4f5'),
        emissiveIntensity: 0.25,
      });
      w.position.set(wx, 9.6, 3.55);
      g.add(w);
    });

    g.add(h.tree(-11, -7, 1.0, '#2f9e44'));
    g.add(h.tree(11, -7, 0.95));
    g.add(h.tree(-11, 8, 0.9));
    g.add(h.lamp(-9, 9));
    g.add(h.lamp(9, 9));
  },
};
