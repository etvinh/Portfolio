import * as THREE from 'three';

// Particle wake system. Replaces the prototype's expanding circle-mesh foam.
//
// One THREE.Points object, fixed-size attribute buffers, ring-buffer head.
// Spawning is "set the next slot's life to 0"; updating ages all living
// particles and marks them dead when expired. No per-frame allocation,
// no per-frame mesh add/remove churn.
//
// The shader draws each particle as a soft circle with a brighter ring on
// the outer edge — gives the spray-and-bubble look without a texture asset.

const MAX_PARTICLES = 280;
const PARTICLE_LIFE = 0.95;

export type Wake = {
  object: THREE.Points;
  spawn: (
    x: number,
    z: number,
    forwardX: number,
    forwardZ: number,
    speedMag: number,
  ) => void;
  update: (dt: number) => void;
  setReduced: (reduced: boolean) => void;
  dispose: () => void;
};

export function createWake(reducedMotion: boolean): Wake {
  const positions = new Float32Array(MAX_PARTICLES * 3);
  const lifes = new Float32Array(MAX_PARTICLES);
  const sizes = new Float32Array(MAX_PARTICLES);
  const seeds = new Float32Array(MAX_PARTICLES);
  // Per-particle velocities live CPU-side; we don't need them in the shader
  // since position is updated each frame.
  const velocities = new Float32Array(MAX_PARTICLES * 2);

  for (let i = 0; i < MAX_PARTICLES; i++) {
    lifes[i] = -1;
    positions[i * 3 + 1] = -1000;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('aLife', new THREE.BufferAttribute(lifes, 1));
  geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
  geo.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));

  // Must match the renderer's pixel-ratio cap (scene.ts) — gl_PointSize is in
  // framebuffer pixels, so a mismatch renders the wake blobs over/undersized.
  const dpr = typeof window !== 'undefined' ? Math.min(1.25, window.devicePixelRatio || 1) : 1;

  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.NormalBlending,
    uniforms: {
      uMaxLife: { value: PARTICLE_LIFE },
      uPixelRatio: { value: dpr },
      uTint: { value: new THREE.Color('#ffffff') },
    },
    vertexShader: /* glsl */ `
      attribute float aLife;
      attribute float aSize;
      attribute float aSeed;
      uniform float uMaxLife;
      uniform float uPixelRatio;
      varying float vAlpha;
      varying float vT;
      varying float vSeed;
      void main() {
        if (aLife < 0.0) {
          gl_PointSize = 0.0;
          gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
          vAlpha = 0.0;
          vT = 0.0;
          vSeed = 0.0;
          return;
        }
        float t = clamp(aLife / uMaxLife, 0.0, 1.0);
        vT = t;
        vSeed = aSeed;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        // Cull particles at/behind the camera plane. Without this, the
        // perspective divide below blows the point up into a screen-sized
        // quad (a giant dark square with the foam ring in its middle).
        if (mv.z > -2.0) {
          gl_PointSize = 0.0;
          gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
          vAlpha = 0.0;
          return;
        }
        // Grow over lifetime; perspective-scale by -1/z, hard-capped so a
        // near-camera particle can never fill the screen.
        float grow = 1.0 + t * 2.4;
        float size = aSize * grow * uPixelRatio * (260.0 / -mv.z);
        gl_PointSize = min(size, 64.0 * uPixelRatio);
        gl_Position = projectionMatrix * mv;
        vAlpha = (1.0 - t) * (1.0 - t) * 0.85;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uTint;
      varying float vAlpha;
      varying float vT;
      varying float vSeed;
      void main() {
        vec2 d = gl_PointCoord - vec2(0.5);
        float r = length(d) * 2.0;
        if (r > 1.0) discard;
        // Soft circle base + brighter outer ring; older particles are mostly ring.
        float core = smoothstep(1.0, 0.0, r) * (1.0 - vT * 0.7);
        float ringW = mix(0.22, 0.42, vT);
        float ringPos = mix(0.45, 0.78, vT);
        float ring = smoothstep(ringPos - ringW, ringPos, r) -
                     smoothstep(ringPos, ringPos + 0.18, r);
        float a = max(core * 0.6, ring * 1.0);
        // Slight per-particle hue jitter — keeps it from looking uniform.
        vec3 col = uTint * (1.0 - vSeed * 0.08);
        gl_FragColor = vec4(col, a * vAlpha);
      }
    `,
  });

  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  points.renderOrder = 5;

  let head = 0;
  let spawnAcc = 0;
  let reduced = reducedMotion;

  const spawn = (
    x: number,
    z: number,
    forwardX: number,
    forwardZ: number,
    speedMag: number,
  ): void => {
    // Two trailing particles per call — one on each side of the wake.
    for (let k = 0; k < 2; k++) {
      const i = head;
      head = (head + 1) % MAX_PARTICLES;
      const sideSign = k === 0 ? -1 : 1;
      // Stagger laterally; jitter to avoid two perfect rails.
      const lateral = sideSign * (0.6 + Math.random() * 1.3);
      const lx = -forwardZ * lateral;
      const lz = forwardX * lateral;
      // Spawn slightly behind the boat so the wake doesn't poke out of its bow.
      positions[i * 3] = x - forwardX * 2.4 + lx;
      positions[i * 3 + 1] = 0.32;
      positions[i * 3 + 2] = z - forwardZ * 2.4 + lz;
      // Drift away from the boat + outward; tiny jitter.
      velocities[i * 2] =
        -forwardX * (0.6 + Math.random() * 0.5) +
        (-forwardZ) * sideSign * (0.5 + Math.random() * 0.4);
      velocities[i * 2 + 1] =
        -forwardZ * (0.6 + Math.random() * 0.5) +
        forwardX * sideSign * (0.5 + Math.random() * 0.4);
      lifes[i] = 0;
      sizes[i] = 9 + Math.random() * 4 + Math.min(8, speedMag * 0.35);
      seeds[i] = Math.random();
    }
  };

  return {
    object: points,
    spawn: (x, z, fx, fz, speedMag) => {
      // Caller drives spawn rate via accumulator: only emit when accumulator
      // ticks over the interval. Keeps wake density consistent across FPS.
      spawnAcc += 1; // each external call counts as one tick
      if (spawnAcc < 1) return;
      spawnAcc = 0;
      spawn(x, z, fx, fz, speedMag);
    },
    update: (dt) => {
      const drag = reduced ? 0.65 : 0.85;
      for (let i = 0; i < MAX_PARTICLES; i++) {
        if (lifes[i] < 0) continue;
        lifes[i] += dt;
        if (lifes[i] >= PARTICLE_LIFE) {
          lifes[i] = -1;
          // park dead particles below water so the GPU can't accidentally
          // light them up if a stale uniform sticks around for a frame.
          positions[i * 3 + 1] = -1000;
          continue;
        }
        positions[i * 3] += velocities[i * 2] * dt;
        positions[i * 3 + 2] += velocities[i * 2 + 1] * dt;
        velocities[i * 2] *= 1 - dt * drag;
        velocities[i * 2 + 1] *= 1 - dt * drag;
      }
      geo.attributes.position.needsUpdate = true;
      geo.attributes.aLife.needsUpdate = true;
      geo.attributes.aSize.needsUpdate = true;
      geo.attributes.aSeed.needsUpdate = true;
    },
    setReduced: (r) => {
      reduced = r;
    },
    dispose: () => {
      geo.dispose();
      mat.dispose();
    },
  };
}
