import * as THREE from 'three';

// Custom stylized water — matches the voxel/cartoon island look.
//
// Layers:
//   1. Subtle vertex displacement (3 traveling sin waves) so the surface
//      visibly rolls without rising above the boat's keel (y = 0.5).
//   2. Sea-color fragment base with horizon haze (gradient toward a tinted
//      "atmosphere" color far from the camera — NO THREE.Fog, this is a
//      direction-aware in-shader replacement).
//   3. ONE animated squiggly white line layer (single direction).
//   4. Per-island shoreline foam — sin wave radiating outward from each
//      island, masked to a ~8-unit band around its coastline, plus a noise
//      modulation so breakers look uneven rather than perfectly concentric.
//   5. Foam tint + night-darken uniforms come from the TimeOfDay controller,
//      so the same shader handles day, dusk, and night without re-compiles.
//   6. Slightly transparent surface + opaque deep plane below.

// Fixed-size GLSL array — accommodates the current islands + room for the
// planned Observatory + Race Cove additions.
const MAX_ISLANDS = 8;

export type IslandRef = { x: number; z: number; radius: number };

export type WaterUniforms = {
  uTime: { value: number };
  uSea: { value: THREE.Color };
  uHorizonHaze: { value: THREE.Color };
  uFoamTint: { value: THREE.Color };
  uNightAmount: { value: number };
  uIslands: { value: THREE.Vector3[] };
  uIslandCount: { value: number };
};

export type Water = {
  mesh: THREE.Mesh;
  deep: THREE.Mesh;
  uniforms: WaterUniforms;
  update: (dt: number) => void;
};

export function createWater(
  seaColor: string,
  reducedMotion: boolean,
  islands: IslandRef[],
): Water {
  // 160x160 segments over a 2600-unit plane = ~16 units/segment — still
  // comfortably under the shortest wave wavelength (~45 units, k=0.14), and
  // ~35% fewer vertices than the previous 200x200 mesh.
  const geo = new THREE.PlaneGeometry(2600, 2600, 160, 160);
  geo.rotateX(-Math.PI / 2);

  const mat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(seaColor),
    fog: false,
    transparent: true,
    opacity: 0.9,
    depthWrite: true,
  });

  // Pack islands as vec3 (x, z, radius). Padded to MAX_ISLANDS.
  const islandUniform: THREE.Vector3[] = Array.from({ length: MAX_ISLANDS }, () =>
    new THREE.Vector3(0, 0, 0),
  );
  islands.slice(0, MAX_ISLANDS).forEach((isle, i) => {
    islandUniform[i].set(isle.x, isle.z, isle.radius);
  });

  const uniforms: WaterUniforms = {
    uTime: { value: 0 },
    uSea: { value: new THREE.Color(seaColor) },
    uHorizonHaze: { value: new THREE.Color('#cfe2f5') },
    uFoamTint: { value: new THREE.Color('#ffffff') },
    uNightAmount: { value: 0 },
    uIslands: { value: islandUniform },
    uIslandCount: { value: Math.min(islands.length, MAX_ISLANDS) },
  };

  const waveAmp = reducedMotion ? 0.15 : 0.4;

  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = uniforms.uTime;
    shader.uniforms.uSea = uniforms.uSea;
    shader.uniforms.uHorizonHaze = uniforms.uHorizonHaze;
    shader.uniforms.uFoamTint = uniforms.uFoamTint;
    shader.uniforms.uNightAmount = uniforms.uNightAmount;
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
       uniform vec3 uHorizonHaze;
       uniform vec3 uFoamTint;
       uniform float uNightAmount;
       uniform vec3 uIslands[${MAX_ISLANDS}];
       uniform int uIslandCount;
       varying vec2 vXZ;

       // Cheap hash for per-cell randomness. Not crypto-quality — just
       // enough to give each cell a stable random number from its grid coords.
       float hash21(vec2 v) {
         return fract(sin(dot(v, vec2(127.1, 311.7))) * 43758.5453);
       }

       // 2D value noise — used to break up the coastal foam ring so it looks
       // like discrete crashing waves rather than a smooth concentric pulse.
       float noise2(vec2 p) {
         vec2 i = floor(p);
         vec2 f = fract(p);
         float a = hash21(i);
         float b = hash21(i + vec2(1.0, 0.0));
         float c = hash21(i + vec2(0.0, 1.0));
         float d = hash21(i + vec2(1.0, 1.0));
         vec2 u = f * f * (3.0 - 2.0 * f);
         return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
       }
      ` + shader.fragmentShader;

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <color_fragment>',
      `#include <color_fragment>
       vec3 col = uSea;

       // ---- evenly spaced squiggle marks (cell-based) ----
       vec2 p = vXZ + vec2(uTime * 0.9, uTime * 0.4);
       vec2 cellSize = vec2(60.0, 42.0);
       vec2 cell  = floor(p / cellSize);
       vec2 jitter = vec2(
         hash21(cell + vec2(5.0, 7.0)),
         hash21(cell + vec2(13.0, 19.0))
       ) - 0.5;
       vec2 cellLocal = fract(p / cellSize) - 0.5 - jitter * 0.20;
       vec2 local = vec2(cellLocal.x * cellSize.x / cellSize.y, cellLocal.y);
       float ang   = 0.3;
       float phase = hash21(cell + vec2(11.0, 23.0)) * 6.2831;
       float sa = sin(ang), ca = cos(ang);
       vec2 r = vec2(local.x * ca + local.y * sa, -local.x * sa + local.y * ca);
       float curveY = sin(r.x * 10.0 + phase + uTime * 0.7) * 0.07;
       float distToCurve = abs(r.y - curveY);
       float onMark     = smoothstep(0.024, 0.010, distToCurve);
       float withinSpan = smoothstep(0.48, 0.42, abs(r.x));
       float squiggles = onMark * withinSpan;
       // Squiggle highlight color = foam tint (matches the breaker color);
       // at night, foam tint darkens automatically via TimeOfDay.
       col = mix(col, uFoamTint, squiggles * 0.26);

       // ---- shoreline foam: waves crashing into the islands ----
       // For each island, compute a sin pulse traveling outward from its
       // center, masked to a thin ring around the coastline, with noise
       // modulation so the foam reads as discrete breakers.
       float foam = 0.0;
       for (int i = 0; i < ${MAX_ISLANDS}; i++) {
         if (i >= uIslandCount) break;
         vec3 isle = uIslands[i];
         vec2 off = vXZ - vec2(isle.x, isle.y);
         float distToCenter = length(off);
         float angleAround = atan(off.y, off.x);
         // Two pulses out of phase + a third faster ripple — looks more like
         // sea swell hitting the shore than a single radiating ring.
         float pulseA = sin(uTime * 1.6 - distToCenter * 0.42);
         float pulseB = sin(uTime * 0.95 - distToCenter * 0.28 + 1.3);
         float pulseC = sin(uTime * 2.5 - distToCenter * 0.6 + angleAround * 2.0);
         float pulse = pulseA * 0.55 + pulseB * 0.35 + pulseC * 0.25;
         // Mask: within ~8 units of the coastline (either side).
         float coastBand = smoothstep(8.0, 0.0, abs(distToCenter - isle.z));
         // Per-angle noise so each "breaker" along the coast is uneven.
         float n = noise2(vec2(angleAround * 3.0 + uTime * 0.4, isle.z * 0.1));
         float crest = pulse * (0.55 + 0.6 * n);
         foam = max(foam, crest * coastBand);
       }
       // Keep only the bright crests so foam looks like discrete breakers.
       float islandFoam = smoothstep(0.30, 0.95, foam);

       // (Per-rock foam splashes were cut for performance: a 32-iteration
       // loop with atan + noise per fragment over the biggest surface on
       // screen. The shoreline foam above carries the "waves on the coast"
       // read on its own.)
       float foamMask = islandFoam;
       col = mix(col, uFoamTint, foamMask * 0.6);

       // ---- atmospheric haze toward horizon ----
       // Distance-based blend from sea color to the horizon-haze color (the
       // same color the sky's horizon band uses). Replaces THREE.Fog with a
       // direction-aware shader gradient that the TimeOfDay controller
       // retints every frame.
       float hazeT = smoothstep(80.0, 620.0, length(vXZ));
       col = mix(col, uHorizonHaze, hazeT * 0.7);

       // Night darken: when uNightAmount climbs, deepen everything that isn't
       // pure foam. Keeps the breakers visible against a darker sea.
       col *= mix(1.0, 0.55, uNightAmount * (1.0 - foamMask));

       diffuseColor.rgb = col;`,
    );
  };

  const mesh = new THREE.Mesh(geo, mat);

  // ---- DEEP PLANE ----
  // Backstop a few units below the surface so the slightly-transparent
  // surface composites against a darker sea tone (rather than the sky)
  // when looking straight down. Tinted from the time-of-day sea color via
  // a small uniform; we just dim a multiplier here.
  const deepGeo = new THREE.PlaneGeometry(2600, 2600);
  deepGeo.rotateX(-Math.PI / 2);
  const deepMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color('#062a48'),
    fog: false,
  });
  const deep = new THREE.Mesh(deepGeo, deepMat);
  deep.position.y = -3;

  return {
    mesh,
    deep,
    uniforms,
    update: (dt: number) => {
      uniforms.uTime.value += dt;
    },
  };
}
