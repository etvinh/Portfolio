import type { IslandDef } from './builder';

// Library Light — small white tower with a pointed roof and shelves of
// colored book spines stacked in front.
export const libraryIsland: IslandDef = {
  id: 'library',
  title: 'Library Light',
  panel: 'library',
  x: 120,
  z: -118,
  radius: 12,
  mini: '#4dabf7',
  grass: '#74c0fc',
  labelY: 22,
  build: (g, h) => {
    const tower = h.box(5, 9, 5, '#e9ecef');
    tower.position.y = 6.5;
    g.add(tower);

    const roof = h.cone(4.2, 3, '#4dabf7', 4);
    roof.rotation.y = Math.PI / 4;
    roof.position.y = 12.5;
    g.add(roof);

    const bookCols = ['#fa5252', '#37b24d', '#ffd43b', '#4dabf7', '#f06595'];
    bookCols.forEach((c, i) => {
      const bk = h.box(1.4, 2.6, 0.8, c);
      bk.position.set(-6 + i * 0.95, 4 + (i % 2) * 0.4, 5);
      bk.rotation.z = i % 2 ? 0.06 : -0.06;
      g.add(bk);
    });

    g.add(h.tree(8, 7, 1.0));
    g.add(h.tree(-8, 6, 0.85, '#37b24d'));

    ([5, 8] as const).forEach((wy) => {
      [-1.4, 1.4].forEach((wx) => {
        const w = h.box(1.0, 1.2, 0.25, '#ffe066');
        w.position.set(wx, wy, 2.55);
        g.add(w);
      });
    });
    const door = h.box(1.6, 2.4, 0.4, '#6d4c41');
    door.position.set(0, 3.2, 2.55);
    g.add(door);
    g.add(h.lamp(7, 7));
  },
};
