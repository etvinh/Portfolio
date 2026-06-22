import * as THREE from 'three';

// Custom stylized water — matches the voxel/cartoon island look.
//
// Layers:
//   1. Subtle vertex displacement (3 traveling sin waves) so the surface
//      visibly rolls without rising above the boat's keel (y = 0.5).
//   2. Flat sea-color fragment base with a slight horizon-depth tint.
//   3. ONE animated squiggly white line layer (single direction).
//   4. NEW: per-island shoreline foam — a sin wave radiating outward from
//      each island, masked to a ~8-unit band around its coastline.
//      Gives the "waves crashing on the shore" pulse.
//   5. Slightly transparent surface + opaque deep plane below, so the
//      submerged half of each beach is faintly visible at the shore.

// Fixed-size GLSL array — accommodates the current 5 islands + room for
// the planned Observatory + Race Cove additions in later chunks.
const MAX_ISLANDS = 8;

export type IslandRef = { x: number; z: number; radius: number };

export type Water = {
  mesh: THREE.Mesh;
  deep: THREE.Mesh;
  update: (dt: number) => void;
};

export function createWater(
  seaColor: string,
  reducedMotion: boolean,
  islands: IslandRef[],
): Water {
  // 200x200 segments over a 2600-unit plane = ~13 units/segment. Keep wave
  // wavelengths longer than that to avoid aliasing.
  const geo = new THREE.PlaneGeometry(2600, 2600, 200, 200);
  geo.rotateX(-Math.PI / 2);

  const mat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(seaColor),
    fog: true,
    transparent: true,
    opacity: 0.86,
    depthWrite: true,
  });

  // Pack islands as vec3 (x, z, radius). Padded out to MAX_ISLANDS so the
  // GLSL fixed-size array always has defined values.
  const islandUniform: THREE.Vector3[] = Array.from({ length: MAX_ISLANDS }, () =>
    new THREE.Vector3(0, 0, 0),
  );
  islands.slice(0, MAX_ISLANDS).forEach((isle, i) => {
    islandUniform[i].set(isle.x, isle.z, isle.radius);
  });

  const uniforms = {
    uTime: { value: 0 },
    uSea: { value: new THREE.Color(seaColor) },
    uIslands: { value: islandUniform },
    uIslandCount: { value: Math.min(islands.length, MAX_ISLANDS) },
  };

  const waveAmp = reducedMotion ? 0.15 : 0.4;

  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = uniforms.uTime;
    shader.uniforms.uSea = uniforms.uSea;
    shader.uniforms.uIslands = uniforms.uIslands;
    shader.uniforms.uIslandCount = uniforms.uIslandCount;

    // ---- VERTEX: three traveling waves ----
    shader.vertexShader =
      `uniform float uTime;
       varying vec2 vXZ;
       const float A1=${waveAmp.toFixed(2)}, A2=${(waveAmp * 0.7).toFixed(2)}, A3=${(waveAmp * 0.45).toFixed(2)};
       const float k1=0.085, k2=0.11, k3=0.14;
       const float s1=1.1, s2=0.85, s3=1.35;
      ` + shader.vertexShader;

    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `vec3 transformed = vec3(position);
       float h = A1 * sin(position.x * k1 + uTime * s1);
       h     += A2 * cos(position.z * k2 + uTime * s2);
       h     += A3 * sin((position.x + position.z) * k3 + uTime * s3);
       transformed.y += h;
       vXZ = position.xz;`,
    );

    // ---- FRAGMENT ----
    shader.fragmentShader =
      `uniform float uTime;
       uniform vec3 uSea;
       uniform vec3 uIslands[${MAX_ISLANDS}];
       uniform int uIslandCount;
       varying vec2 vXZ;

       // Cheap hash for per-cell randomness. Not crypto-quality — just
       // enough to give each cell a stable random number from its grid coords.
       float hash21(vec2 v) {
         return fract(sin(dot(v, vec2(127.1, 311.7))) * 43758.5453);
       }
      ` + shader.fragmentShader;

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <color_fragment>',
      `#include <color_fragment>
       vec3 col = uSea;

       // ---- evenly spaced squiggle marks (cell-based) ----
       // Divide the surface into cells; EVERY cell gets a squiggle so the
       // spacing is regular. Each cell's phase is randomized so the marks
       // don't all line up identically. The whole field drifts with time.
       vec2 p = vXZ + vec2(uTime * 0.9, uTime * 0.4);
       // Asymmetric cell — wider horizontally than vertically so marks are
       // spaced further apart left-to-right without changing their length
       // or top-to-bottom spacing.
       vec2 cellSize = vec2(60.0, 42.0);
       vec2 cell  = floor(p / cellSize);

       // Per-cell position jitter — shifts each mark a small amount away
       // from the cell center so the marks don't form a perfect grid.
       vec2 jitter = vec2(
         hash21(cell + vec2(5.0, 7.0)),
         hash21(cell + vec2(13.0, 19.0))
       ) - 0.5;

       vec2 cellLocal = fract(p / cellSize) - 0.5 - jitter * 0.20;
       // Stretch local.x by aspect ratio. The mark-drawing math below uses
       // a square span (abs r.x < 0.42), so a non-square cellLocal would
       // distort the mark. Rescaling here keeps mark length proportional
       // to cellSize.y — only the horizontal cell spacing changes.
       vec2 local = vec2(cellLocal.x * cellSize.x / cellSize.y, cellLocal.y);

       // Constant angle — every squiggle points the same direction.
       float ang   = 0.3;
       float phase = hash21(cell + vec2(11.0, 23.0)) * 6.2831;

       float sa = sin(ang), ca = cos(ang);
       vec2 r = vec2(local.x * ca + local.y * sa, -local.x * sa + local.y * ca);

       // mark shape: r.y stays close to a sin curve along r.x.
       // Higher frequency (10) + slightly bigger amplitude = visibly wavy.
       float curveY = sin(r.x * 10.0 + phase + uTime * 0.7) * 0.07;
       float distToCurve = abs(r.y - curveY);
       // Tighter threshold = thinner line.
       float onMark     = smoothstep(0.024, 0.010, distToCurve);
       // Long mark spanning almost the whole cell.
       float withinSpan = smoothstep(0.48, 0.42, abs(r.x));

       float squiggles = onMark * withinSpan;
       col = mix(col, vec3(1.0), squiggles * 0.28);

       // ---- shoreline foam: waves crashing into the islands ----
       // For each island, compute a sin pulse traveling outward from its
       // center. Mask to within a thin ring around the coastline so the
       // foam reads as breakers rather than concentric ripples.
       float foam = 0.0;
       for (int i = 0; i < ${MAX_ISLANDS}; i++) {
         if (i >= uIslandCount) break;
         vec3 isle = uIslands[i];
         float distToCenter = length(vXZ - vec2(isle.x, isle.y));
         // pulse radiates outward from the island center; coast is at isle.z
         float pulse = sin(uTime * 1.8 - distToCenter * 0.45);
         // mask: only within ~7 units of the coastline (either side)
         float coastBand = smoothstep(7.0, 0.0, abs(distToCenter - isle.z));
         foam = max(foam, pulse * coastBand);
       }
       // keep only the bright crests so foam looks like discrete breakers
       foam = smoothstep(0.35, 0.95, foam);
       col = mix(col, vec3(1.0), foam * 0.55);

       // ---- horizon depth tint (subtle) ----
       vec3 deepTint = uSea * 0.5;
       float depthMix = smoothstep(60.0, 500.0, length(vXZ)) * 0.35;
       col = mix(col, deepTint, depthMix);

       diffuseColor.rgb = col;`,
    );
  };

  const mesh = new THREE.Mesh(geo, mat);

  // ---- DEEP PLANE ----
  // Backstop a few units below the surface so the slightly-transparent
  // surface composites against a darker sea tone (rather than the sky)
  // when looking straight down. Submerged half of each beach still shows
  // through the surface; deeper geometry is hidden by this plane.
  const deepGeo = new THREE.PlaneGeometry(2600, 2600);
  deepGeo.rotateX(-Math.PI / 2);
  const deepMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color('#062a48'),
    fog: true,
  });
  const deep = new THREE.Mesh(deepGeo, deepMat);
  deep.position.y = -3;

  return {
    mesh,
    deep,
    update: (dt: number) => {
      uniforms.uTime.value += dt;
    },
  };
}
