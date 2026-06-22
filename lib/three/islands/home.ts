import type { IslandDef } from './builder';

// Home Harbor — the spawn island. Welcoming greenery, no buildings.
export const homeIsland: IslandDef = {
  id: 'home',
  title: 'Home Harbor',
  panel: 'home',
  x: 0,
  z: 12,
  radius: 16,
  mini: '#37b24d',
  grass: '#51cf66',
  build: (g, h) => {
    g.add(h.tree(-10, -8, 1.2, '#2f9e44'));
    g.add(h.tree(10, 8, 1.0));
    g.add(h.tree(-3, -11, 1.1, '#37b24d'));
    g.add(h.tree(8, -7, 0.9, '#2f9e44'));
    g.add(h.tree(-9, 6, 0.95));
    g.add(h.rock(5, -9, 2.2));
    g.add(h.rock(-7, -3, 1.6, '#7a8086'));
    g.add(h.rock(9, 2, 1.4));
    g.add(h.rock(-6, 9, 1.2, '#909296'));
    g.add(h.flower(3, 9, '#ff6b9d'));
    g.add(h.flower(5, 8, '#ffd43b'));
    g.add(h.flower(-2, 10, '#ff8787'));
    g.add(h.flower(7, 6, '#9775fa'));
    g.add(h.flower(-5, 9, '#74c0fc'));
    g.add(h.flower(1, 11, '#ff8787'));
    g.add(h.flower(-8, 1, '#ffd43b'));
    g.add(h.flower(6, -3, '#ff6b9d'));
  },
};
