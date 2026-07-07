import * as THREE from 'three';
import { box, M, type Primitives, primitives } from '../primitives';
import { mulberry32 } from '../rng';

// Each island = a Group rooted at (x, 0, z) containing land lumps + scenery
// + a wooden pier pointing back at the spawn point. The Game keeps the array
// of these around for collision + dock detection + label fade + tickers.

export type Collider = { x: number; z: number; r: number };

export type BuildHelpers = Primitives & { radius: number };

// Builders may return a per-frame ticker (e.g. socials' rotating lighthouse
// beam). Most islands have no tick — they're static after build.
export type IslandExtras = {
  tick?: (dt: number, t: number, reduced: boolean, nightAmount: number) => void;
};

export type IslandDef = {
  id: string;
  title: string;
  panel: string;
  x: number;
  z: number;
  radius: number;
  mini: string;
  grass?: string;
  beach?: string;
  labelY?: number;
  build: (g: THREE.Group, helpers: BuildHelpers) => IslandExtras | void;
};

export type Island = {
  id: string;
  title: string;
  panel: string;
  pos: THREE.Vector3;
  dock: THREE.Vector3;
  mini: string;
  group: THREE.Group;
  collR: number;
  colliders: Collider[];
  // Dock-lamp emissive materials (kept here so the TimeOfDay controller can
  // ramp emissive intensity up at dusk).
  lampMaterials: THREE.MeshStandardMaterial[];
  lampPointLights: THREE.PointLight[];
  label: THREE.Sprite;
  labelY: number;
  tick?: (dt: number, t: number, reduced: boolean, nightAmount: number) => void;
};

// Build irregular voxel "lumps" that form the coastline. Returns the lump
// rectangles so the caller can derive circle colliders from the same RNG.
function makeLand(
  g: THREE.Group,
  radius: number,
  grassCol: string | undefined,
  beachCol: string | undefined,
  seed: number,
): {
  lumps: Array<[number, number, number, number]>;
} {
  const rnd = mulberry32(seed);
  const beach = beachCol || '#e7c98a';
  const grass = grassCol || '#51cf66';
  const lumps: Array<[number, number, number, number]> = [];
  const n = 8;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + rnd() * 0.5;
    const rr = radius * (0.42 + rnd() * 0.5);
    lumps.push([
      Math.cos(a) * rr,
      Math.sin(a) * rr,
      radius * (0.55 + rnd() * 0.6),
      radius * (0.55 + rnd() * 0.6),
    ]);
  }
  // Center lump fills any gap between satellite lumps.
  lumps.push([0, 0, radius * 1.25, radius * 1.25]);

  // dirt slab below the beach
  lumps.forEach(([lx, lz, lw, ld]) => {
    const d = box(lw * 1.06, 3.2, ld * 1.06, '#a07a42');
    d.position.set(lx, -4.6, lz);
    g.add(d);
  });
  // beach
  lumps.forEach(([lx, lz, lw, ld]) => {
    const d = box(lw, 7, ld, beach);
    d.position.set(lx, -1.4, lz);
    g.add(d);
  });
  // grass cap
  lumps.forEach(([lx, lz, lw, ld]) => {
    const d = box(lw * 0.85, 1.9, ld * 0.85, grass);
    d.position.set(lx, 2.0, lz);
    g.add(d);
  });

  // grass patches (varied tones for life)
  for (let i = 0; i < 4; i++) {
    const mx = (rnd() - 0.5) * radius * 1.2;
    const mz = (rnd() - 0.5) * radius * 1.2;
    const patch = box(
      radius * (0.3 + rnd() * 0.3),
      0.3,
      radius * (0.3 + rnd() * 0.3),
      i % 2 ? '#43b35a' : '#5fd16f',
    );
    patch.position.set(mx, 3.0, mz);
    g.add(patch);
  }
  // mounds
  for (let i = 0; i < 2; i++) {
    const mx = (rnd() - 0.5) * radius;
    const mz = (rnd() - 0.5) * radius;
    const mound = box(radius * 0.4, 1.6, radius * 0.4, grass);
    mound.position.set(mx, 3.4, mz);
    g.add(mound);
  }
  // (Perimeter water rocks removed — they floated at the waterline and read
  // as debris. On-land rocks are placed per-island via helpers.rock.)

  return { lumps };
}

// Length of the wooden pier in cv units, from the coast outward. The dock
// is anchored at startZ + PIER_LENGTH (the far, open-sea end) so the boat
// parks at the pier-tip rather than alongside it. This also closes the
// "boat phases through the pier-end" bug — colliders can now cover the full
// pier length without trapping the boat past the dock.
const PIER_LENGTH = 15;

// Wooden pier pointing back at the spawn point. Adds deck, slats, posts,
// bollards, a rope coil, and a pair of glowing lanterns at the dock head.
// Returns the lantern materials + point lights so the TimeOfDay controller
// can ramp them on at dusk.
function buildPier(
  g: THREE.Group,
  dir: THREE.Vector3,
  radius: number,
): {
  lampMaterials: THREE.MeshStandardMaterial[];
  lampPointLights: THREE.PointLight[];
} {
  const dockGroup = new THREE.Group();
  dockGroup.rotation.y = Math.atan2(dir.x, dir.z);
  const L = PIER_LENGTH;
  const startZ = radius * 0.72;

  const deckBoard = box(5.2, 0.45, L, '#7a4e28');
  deckBoard.position.set(0, 1.75, startZ + L / 2);
  dockGroup.add(deckBoard);

  for (let i = 0; i < 8; i++) {
    const slat = box(5.0, 0.14, 1.4, i % 2 ? '#9c6b3f' : '#85572f');
    slat.position.set(0, 2.02, startZ + 1 + i * 1.85);
    dockGroup.add(slat);
  }
  for (let i = 0; i < 4; i++) {
    const z2 = startZ + 1.6 + i * 4.2;
    [-2.4, 2.4].forEach((s) => {
      const post = box(0.55, 4.6, 0.55, '#5c3a1e');
      post.position.set(s, 0.0, z2);
      dockGroup.add(post);
    });
  }
  [-2.0, 2.0].forEach((s) => {
    const bol = box(0.6, 1.7, 0.6, '#4a2f17');
    bol.position.set(s, 2.6, startZ + L - 1.2);
    dockGroup.add(bol);
    const cap = box(0.82, 0.3, 0.82, '#3a2410');
    cap.position.set(s, 3.5, startZ + L - 1.2);
    dockGroup.add(cap);
  });
  const coilD = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.16, 6, 14), M('#caa46a'));
  coilD.rotation.x = Math.PI / 2;
  coilD.position.set(1.9, 2.05, startZ + 3);
  dockGroup.add(coilD);

  // ---- Day/night dock lanterns ----
  // Two lanterns, one on each side of the dock head. Each has an emissive
  // box and a small PointLight cast onto the wood. The controller ramps
  // emissiveIntensity + PointLight.intensity at dusk.
  const lampMaterials: THREE.MeshStandardMaterial[] = [];
  const lampPointLights: THREE.PointLight[] = [];
  const lanternZ = startZ + L - 1.2;
  [-2.0, 2.0].forEach((sx) => {
    const arm = box(0.18, 1.6, 0.18, '#3a2410');
    arm.position.set(sx, 4.7, lanternZ);
    dockGroup.add(arm);

    const yoke = box(0.5, 0.18, 0.18, '#3a2410');
    yoke.position.set(sx, 5.4, lanternZ);
    dockGroup.add(yoke);

    const headMat = M('#ffe066', {
      emissive: new THREE.Color('#ffd166'),
      emissiveIntensity: 0.05,
      roughness: 0.4,
    });
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.85, 0.6), headMat);
    head.position.set(sx, 5.0, lanternZ);
    head.castShadow = false;
    dockGroup.add(head);
    lampMaterials.push(headMat);

    const cap = box(0.7, 0.18, 0.7, '#3a2410');
    cap.position.set(sx, 5.55, lanternZ);
    dockGroup.add(cap);

    const pl = new THREE.PointLight(0xffd166, 0.0, 22, 1.7);
    pl.position.set(sx, 5.0, lanternZ);
    dockGroup.add(pl);
    lampPointLights.push(pl);
  });

  g.add(dockGroup);
  return { lampMaterials, lampPointLights };
}

// Floating island-name sprite. Canvas-2D'd so we can use the Baloo 2 font
// instead of importing a 3D text geometry.
function makeLabel(text: string, accent: string): THREE.Sprite {
  const cv = document.createElement('canvas');
  cv.width = 512;
  cv.height = 128;
  const cx = cv.getContext('2d')!;
  cx.font = '700 60px "Baloo 2", Nunito, sans-serif';
  const tw = cx.measureText(text).width;
  const pad = 34;
  const w = Math.min(cv.width - 8, tw + pad * 2);
  const h2 = 84;
  const x0 = (cv.width - w) / 2;
  const y0 = (cv.height - h2) / 2;
  const r = 42;
  cx.beginPath();
  cx.moveTo(x0 + r, y0);
  cx.arcTo(x0 + w, y0, x0 + w, y0 + h2, r);
  cx.arcTo(x0 + w, y0 + h2, x0, y0 + h2, r);
  cx.arcTo(x0, y0 + h2, x0, y0, r);
  cx.arcTo(x0, y0, x0 + w, y0, r);
  cx.closePath();
  cx.fillStyle = 'rgba(255,255,255,0.94)';
  cx.fill();
  cx.lineWidth = 7;
  cx.strokeStyle = accent;
  cx.stroke();
  cx.fillStyle = '#1d2b36';
  cx.textAlign = 'center';
  cx.textBaseline = 'middle';
  cx.fillText(text, cv.width / 2, cv.height / 2 + 3);

  const tex = new THREE.CanvasTexture(cv);
  tex.minFilter = THREE.LinearFilter;
  tex.anisotropy = 4;
  const mat = new THREE.SpriteMaterial({
    map: tex,
    transparent: true,
    depthTest: false,
    depthWrite: false,
  });
  const spr = new THREE.Sprite(mat);
  spr.scale.set(22, 5.5, 1);
  spr.renderOrder = 999;
  return spr;
}

export function mkIsland(scene: THREE.Scene, def: IslandDef): Island {
  const g = new THREE.Group();
  g.position.set(def.x, 0, def.z);
  const seed = Math.abs(Math.floor(def.x * 73.7 + def.z * 19.3)) + 7;
  const { lumps } = makeLand(g, def.radius, def.grass, def.beach, seed);

  const extras = def.build(g, { ...primitives, radius: def.radius }) ?? undefined;
  scene.add(g);

  // cv points from this island toward the spawn (0, 0, 36) — the pier
  // extends in that direction, and the boat approaches from beyond.
  const cv = new THREE.Vector3(0, 0, 36).sub(new THREE.Vector3(def.x, 0, def.z));
  cv.y = 0;
  cv.normalize();

  // Dock anchored at the FAR end of the pier (open-sea side).
  const startD = def.radius * 0.72;
  const dockD = startD + PIER_LENGTH;
  const dock = new THREE.Vector3(def.x + cv.x * dockD, 0, def.z + cv.z * dockD);

  const pier = buildPier(g, cv, def.radius);

  // Keep labels low — just clearing the tallest props — so they sit near
  // the island in view instead of floating far overhead.
  const labelY = def.labelY ?? def.radius + 6;
  const label = makeLabel(def.title, def.mini);
  label.position.set(def.x, labelY, def.z);
  scene.add(label);

  // Per-lump circle colliders + circles down the pier.
  const colliders: Collider[] = [];
  lumps.forEach(([lx, lz, lw, ld]) => {
    const r = Math.max(lw, ld) * 0.5 * 0.9;
    colliders.push({ x: def.x + lx, z: def.z + lz, r });
  });
  const endGap = 5;
  for (let d = startD + 1; d <= dockD - endGap; d += 2.4) {
    colliders.push({ x: def.x + cv.x * d, z: def.z + cv.z * d, r: 2.2 });
  }

  return {
    id: def.id,
    title: def.title,
    panel: def.panel,
    pos: new THREE.Vector3(def.x, 0, def.z),
    dock,
    mini: def.mini,
    group: g,
    collR: def.radius * 1.7,
    colliders,
    lampMaterials: pier.lampMaterials,
    lampPointLights: pier.lampPointLights,
    label,
    labelY,
    tick: extras?.tick,
  };
}
