'use client';

import { useEffect, useRef, useState } from 'react';
import { Game } from '@/lib/three/game';
import { Hud } from '@/components/Hud/Hud';

// Client-only mount point for the Three.js game + React HUD.
// The Game class is created once on mount, started, and torn down on
// unmount. The HUD reads from its state stream via `game.subscribe(...)`.
export default function GameCanvas() {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [game, setGame] = useState<Game | null>(null);

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;
    const g = new Game(el);
    g.start();
    setGame(g);
    return () => {
      g.stop();
      setGame(null);
    };
  }, []);

  return (
    <>
      <div
        ref={mountRef}
        style={{
          position: 'fixed',
          inset: 0,
          overflow: 'hidden',
        }}
      />
      {game && <Hud game={game} />}
    </>
  );
}
