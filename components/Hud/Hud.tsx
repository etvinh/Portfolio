'use client';

// HUD orchestrator. Subscribes to the Game's state stream, owns the
// discovered count, dock prompt, panels, sound toggle, minimap, joystick,
// and achievement toast. All children take plain props — no context.

import { useEffect, useState } from 'react';
import type { Game, GameState } from '@/lib/three/game';
import { AchievementToast } from './AchievementToast';
import { DockPrompt } from './DockPrompt';
import { Joystick } from './Joystick';
import { MinimapHud } from './MinimapHud';
import { Panels } from './Panels';
import { SoundToggle } from './SoundToggle';
import { TitleChip } from './TitleChip';

type Props = {
  game: Game;
};

export function Hud({ game }: Props) {
  const [state, setState] = useState<GameState | null>(null);

  useEffect(() => game.subscribe(setState), [game]);

  if (!state) return null;

  const discovered = Object.keys(state.visited).length;
  // Hide the dock prompt while any panel is open.
  const showPrompt = state.dockTarget !== null && state.activePanel === null;

  return (
    <>
      <TitleChip discovered={discovered} total={state.total} />
      <SoundToggle on={state.soundOn} onToggle={() => game.toggleSound()} />
      <MinimapHud game={game} />

      {state.isMobile && <Joystick game={game} />}

      {showPrompt && state.dockTarget && (
        <DockPrompt dockName={state.dockTarget.title} onDock={() => game.onDock()} />
      )}

      {state.achievement && (
        <AchievementToast title={state.achievement.title} all={state.achievement.all} />
      )}

      <Panels activePanel={state.activePanel} onClose={() => game.closePanel()} />
    </>
  );
}
