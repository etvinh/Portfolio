// Mobile joystick — bottom-left, only mounted when isMobile.
// The DOM elements are owned by React; the Game's InputManager attaches
// pointer listeners + drives the knob's transform via game.wireJoystick().

import { useEffect, useRef } from 'react';
import type { Game } from '@/lib/three/game';

type Props = {
  game: Game;
};

export function Joystick({ game }: Props) {
  const baseRef = useRef<HTMLDivElement | null>(null);
  const knobRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (baseRef.current && knobRef.current) {
      game.wireJoystick(baseRef.current, knobRef.current);
    }
  }, [game]);

  return (
    <div
      ref={baseRef}
      style={{
        position: 'absolute',
        bottom: 34,
        left: 34,
        width: 128,
        height: 128,
        borderRadius: '50%',
        background: 'rgba(255,255,255,.22)',
        border: '3px solid rgba(255,255,255,.65)',
        boxShadow: '0 8px 22px rgba(11,58,102,.22)',
        touchAction: 'none',
      }}
    >
      <div
        ref={knobRef}
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: 58,
          height: 58,
          margin: '-29px 0 0 -29px',
          borderRadius: '50%',
          background: '#fff',
          borderBottom: '4px solid #cdd7e0',
          boxShadow: '0 4px 10px rgba(11,58,102,.25)',
          willChange: 'transform',
        }}
      />
    </div>
  );
}
