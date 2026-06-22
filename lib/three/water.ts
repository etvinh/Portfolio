import * as THREE from 'three';

// Custom GPU water — a flat plane whose vertex shader displaces upward in
// shifting sin/cos bands, and whose fragment shader tints the surface from
// a separate "wave field" function. Result: a calm, monotone, no-glare sea.
//
// Ported faithfully from the prototype's onBeforeCompile injection so we
// don't have to rewrite the wave model.
export type Water = {
  mesh: THREE.Mesh;
  mat: THREE.MeshBasicMaterial;
  uniforms: { uTime: { value: number }; uSea: { value: THREE.Color } };
};

export function createWater(seaColor: string, reducedMotion: boolean): Water {
  const geo = new THREE.PlaneGeometry(2600, 2600, 200, 200);
  geo.rotateX(-Math.PI / 2);

  const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(seaColor), fog: true });
  const uniforms = {
    uTime: { value: 0 },
    uSea: { value: new THREE.Color(seaColor) },
  };

  const waveAmp = reducedMotion ? 0.18 : 0.6;

  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = uniforms.uTime;
    shader.uniforms.uSea = uniforms.uSea;

    shader.vertexShader =
      `uniform float uTime;
       varying vec2 vXZ;
       varying float vH;
       const float A1=${waveAmp.toFixed(2)}, A2=${(waveAmp * 0.7).toFixed(2)}, k1=0.085, k2=0.11, s1=1.0, s2=0.8;
      ` + shader.vertexShader;

    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `vec3 transformed = vec3(position);
       float h = A1 * sin(position.x * k1 + uTime * s1) + A2 * cos(position.z * k2 + uTime * s2);
       transformed.y += h;
       vXZ = position.xz;
       vH = h;`,
    );

    shader.fragmentShader =
      `uniform float uTime;
       uniform vec3 uSea;
       varying vec2 vXZ;
       varying float vH;
       float waveField(vec2 p) {
         float t = uTime;
         float w = sin(p.x*0.08 + p.y*0.05 + t*0.7);
         w += 0.6 * sin(p.x*0.15 - p.y*0.09 - t*0.9);
         w += 0.4 * sin(p.y*0.19 + t*0.5);
         w += 0.3 * sin((p.x+p.y)*0.11 - t*1.2);
         return w / 2.3;
       }
      ` + shader.fragmentShader;

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <color_fragment>',
      `#include <color_fragment>
       float wv = waveField(vXZ) * 0.6 + vH * 0.5;
       vec3 darker = uSea * 0.74;
       vec3 lighter = mix(uSea, vec3(1.0), 0.22);
       vec3 col = uSea;
       col = mix(col, darker, clamp(-wv, 0.0, 1.0));
       col = mix(col, lighter, clamp(wv, 0.0, 1.0) * 0.9);
       diffuseColor.rgb = col;`,
    );
  };

  const mesh = new THREE.Mesh(geo, mat);
  return { mesh, mat, uniforms };
}
