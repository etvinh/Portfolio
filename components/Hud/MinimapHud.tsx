// Bottom-right minimap + "Lost? Sail home" button.
//
// The canvas is owned by React (ref'd here), but the Game class draws to it
// every frame via setMinimapCanvas(). We pass the element on mount and
// clear it on unmount so the Game doesn't keep a dangling reference.

import { useEffect, useRef } from 'react';
import type { Game } from '@/lib/three/game';

type Props = {
  game: Game;
};

export function MinimapHud({ game }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    game.setMinimapCanvas(canvasRef.current);
    return () => game.setMinimapCanvas(null);
  }, [game]);

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 18,
        right: 18,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        alignItems: 'flex-end',
      }}
    >
      <canvas
        ref={canvasRef}
        width={160}
        height={160}
        style={{
          width: 152,
          height: 152,
          borderRadius: 20,
          border: '4px solid #fff',
          boxShadow: '0 8px 22px rgba(11,58,102,.28)',
          background: '#0b3a66',
        }}
      />
      <button
        onClick={() => game.goHome()}
        style={{
          fontFamily: '"Baloo 2", sans-serif',
          fontWeight: 700,
          fontSize: 13,
          color: '#fff',
          background: '#1c7ed6',
          border: 'none',
          borderBottom: '4px solid #1457a0',
          borderRadius: 13,
          padding: '9px 16px',
          cursor: 'pointer',
          boxShadow: '0 5px 14px rgba(20,87,160,.35)',
        }}
      >
        Lost? Sail home
      </button>
    </div>
  );
}
