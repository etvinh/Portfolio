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
export type SceneBundle = {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  sun: THREE.DirectionalLight;
};

export function createSceneBundle(
  mountEl: HTMLElement,
  skyColor: string,
): SceneBundle | null {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(skyColor);
  scene.fog = new THREE.Fog(new THREE.Color('#5a7a9e'), 200, 540);

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

  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
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
  scene.add(new THREE.HemisphereLight(0x8aa6c8, 0x4a5538, 0.42));
  scene.add(new THREE.AmbientLight(0x6678a0, 0.12));
  const sun = new THREE.DirectionalLight(0xffe6c2, 0.72);
  sun.position.set(60, 110, 40);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const sc = sun.shadow.camera;
  sc.left = -220;
  sc.right = 220;
  sc.top = 220;
  sc.bottom = -220;
  sc.near = 1;
  sc.far = 420;
  sun.shadow.bias = -0.0004;
  scene.add(sun);

  return { scene, camera, renderer, sun };
}
