'use client';

import { useEffect, useRef } from 'react';
import { Game } from '@/lib/three/game';

// Client-only mount point for the Three.js game. Creates a Game per mount and
// tears it down on unmount so Strict Mode's double-effect doesn't leak two
// renderers + two RAF loops.
export default function GameCanvas() {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;
    const game = new Game(el);
    game.start();
    return () => {
      game.stop();
    };
  }, []);

  return (
    <div
      ref={mountRef}
      style={{
        position: 'fixed',
        inset: 0,
        overflow: 'hidden',
      }}
    />
  );
}
