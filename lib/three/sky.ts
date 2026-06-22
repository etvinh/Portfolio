import * as THREE from 'three';

// Gradient sky dome — a backside-rendered sphere with a 2-color shader.
// Bottom color drives the overall mood; top stays a deeper sea-blue.
export type Sky = {
  mesh: THREE.Mesh;
  mat: THREE.ShaderMaterial;
};

export function createSky(skyColor: string): Sky {
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      uTop: { value: new THREE.Color('#1f4f80') },
      uBot: { value: new THREE.Color(skyColor) },
    },
    vertexShader: `
      varying float vY;
      void main() {
        vY = normalize(position).y;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying float vY;
      uniform vec3 uTop;
      uniform vec3 uBot;
      void main() {
        float t = clamp(vY * 1.15 + 0.25, 0.0, 1.0);
        gl_FragColor = vec4(mix(uBot, uTop, t), 1.0);
      }
    `,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(1700, 24, 16), mat);
  return { mesh, mat };
}
