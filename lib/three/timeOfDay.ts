import * as THREE from 'three';

// Time-of-day controller. Drives a continuous cycle (default 4 minutes)
// through five named keyframes — midnight / dawn / noon / dusk / twilight —
// and lerps every color + intensity it owns between adjacent stops.
//
// The Game wires its sky uniforms, lights, water uniforms, dock-lamp emissive
// materials, and the bloom pass into a single TimeOfDay instance; each
// animation frame the controller pushes new values into all of them.
//
// Cycle is real time, not game time — players sailing a single circuit will
// see the sun move noticeably.

const CYCLE_SECONDS = 240; // one full day in 4 minutes

// Global exposure scale. The per-keyframe `exposure` values were tuned for the
// old post pipeline, which (due to a render-target tone-mapping gate) never
// actually applied ACES — the scene was only sRGB-encoded. Now OutputPass
// applies ACES once, which lifts the whole image, so we knock exposure down
// uniformly here to preserve the day/night curve while restoring the intended
// brightness. Tune this one number for overall scene brightness.
const EXPOSURE_SCALE = 0.7;

export type TODKey = {
  t: number; // phase in [0, 1)
  skyTop: string;
  skyBottom: string;
  skyHorizon: string;
  sunDir: [number, number, number]; // unnormalized; controller normalizes
  sunColor: string;
  sunIntensity: number;
  hemiSky: string;
  hemiGround: string;
  hemiIntensity: number;
  ambientColor: string;
  ambientIntensity: number;
  waterColor: string;
  horizonHaze: string;
  foamTint: string;
  lampIntensity: number; // 0 day, 1 night — multiplies lamp emissive
  bloomStrength: number;
  exposure: number;
};

// Hand-tuned keyframes. The midnight stop is duplicated at both 0 and 1 so
// linear interpolation wraps cleanly without a special-case branch.
const KEYS: TODKey[] = [
  {
    t: 0.0,
    skyTop: '#070a1c',
    skyBottom: '#141a3a',
    skyHorizon: '#2a3258',
    sunDir: [-0.4, -0.6, 0.5],
    sunColor: '#2a3450',
    sunIntensity: 0.06,
    hemiSky: '#1a2548',
    hemiGround: '#0d1428',
    hemiIntensity: 0.22,
    ambientColor: '#1a2340',
    ambientIntensity: 0.18,
    waterColor: '#04162b',
    horizonHaze: '#1f284a',
    foamTint: '#7a86b8',
    lampIntensity: 1.0,
    bloomStrength: 0.95,
    exposure: 0.78,
  },
  {
    t: 0.22,
    skyTop: '#3a5078',
    skyBottom: '#ffb878',
    skyHorizon: '#ff8a4a',
    sunDir: [0.85, 0.25, 0.3],
    sunColor: '#ffb070',
    sunIntensity: 0.62,
    hemiSky: '#dca080',
    hemiGround: '#5a4530',
    hemiIntensity: 0.5,
    ambientColor: '#6a5a7a',
    ambientIntensity: 0.18,
    waterColor: '#3a456a',
    horizonHaze: '#ffa070',
    foamTint: '#ffd8b0',
    lampIntensity: 0.5,
    bloomStrength: 0.7,
    exposure: 0.76,
  },
  {
    t: 0.45,
    skyTop: '#1f4f80',
    skyBottom: '#9fd3ff',
    skyHorizon: '#cfe6ff',
    sunDir: [0.45, 0.85, 0.4],
    sunColor: '#ffe6c2',
    sunIntensity: 0.85,
    hemiSky: '#8aa6c8',
    hemiGround: '#4a5538',
    hemiIntensity: 0.55,
    ambientColor: '#6678a0',
    ambientIntensity: 0.16,
    waterColor: '#0a4a6e',
    horizonHaze: '#cfe2f5',
    foamTint: '#ffffff',
    lampIntensity: 0.0,
    bloomStrength: 0.45,
    exposure: 0.74,
  },
  {
    t: 0.68,
    skyTop: '#5a3870',
    skyBottom: '#ff7848',
    skyHorizon: '#ff5a3c',
    sunDir: [-0.85, 0.2, 0.35],
    sunColor: '#ff8c4a',
    sunIntensity: 0.55,
    hemiSky: '#c87060',
    hemiGround: '#503020',
    hemiIntensity: 0.45,
    ambientColor: '#8a4060',
    ambientIntensity: 0.2,
    waterColor: '#5a3868',
    horizonHaze: '#ff7848',
    foamTint: '#ffcfb0',
    lampIntensity: 0.7,
    bloomStrength: 0.75,
    exposure: 0.77,
  },
  {
    t: 0.85,
    skyTop: '#16204a',
    skyBottom: '#3a3870',
    skyHorizon: '#5a4880',
    sunDir: [-0.5, -0.4, 0.4],
    sunColor: '#4a3870',
    sunIntensity: 0.1,
    hemiSky: '#2a2c4a',
    hemiGround: '#15182a',
    hemiIntensity: 0.22,
    ambientColor: '#252b48',
    ambientIntensity: 0.2,
    waterColor: '#101a36',
    horizonHaze: '#3a3268',
    foamTint: '#9098c4',
    lampIntensity: 1.0,
    bloomStrength: 0.92,
    exposure: 0.82,
  },
  {
    t: 1.0,
    skyTop: '#070a1c',
    skyBottom: '#141a3a',
    skyHorizon: '#2a3258',
    sunDir: [-0.4, -0.6, 0.5],
    sunColor: '#2a3450',
    sunIntensity: 0.06,
    hemiSky: '#1a2548',
    hemiGround: '#0d1428',
    hemiIntensity: 0.22,
    ambientColor: '#1a2340',
    ambientIntensity: 0.18,
    waterColor: '#04162b',
    horizonHaze: '#1f284a',
    foamTint: '#7a86b8',
    lampIntensity: 1.0,
    bloomStrength: 0.95,
    exposure: 0.78,
  },
];

function lerpColor(a: THREE.Color, b: THREE.Color, t: number, out: THREE.Color): void {
  out.setRGB(
    a.r + (b.r - a.r) * t,
    a.g + (b.g - a.g) * t,
    a.b + (b.b - a.b) * t,
  );
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

// Pre-bake THREE.Color instances from the hex keyframes — avoids creating
// per-frame Color objects (which the GC notices on lower-end devices).
type BakedKey = {
  t: number;
  skyTop: THREE.Color;
  skyBottom: THREE.Color;
  skyHorizon: THREE.Color;
  sunDir: THREE.Vector3;
  sunColor: THREE.Color;
  sunIntensity: number;
  hemiSky: THREE.Color;
  hemiGround: THREE.Color;
  hemiIntensity: number;
  ambientColor: THREE.Color;
  ambientIntensity: number;
  waterColor: THREE.Color;
  horizonHaze: THREE.Color;
  foamTint: THREE.Color;
  lampIntensity: number;
  bloomStrength: number;
  exposure: number;
};

function bake(k: TODKey): BakedKey {
  const dir = new THREE.Vector3(...k.sunDir).normalize();
  return {
    t: k.t,
    skyTop: new THREE.Color(k.skyTop),
    skyBottom: new THREE.Color(k.skyBottom),
    skyHorizon: new THREE.Color(k.skyHorizon),
    sunDir: dir,
    sunColor: new THREE.Color(k.sunColor),
    sunIntensity: k.sunIntensity,
    hemiSky: new THREE.Color(k.hemiSky),
    hemiGround: new THREE.Color(k.hemiGround),
    hemiIntensity: k.hemiIntensity,
    ambientColor: new THREE.Color(k.ambientColor),
    ambientIntensity: k.ambientIntensity,
    waterColor: new THREE.Color(k.waterColor),
    horizonHaze: new THREE.Color(k.horizonHaze),
    foamTint: new THREE.Color(k.foamTint),
    lampIntensity: k.lampIntensity,
    bloomStrength: k.bloomStrength,
    exposure: k.exposure,
  };
}

const BAKED: BakedKey[] = KEYS.map(bake);

export type TimeOfDayInputs = {
  skyUniforms: {
    uTop: { value: THREE.Color };
    uBot: { value: THREE.Color };
    uHorizon: { value: THREE.Color };
    uPhase: { value: number };
  };
  waterUniforms: {
    uSea: { value: THREE.Color };
    uHorizonHaze: { value: THREE.Color };
    uFoamTint: { value: THREE.Color };
    uNightAmount: { value: number };
  };
  sun: THREE.DirectionalLight;
  hemi: THREE.HemisphereLight;
  ambient: THREE.AmbientLight;
  renderer: THREE.WebGLRenderer;
  lampMaterials: THREE.MeshStandardMaterial[]; // dock + lighthouse lamps
  lampBaseIntensities: number[];               // per-material rest intensity
  lampPointLights: THREE.PointLight[];         // optional cast lights at dusk
  lampPointBaseIntensities: number[];
  // Optional: bloom pass to scale strength with darkness
  onBloomStrength?: (strength: number) => void;
};

export class TimeOfDay {
  private elapsed = 0;
  private current: BakedKey;
  private inputs: TimeOfDayInputs;
  private distance = 220; // sun mounted on a virtual hemisphere of this radius
  // 0 in full daylight, 1 at night. Mirrors lampIntensity; exposed so other
  // systems (boat/lighthouse glow, seagull-call scheduler) can react to dusk.
  nightAmount = 0;

  constructor(inputs: TimeOfDayInputs, startPhase = 0.4) {
    this.inputs = inputs;
    this.elapsed = startPhase * CYCLE_SECONDS;
    this.current = bake(KEYS[0]);
    this.apply(dt0());
  }

  // Force exact phase (0..1) — useful for tests / debug.
  setPhase(phase: number): void {
    this.elapsed = phase * CYCLE_SECONDS;
    this.apply(0);
  }

  phase(): number {
    return (this.elapsed % CYCLE_SECONDS) / CYCLE_SECONDS;
  }

  update(dt: number): void {
    this.elapsed += dt;
    this.apply(dt);
  }

  private apply(_dt: number): void {
    const phase = this.phase();
    // Find bracketing keyframes.
    let aIdx = 0;
    for (let i = 0; i < BAKED.length - 1; i++) {
      if (phase >= BAKED[i].t && phase <= BAKED[i + 1].t) {
        aIdx = i;
        break;
      }
    }
    const a = BAKED[aIdx];
    const b = BAKED[aIdx + 1];
    const span = b.t - a.t || 1;
    const tt = (phase - a.t) / span;
    // Smoothstep for gentler transitions between keyframes.
    const t = tt * tt * (3 - 2 * tt);

    const cur = this.current;
    cur.t = phase;
    lerpColor(a.skyTop, b.skyTop, t, cur.skyTop);
    lerpColor(a.skyBottom, b.skyBottom, t, cur.skyBottom);
    lerpColor(a.skyHorizon, b.skyHorizon, t, cur.skyHorizon);
    cur.sunDir.copy(a.sunDir).lerp(b.sunDir, t).normalize();
    lerpColor(a.sunColor, b.sunColor, t, cur.sunColor);
    cur.sunIntensity = lerp(a.sunIntensity, b.sunIntensity, t);
    lerpColor(a.hemiSky, b.hemiSky, t, cur.hemiSky);
    lerpColor(a.hemiGround, b.hemiGround, t, cur.hemiGround);
    cur.hemiIntensity = lerp(a.hemiIntensity, b.hemiIntensity, t);
    lerpColor(a.ambientColor, b.ambientColor, t, cur.ambientColor);
    cur.ambientIntensity = lerp(a.ambientIntensity, b.ambientIntensity, t);
    lerpColor(a.waterColor, b.waterColor, t, cur.waterColor);
    lerpColor(a.horizonHaze, b.horizonHaze, t, cur.horizonHaze);
    lerpColor(a.foamTint, b.foamTint, t, cur.foamTint);
    cur.lampIntensity = lerp(a.lampIntensity, b.lampIntensity, t);
    cur.bloomStrength = lerp(a.bloomStrength, b.bloomStrength, t);
    cur.exposure = lerp(a.exposure, b.exposure, t);

    // ---- Push values into the actual scene handles ----
    const i = this.inputs;
    i.skyUniforms.uTop.value.copy(cur.skyTop);
    i.skyUniforms.uBot.value.copy(cur.skyBottom);
    i.skyUniforms.uHorizon.value.copy(cur.skyHorizon);
    i.skyUniforms.uPhase.value = phase;
    i.waterUniforms.uSea.value.copy(cur.waterColor);
    i.waterUniforms.uHorizonHaze.value.copy(cur.horizonHaze);
    i.waterUniforms.uFoamTint.value.copy(cur.foamTint);
    i.waterUniforms.uNightAmount.value = cur.lampIntensity;
    this.nightAmount = cur.lampIntensity;

    // Sun: place on a virtual hemisphere. Even when sunDir.y is negative
    // (sun below the horizon) we clamp the world Y above ground so the
    // shadow camera keeps looking down at the world rather than punching
    // through the ground. Shadow casting is disabled at night to avoid
    // wasting a shadow-map render on a near-zero contribution.
    const sunPos = new THREE.Vector3()
      .copy(cur.sunDir)
      .multiplyScalar(this.distance);
    sunPos.y = Math.max(25, sunPos.y + 25);
    i.sun.position.copy(sunPos);
    i.sun.color.copy(cur.sunColor);
    i.sun.intensity = cur.sunIntensity;
    i.sun.castShadow = cur.sunIntensity > 0.2;

    i.hemi.color.copy(cur.hemiSky);
    i.hemi.groundColor.copy(cur.hemiGround);
    i.hemi.intensity = cur.hemiIntensity;

    i.ambient.color.copy(cur.ambientColor);
    i.ambient.intensity = cur.ambientIntensity;

    i.renderer.toneMappingExposure = cur.exposure * EXPOSURE_SCALE;

    for (let m = 0; m < i.lampMaterials.length; m++) {
      const mat = i.lampMaterials[m];
      mat.emissiveIntensity = i.lampBaseIntensities[m] * (0.05 + 1.55 * cur.lampIntensity);
    }
    for (let m = 0; m < i.lampPointLights.length; m++) {
      const pl = i.lampPointLights[m];
      pl.intensity = i.lampPointBaseIntensities[m] * (0.05 + 1.4 * cur.lampIntensity);
    }

    i.onBloomStrength?.(cur.bloomStrength);
  }
}

// Tiny helper so the constructor can run apply() before any frames have ticked
// without a magic number sprinkled in.
function dt0(): number {
  return 0;
}
