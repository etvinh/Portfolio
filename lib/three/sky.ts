import * as THREE from 'three';

// Gradient sky dome with a hot horizon band.
//
// Three-color shader: top → bottom is the standard zenith gradient; an
// independent uHorizon color is mixed in near the horizon to give us a
// distinct sunset/sunrise band (and the atmospheric "haze" tone at dusk).
// The TimeOfDay controller drives all three colors + uPhase every frame.
export type Sky = {
  mesh: THREE.Mesh;
  mat: THREE.ShaderMaterial;
  uniforms: {
    uTop: { value: THREE.Color };
    uBot: { value: THREE.Color };
    uHorizon: { value: THREE.Color };
    uPhase: { value: number };
  };
};

export function createSky(skyColor: string): Sky {
  const uniforms = {
    uTop: { value: new THREE.Color('#1f4f80') },
    uBot: { value: new THREE.Color(skyColor) },
    uHorizon: { value: new THREE.Color('#cfe6ff') },
    uPhase: { value: 0.45 },
  };
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms,
    vertexShader: /* glsl */ `
      varying float vY;
      void main() {
        vY = normalize(position).y;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      varying float vY;
      uniform vec3 uTop;
      uniform vec3 uBot;
      uniform vec3 uHorizon;
      uniform float uPhase;
      void main() {
        // Base vertical gradient (top ↔ bottom).
        float t = clamp(vY * 1.15 + 0.25, 0.0, 1.0);
        vec3 base = mix(uBot, uTop, t);

        // Horizon glow: a soft band centered on vY = 0 (the horizon line).
        // Tighter at noon, fatter at sunrise/sunset.
        float dayDist = abs(uPhase - 0.45);   // distance from solar noon
        float bandWidth = mix(0.10, 0.32, smoothstep(0.0, 0.35, dayDist));
        float band = exp(-pow(vY / bandWidth, 2.0));
        float bandStrength = mix(0.22, 0.85, smoothstep(0.0, 0.35, dayDist));
        vec3 col = mix(base, uHorizon, band * bandStrength);

        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(1700, 24, 16), mat);
  return { mesh, mat, uniforms };
}
