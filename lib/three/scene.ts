import * as THREE from 'three';

// Restore pre-r155 color + light math so the prototype's hand-tuned colors
// and light intensities look the same here as they did on three@0.128.
//   - ColorManagement: r155 made all Color() inputs sRGB, converting to
//     linear inside shaders. The prototype's water shader assumed colors
//     were already in shader space — re-enabling color management makes
//     the wave bands look harsh and the sea look candy-blue.
//   - useLegacyLights: r155 switched lights to physical units (candela /
//     lumens). The prototype's intensities (0.42, 0.72, 0.12) are calibrated
//     for the legacy model; otherwise the scene looks blown out.
THREE.ColorManagement.enabled = false;

// Scene + camera + renderer + lights. Pure setup, returns the handles the
// game loop needs. Caller mounts renderer.domElement and drives animate().
//
// Note: no THREE.Fog. The horizon look is owned by the sky-dome shader and
// the water-surface "atmospheric haze" gradient — those are direction- and
// distance-aware in a way that built-in Fog isn't, and they let the time-of-
// day controller retint the horizon without juggling fog/Color references.
export type SceneBundle = {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  sun: THREE.DirectionalLight;
  hemi: THREE.HemisphereLight;
  ambient: THREE.AmbientLight;
};

export function createSceneBundle(
  mountEl: HTMLElement,
  skyColor: string,
): SceneBundle | null {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(skyColor);
  // Deliberately no scene.fog — see file header.

  const camera = new THREE.PerspectiveCamera(
    30,
    mountEl.clientWidth / mountEl.clientHeight,
    0.1,
    4000,
  );
  camera.position.set(0, 54, 150);

  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
      failIfMajorPerformanceCaveat: false,
    });
  } catch {
    return null;
  }

  // Cap pixel ratio at 1.25: every post-processing full-screen pass (MSAA
  // resolve, bloom mip blurs, output) scales with DPR², so 2.0 → 1.25 cuts
  // roughly 60% of the per-frame pixel work on Retina displays for a barely
  // perceptible sharpness change on this cartoon art (4× MSAA still keeps
  // edges clean).
  renderer.setPixelRatio(Math.min(1.25, window.devicePixelRatio || 1));
  renderer.setSize(mountEl.clientWidth, mountEl.clientHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  // Three r155+: outputColorSpace replaced outputEncoding.
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.9;
  // Match the prototype's light-intensity scale (pre-physical-units).
  // Deprecated in r155, removed in r163 — bump three past 0.162 and you'll
  // need to multiply intensities by π instead.
  renderer.useLegacyLights = true;
  mountEl.appendChild(renderer.domElement);

  // Moody late-afternoon lighting from the prototype.
  // The TimeOfDay controller later re-tints these every frame; the values
  // here are just sensible defaults so the first frame isn't flat.
  const hemi = new THREE.HemisphereLight(0x8aa6c8, 0x4a5538, 0.42);
  scene.add(hemi);
  const ambient = new THREE.AmbientLight(0x6678a0, 0.12);
  scene.add(ambient);
  const sun = new THREE.DirectionalLight(0xffe6c2, 0.72);
  sun.position.set(60, 110, 40);
  sun.castShadow = true;
  // 1024 is plenty for soft voxel shadows at this camera distance; 2048
  // quadruples the shadow-pass fill cost for no visible gain here.
  sun.shadow.mapSize.set(1024, 1024);
  const sc = sun.shadow.camera;
  sc.left = -220;
  sc.right = 220;
  sc.top = 220;
  sc.bottom = -220;
  sc.near = 1;
  sc.far = 420;
  sun.shadow.bias = -0.0004;
  scene.add(sun);

  return { scene, camera, renderer, sun, hemi, ambient };
}
