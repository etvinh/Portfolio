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

    const cap = h.box(3.8, 0.6, 3.8, '#c92a2a');
    cap.position.y = 15.9;
    g.add(cap);
    const roof = h.box(2.0, 1.8, 2.0, '#c92a2a');
    roof.position.y = 17.0;
    g.add(roof);

    const lampY = 14.5;
    // Sweeping beam: a hollow cone whose APEX sits at the lamp center and
    // whose body extends sideways. Pivot rotates the whole thing.
    const beamGeo = new THREE.ConeGeometry(5, 34, 22, 1, true);
    beamGeo.translate(0, -17, 0); // apex → origin, body extends down
    beamGeo.rotateZ(Math.PI / 2); // body now points along +x
    const beam = new THREE.Mesh(
      beamGeo,
      new THREE.MeshBasicMaterial({
        color: 0xfff3bf,
        transparent: true,
        opacity: 0.17,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    );
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
    [6.2, 9.6, 12.6].forEach((wy) => {
      const w = h.box(1.0, 1.0, 0.25, '#ffe066', {
        emissive: new THREE.Color('#ffd43b'),
        emissiveIntensity: 0.55,
      });
      w.position.set(0, wy, 2.42);
      g.add(w);
    });
    g.add(h.rock(6, -6, 1.7));
    g.add(h.rock(-6, -5, 1.3, '#7a8086'));

    return {
      tick: (dt, _t, reduced) => {
        beamPivot.rotation.y += dt * (reduced ? 0.35 : 1.1);
      },
    };
  },
};
