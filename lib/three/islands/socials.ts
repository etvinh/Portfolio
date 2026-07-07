import * as THREE from 'three';
import type { IslandDef } from './builder';

// Contact — red-striped lighthouse with a rotating beam + point-light glow.
// The beam ticker is registered via the returned `tick`.
export const socialsIsland: IslandDef = {
  id: 'socials',
  title: 'Contact',
  panel: 'socials',
  x: -82,
  z: -28,
  radius: 11,
  mini: '#fa5252',
  grass: '#69db7c',
  labelY: 24,
  build: (g, h) => {
    const t1 = h.box(4.6, 10, 4.6, '#ffffff');
    t1.position.y = 7.0;
    g.add(t1);

    const sa = h.box(4.8, 1.6, 4.8, '#fa5252');
    sa.position.y = 4.2;
    g.add(sa);
    const sb = h.box(4.8, 1.6, 4.8, '#fa5252');
    sb.position.y = 9.2;
    g.add(sb);

    const gal = h.box(3.9, 1.4, 3.9, '#fa5252');
    gal.position.y = 12.6;
    g.add(gal);

    const lampMesh = h.box(3.2, 2.4, 3.2, '#fff3bf', {
      emissive: new THREE.Color('#ffe066'),
      emissiveIntensity: 0.75,
    });
    lampMesh.position.y = 14.5;
    g.add(lampMesh);
    const lampMat = lampMesh.material as THREE.MeshStandardMaterial;

    const cap = h.box(3.8, 0.6, 3.8, '#c92a2a');
    cap.position.y = 15.9;
    g.add(cap);
    const roof = h.box(2.0, 1.8, 2.0, '#c92a2a');
    roof.position.y = 17.0;
    g.add(roof);

    const lampY = 14.5;
    // Sweeping beam: a hollow cone whose APEX sits at the lamp center and
    // whose body extends sideways. After these bakes the geometry's local
    // +x runs from the apex (x≈0, at the lamp) out to the far end (x≈34).
    const BEAM_LEN = 34;
    const beamGeo = new THREE.ConeGeometry(5, BEAM_LEN, 22, 1, true);
    beamGeo.translate(0, -BEAM_LEN / 2, 0); // apex → origin, body extends down
    beamGeo.rotateZ(Math.PI / 2); // body now points along +x
    // Gradient beam: a flat-opacity cone reads as a hard "ice-cream cone".
    // Instead, fade the light along its length (bright at the lamp, dissolving
    // to nothing at the far end) and additively blend it so it looks like
    // light dispersing through haze rather than a solid shell. uIntensity is
    // driven by time-of-day in tick() — faint by day, strong at night.
    const beamMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uColor: { value: new THREE.Color(0xfff3bf) },
        uIntensity: { value: 0.05 },
        uLen: { value: BEAM_LEN },
      },
      vertexShader: /* glsl */ `
        uniform float uLen;
        varying float vT;
        void main() {
          vT = clamp(position.x / uLen, 0.0, 1.0);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uColor;
        uniform float uIntensity;
        varying float vT;
        void main() {
          // Strong near the lamp, smoothly to zero at the tip — kills the
          // hard rim that made it look like a solid cone.
          float a = pow(1.0 - vT, 1.7) * uIntensity;
          gl_FragColor = vec4(uColor, a);
        }
      `,
    });
    const beam = new THREE.Mesh(beamGeo, beamMat);
    const beamPivot = new THREE.Group();
    beamPivot.position.set(0, lampY, 0);
    beamPivot.add(beam);
    g.add(beamPivot);

    const pl = new THREE.PointLight(0xfff3bf, 0.85, 90);
    pl.position.y = lampY;
    g.add(pl);

    g.add(h.tree(7, 6, 0.9));
    g.add(h.tree(-7, 5, 0.8, '#37b24d'));

    const door = h.box(1.5, 2.6, 0.4, '#6d4c41');
    door.position.set(0, 4.0, 2.4);
    g.add(door);
    const windowMats: THREE.MeshStandardMaterial[] = [];
    [6.2, 9.6, 12.6].forEach((wy) => {
      const w = h.box(1.0, 1.0, 0.25, '#ffe066', {
        emissive: new THREE.Color('#ffd43b'),
        emissiveIntensity: 0.55,
      });
      w.position.set(0, wy, 2.42);
      g.add(w);
      windowMats.push(w.material as THREE.MeshStandardMaterial);
    });
    g.add(h.rock(6, -6, 1.7));
    g.add(h.rock(-6, -5, 1.3, '#7a8086'));

    return {
      tick: (dt, _t, reduced, nightAmount) => {
        beamPivot.rotation.y += dt * (reduced ? 0.35 : 1.1);
        // Lighthouse glow tracks dusk: nearly off in daylight (so it doesn't
        // read as "too bright" against the bright sky), full strength at night.
        beamMat.uniforms.uIntensity.value = 0.03 + nightAmount * 0.6;
        lampMat.emissiveIntensity = 0.12 + nightAmount * 1.3;
        pl.intensity = 0.08 + nightAmount * 1.4;
        const winE = 0.1 + nightAmount * 0.7;
        for (const m of windowMats) m.emissiveIntensity = winE;
      },
    };
  },
};
