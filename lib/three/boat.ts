import * as THREE from 'three';
import { box, cyl, M } from './primitives';

// Blocky voxel sailboat. Two groups:
//   - outer `group`: the thing you translate around (anchored at sea level)
//   - inner `model`: the actual mesh — bobs/banks/pitches relative to `group`
//
// Returning `hullMat` lets a caller hot-swap the hull color at runtime if
// the boat-color prop changes.
export type Boat = {
  group: THREE.Group;
  model: THREE.Group;
  hullMat: THREE.MeshStandardMaterial;
  // Stern lantern — emissive material + cast light, ramped on at dusk by the
  // TimeOfDay controller (the boat's "night light").
  lampMat: THREE.MeshStandardMaterial;
  lampLight: THREE.PointLight;
};

export function createBoat(hullColor: string): Boat {
  const group = new THREE.Group();
  const model = new THREE.Group();
  // Wooden hull — plank brown, rougher than the toy-plastic default.
  // `hullColor` still tints the masthead pennant.
  const hullMat = M('#8a5a2b', { roughness: 0.78 });

  const keel = box(2.9, 1.0, 5.0, '#4a2f17');
  keel.position.y = 0.5;
  model.add(keel);

  const hull = new THREE.Mesh(new THREE.BoxGeometry(3.4, 1.2, 5.4), hullMat);
  hull.castShadow = true;
  hull.receiveShadow = true;
  hull.position.y = 1.45;
  model.add(hull);

  // ---- pointed bow ----
  // A tapering step, then a 45°-rotated block whose corner leads — an
  // actual point at the prow instead of a flat slab.
  const bowStep = new THREE.Mesh(new THREE.BoxGeometry(2.5, 1.2, 1.4), hullMat);
  bowStep.castShadow = true;
  bowStep.position.set(0, 1.55, -3.1);
  model.add(bowStep);
  const prow = new THREE.Mesh(new THREE.BoxGeometry(1.7, 1.15, 1.7), hullMat);
  prow.castShadow = true;
  prow.rotation.y = Math.PI / 4;
  prow.position.set(0, 1.6, -3.5);
  model.add(prow);

  // Gunwale trim in a lighter wood.
  const trim = box(3.6, 0.4, 5.6, '#caa46a');
  trim.position.y = 2.15;
  model.add(trim);

  const deck = box(2.9, 0.3, 4.8, '#f4d9a6');
  deck.position.set(0, 2.35, 0.2);
  model.add(deck);

  // ---- sailing rig ----
  // Tall mast amidships. Both sails are stepped right triangles: every
  // mainsail panel's FRONT edge sits flush against the mast (a straight
  // luff), with panel depth shrinking as it climbs so the free edge steps
  // inward — a clean triangular silhouette. The jib mirrors that forward of
  // the mast: rear edges aligned, hanging toward the bowsprit.
  const mast = box(0.3, 8.6, 0.3, '#8a5a2b');
  mast.position.set(0, 5.6, -0.2);
  model.add(mast);

  // Boom along the mainsail's foot.
  const boom = box(0.24, 0.24, 3.6, '#8a5a2b');
  boom.position.set(0, 2.85, 1.75);
  model.add(boom);

  // Mainsail — aft of the mast; luff at z=0.05, leech stepping in.
  const mainPanels: [number, number, number][] = [
    // [centerY, height, depth(=fore-aft length)]
    [3.55, 1.3, 3.2],
    [4.85, 1.3, 2.5],
    [6.15, 1.3, 1.85],
    [7.45, 1.3, 1.2],
    [8.6, 1.0, 0.6],
  ];
  mainPanels.forEach(([py, hh, dd]) => {
    const s = box(0.14, hh, dd, '#ffffff', { roughness: 0.9 });
    s.position.set(0, py, 0.05 + dd / 2);
    model.add(s);
  });

  // Jib — forward of the mast; rear edges aligned at z=-0.55.
  const jibPanels: [number, number, number][] = [
    [3.3, 1.2, 1.9],
    [4.5, 1.2, 1.3],
    [5.6, 1.0, 0.7],
  ];
  jibPanels.forEach(([py, hh, dd]) => {
    const j = box(0.12, hh, dd, '#ffe3c2', { roughness: 0.9 });
    j.position.set(0, py, -0.55 - dd / 2);
    model.add(j);
  });

  // Bowsprit running out over the pointed prow.
  const sprit = box(0.16, 0.16, 1.6, '#6d4c41');
  sprit.position.set(0, 2.45, -3.9);
  model.add(sprit);

  // Pennant at the masthead.
  const flag = box(0.1, 0.7, 0.9, hullColor);
  flag.position.set(0, 9.55, 0.35);
  model.add(flag);

  // ---- stern night lantern (the boat's night light) ----
  const lampPost = box(0.12, 1.0, 0.12, '#5c3a1e');
  lampPost.position.set(0, 2.95, 2.3);
  model.add(lampPost);
  const lampMat = M('#ffe066', {
    emissive: new THREE.Color('#ffd166'),
    emissiveIntensity: 0.05, // ramped up at dusk by TimeOfDay
    roughness: 0.4,
  });
  const lantern = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.6, 0.42), lampMat);
  lantern.position.set(0, 3.65, 2.3);
  model.add(lantern);
  const lampCap = box(0.52, 0.14, 0.52, '#3a2410');
  lampCap.position.set(0, 4.02, 2.3);
  model.add(lampCap);
  const lampLight = new THREE.PointLight(0xffd166, 0.0, 26, 1.8);
  lampLight.position.set(0, 3.65, 2.3);
  model.add(lampLight);

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
      const pst = box(0.12, 0.55, 0.12, '#6d4c41');
      pst.position.set(sx, 2.55, pz);
      model.add(pst);
    });
  }
  [-1.5, 1.5].forEach((sx) => {
    const rail = box(0.09, 0.09, 4.0, '#8a5a2b');
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

  return { group, model, hullMat, lampMat, lampLight };
}
