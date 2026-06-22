import * as THREE from 'three';
import { box, cyl, M } from './primitives';

// Blocky voxel tug ported from the prototype. Two groups:
//   - outer `group`: the thing you translate around (anchored at sea level)
//   - inner `model`: the actual mesh — bobs/banks/pitches relative to `group`
//
// Returning `hullMat` lets a caller hot-swap the hull color at runtime if
// the boat-color prop changes.
export type Boat = {
  group: THREE.Group;
  model: THREE.Group;
  hullMat: THREE.MeshStandardMaterial;
};

export function createBoat(hullColor: string): Boat {
  const group = new THREE.Group();
  const model = new THREE.Group();
  const hullMat = M(hullColor, { roughness: 0.6 });

  const keel = box(2.9, 1.0, 5.0, '#a51111');
  keel.position.y = 0.5;
  model.add(keel);

  const hull = new THREE.Mesh(new THREE.BoxGeometry(3.4, 1.2, 5.4), hullMat);
  hull.castShadow = true;
  hull.receiveShadow = true;
  hull.position.y = 1.45;
  model.add(hull);

  const bow = new THREE.Mesh(new THREE.BoxGeometry(3.4, 1.2, 1.3), hullMat);
  bow.castShadow = true;
  bow.position.set(0, 1.9, -2.05);
  model.add(bow);

  const trim = box(3.6, 0.4, 5.6, '#ffffff');
  trim.position.y = 2.15;
  model.add(trim);

  const deck = box(2.9, 0.3, 4.8, '#f4d9a6');
  deck.position.set(0, 2.35, 0.2);
  model.add(deck);

  const cabin = box(2.0, 1.4, 2.0, '#ffffff');
  cabin.position.set(0, 3.2, 1.1);
  model.add(cabin);

  const cwin = box(2.06, 0.6, 1.2, '#3a8fd6');
  cwin.position.set(0, 3.4, 1.1);
  model.add(cwin);

  const croof = box(2.3, 0.35, 2.3, '#ffd43b');
  croof.position.set(0, 4.0, 1.1);
  model.add(croof);

  const funnel = box(0.8, 1.4, 0.8, hullColor);
  funnel.position.set(0, 4.6, 1.7);
  model.add(funnel);

  const fband = box(0.9, 0.3, 0.9, '#ffffff');
  fband.position.set(0, 5.0, 1.7);
  model.add(fband);

  const mast = box(0.25, 4.0, 0.25, '#8a5a2b');
  mast.position.set(0, 4.0, -0.9);
  model.add(mast);

  const boom = box(0.2, 0.2, 2.0, '#8a5a2b');
  boom.position.set(0, 3.0, -0.9);
  model.add(boom);

  const sail = box(0.22, 2.4, 1.9, '#ffffff', { roughness: 0.9 });
  sail.position.set(0, 4.0, -0.9);
  model.add(sail);

  const jib = box(0.2, 1.5, 1.1, '#ffe3c2', { roughness: 0.9 });
  jib.position.set(0, 3.4, -1.7);
  model.add(jib);

  const flag = box(0.1, 0.7, 0.9, hullColor);
  flag.position.set(0, 5.7, -0.45);
  model.add(flag);

  // porthole lights, ring lifebuoys, railings
  [-1.78, 1.78].forEach((sx) => {
    [-0.5, 0.8].forEach((pz) => {
      const ph = box(0.12, 0.5, 0.5, '#bfe9ff', {
        emissive: new THREE.Color('#bfe9ff'),
        emissiveIntensity: 0.25,
      });
      ph.position.set(sx, 1.5, pz);
      model.add(ph);
    });
  });

  const lifeRing = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.16, 8, 16), M('#ffffff'));
  lifeRing.position.set(0, 3.05, 2.18);
  lifeRing.castShadow = true;
  model.add(lifeRing);

  const lifeRing2 = new THREE.Mesh(new THREE.TorusGeometry(0.43, 0.1, 8, 8), M('#fa5252'));
  lifeRing2.position.set(0, 3.05, 2.16);
  model.add(lifeRing2);

  for (let i = 0; i < 5; i++) {
    const pz = -1.7 + i * 0.85;
    [-1.5, 1.5].forEach((sx) => {
      const pst = box(0.12, 0.55, 0.12, '#ffffff');
      pst.position.set(sx, 2.55, pz);
      model.add(pst);
    });
  }
  [-1.5, 1.5].forEach((sx) => {
    const rail = box(0.09, 0.09, 4.0, '#ffffff');
    rail.position.set(sx, 2.85, -0.3);
    model.add(rail);
  });

  const coil = new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.13, 6, 14), M('#caa46a'));
  coil.rotation.x = Math.PI / 2;
  coil.position.set(-0.95, 2.55, -1.7);
  model.add(coil);

  const anchor = box(0.45, 0.7, 0.12, '#495057');
  anchor.position.set(1.55, 1.75, -1.7);
  model.add(anchor);
  const anchorBar = box(0.95, 0.14, 0.12, '#495057');
  anchorBar.position.set(1.55, 2.0, -1.7);
  model.add(anchorBar);

  group.add(model);
  group.position.set(0, 0, 36);

  // suppress unused-var lint for cyl which was imported for parity with the
  // prototype's util surface, even though boat itself doesn't call it.
  void cyl;

  return { group, model, hullMat };
}
