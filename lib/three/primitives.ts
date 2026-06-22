// Reusable voxel primitives, ported from the prototype. Everything in the
// world is built from boxes + a handful of helpers — keep this file pure
// (no Scene, no globals) so callers can compose freely.

import * as THREE from 'three';

type MatOpts = THREE.MeshStandardMaterialParameters;

export function M(color: string | number, opts?: MatOpts): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color(color),
    flatShading: true,
    roughness: 0.82,
    metalness: 0,
    ...opts,
  });
}

export function box(
  w: number,
  h: number,
  d: number,
  color: string | number,
  opts?: MatOpts,
): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), M(color, opts));
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

export function cyl(
  rt: number,
  rb: number,
  h: number,
  color: string | number,
  seg = 16,
  opts?: MatOpts,
): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), M(color, opts));
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

export function cone(
  r: number,
  h: number,
  color: string | number,
  seg = 16,
  opts?: MatOpts,
): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.ConeGeometry(r, h, seg), M(color, opts));
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

export function sph(r: number, color: string | number, opts?: MatOpts): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 12), M(color, opts));
  m.castShadow = true;
  return m;
}

// LEGO-style stud — used in places where authenticity warrants it.
export function stud(color: string | number): THREE.Mesh {
  return cyl(0.42, 0.42, 0.28, color, 12);
}

export function addStuds(
  parent: THREE.Object3D,
  topY: number,
  color: string | number,
  coords: [number, number][],
): void {
  coords.forEach(([x, z]) => {
    const s = stud(color);
    s.position.set(x, topY + 0.14, z);
    parent.add(s);
  });
}

// ---- scenery ----

export function tree(x: number, z: number, s: number, leaf?: string): THREE.Group {
  const tg = new THREE.Group();
  const bark = '#7a4a24';
  const bark2 = '#8a5a2b';
  const t1 = box(0.7 * s, 1.1 * s, 0.7 * s, bark);
  t1.position.y = 0.55 * s;
  tg.add(t1);
  const t2 = box(0.6 * s, 1.1 * s, 0.6 * s, bark2);
  t2.position.set(0.06 * s, 1.5 * s, -0.04 * s);
  tg.add(t2);
  const root1 = box(0.4 * s, 0.4 * s, 0.4 * s, bark);
  root1.position.set(0.42 * s, 0.2 * s, 0.1 * s);
  tg.add(root1);
  const root2 = box(0.4 * s, 0.4 * s, 0.4 * s, bark);
  root2.position.set(-0.4 * s, 0.2 * s, -0.18 * s);
  tg.add(root2);
  const branch = box(0.34 * s, 0.34 * s, 0.9 * s, bark2);
  branch.position.set(0.5 * s, 1.7 * s, 0.3 * s);
  branch.rotation.x = 0.4;
  tg.add(branch);

  const l1 = leaf || '#2f9e44';
  const l2 = leaf || '#43b35a';
  const l3 = leaf || '#268a3c';
  const blob = (bx: number, by: number, bz: number, w: number, hh: number, dd: number, c: string) => {
    const m = box(w * s, hh * s, dd * s, c);
    m.position.set(bx * s, by * s, bz * s);
    tg.add(m);
  };
  blob(0, 2.7, 0, 2.6, 1.0, 2.6, l1);
  blob(-1.1, 2.9, 0.5, 1.2, 0.9, 1.2, l3);
  blob(1.1, 2.8, -0.6, 1.3, 1.0, 1.3, l3);
  blob(0.5, 3.0, 1.1, 1.1, 0.9, 1.1, l2);
  blob(0, 3.7, 0, 2.0, 1.0, 2.0, l2);
  blob(-0.7, 4.0, -0.5, 1.1, 0.9, 1.1, l1);
  blob(0.7, 4.1, 0.4, 1.0, 0.9, 1.0, l1);
  blob(0, 4.7, 0, 1.2, 1.0, 1.2, l2);
  blob(0, 5.4, 0.1, 0.6, 0.6, 0.6, l3);

  tg.position.set(x, 2.8, z);
  tg.rotation.y = ((x * 13.1 + z * 7.7) % 6.28);
  return tg;
}

export function rock(x: number, z: number, s: number, col?: string): THREE.Group {
  const rg = new THREE.Group();
  const c1 = col || '#7d8488';
  const c2 = col || '#909a9e';
  const c3 = col || '#6a7074';
  const blk = (bx: number, by: number, bz: number, w: number, hh: number, dd: number, c: string) => {
    const m = box(w, hh, dd, c);
    m.position.set(bx, by, bz);
    m.rotation.y = (bx + bz) * 0.3;
    rg.add(m);
  };
  blk(0, 0.6 * s, 0, 1.5 * s, 1.2 * s, 1.5 * s, c1);
  blk(0.85 * s, 0.45 * s, 0.2 * s, 1.0 * s, 0.9 * s, 1.1 * s, c2);
  blk(-0.7 * s, 0.4 * s, -0.4 * s, 0.9 * s, 0.8 * s, 0.9 * s, c3);
  blk(0.2 * s, 1.25 * s, -0.3 * s, 0.9 * s, 0.8 * s, 0.9 * s, c2);
  blk(-0.3 * s, 1.0 * s, 0.6 * s, 0.7 * s, 0.6 * s, 0.7 * s, c1);
  blk(0.5 * s, 1.6 * s, 0.25 * s, 0.5 * s, 0.5 * s, 0.5 * s, c3);
  rg.position.set(x, 2.6, z);
  return rg;
}

export function flower(x: number, z: number, col?: string): THREE.Group {
  const fg = new THREE.Group();
  const stem = box(0.16, 1.0, 0.16, '#2f9e44');
  stem.position.y = 0.5;
  fg.add(stem);
  const leafA = box(0.4, 0.16, 0.16, '#37b24d');
  leafA.position.set(0.26, 0.5, 0);
  fg.add(leafA);
  const leafB = box(0.16, 0.16, 0.4, '#268a3c');
  leafB.position.set(0, 0.72, 0.26);
  fg.add(leafB);
  const c = col || '#ff6b9d';
  const core = box(0.34, 0.34, 0.34, '#ffd43b');
  core.position.y = 1.2;
  fg.add(core);
  const petal = (dx: number, dz: number) => {
    const p = box(0.3, 0.3, 0.3, c);
    p.position.set(dx, 1.2, dz);
    fg.add(p);
  };
  petal(0.34, 0);
  petal(-0.34, 0);
  petal(0, 0.34);
  petal(0, -0.34);
  const top = box(0.22, 0.22, 0.22, c);
  top.position.y = 1.5;
  fg.add(top);
  fg.position.set(x, 2.8, z);
  fg.rotation.y = (x * 5.3 + z) % 6.28;
  return fg;
}

export function lamp(x: number, z: number): THREE.Group {
  const lg = new THREE.Group();
  const pole = box(0.3, 4.0, 0.3, '#37424c');
  pole.position.y = 2.0;
  lg.add(pole);
  const arm = box(0.3, 0.3, 1.0, '#37424c');
  arm.position.set(0, 4.0, 0.4);
  lg.add(arm);
  const head = box(0.95, 0.95, 0.95, '#ffe066', {
    emissive: new THREE.Color('#ffd43b'),
    emissiveIntensity: 1.0,
  });
  head.position.set(0, 3.9, 0.8);
  lg.add(head);
  lg.position.set(x, 2.8, z);
  return lg;
}

export function barrel(x: number, z: number, col?: string): THREE.Group {
  const g2 = new THREE.Group();
  const b = cyl(0.6, 0.6, 1.4, col || '#8a5a2b', 12);
  b.position.set(x, 3.6, z);
  const band = cyl(0.64, 0.64, 0.2, '#5c3a1e', 12);
  band.position.set(x, 3.9, z);
  g2.add(b);
  g2.add(band);
  return g2;
}

export type Primitives = {
  box: typeof box;
  cyl: typeof cyl;
  cone: typeof cone;
  sph: typeof sph;
  stud: typeof stud;
  addStuds: typeof addStuds;
  tree: typeof tree;
  rock: typeof rock;
  flower: typeof flower;
  lamp: typeof lamp;
  barrel: typeof barrel;
  M: typeof M;
};

export const primitives: Primitives = {
  box,
  cyl,
  cone,
  sph,
  stud,
  addStuds,
  tree,
  rock,
  flower,
  lamp,
  barrel,
  M,
};
