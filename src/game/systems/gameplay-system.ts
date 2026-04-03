import type { GameRuntimeResource } from '../ecs/resources';
import type { BirdEntityBundle } from '../entities/bird';
import type { PhysicsAdapter } from '../physics';
import { createPresentationSystem } from './presentation-system';
import { createSimulationSystem } from './simulation-system';
import type { PipeDirector } from '../app/create-pipe-director';
import type { GameRuntimeContext } from '../app/create-runtime-context';
import type { GameScene } from '../app/create-scene';

type CreateGameplaySystemParams = {
  context: GameRuntimeContext;
  physics: PhysicsAdapter;
  runtime: GameRuntimeResource;
  scene: GameScene;
  pipeDirector: PipeDirector;
  bird: Pick<BirdEntityBundle, 'birdEid' | 'birdBody' | 'birdSprite' | 'birdFrames'>;
  updateCrashState: (dt: number) => void;
};

export type GameplaySystem = {
  reset: () => void;
  beginPlay: () => void;
  update: (dt: number) => void;
};

export const createGameplaySystem = ({
  context,
  physics,
  runtime,
  scene,
  pipeDirector,
  bird,
  updateCrashState,
}: CreateGameplaySystemParams): GameplaySystem => {
  const simulationSystem = createSimulationSystem({
    context,
    physics,
    runtime,
    pipeDirector,
    bird: { birdBody: bird.birdBody },
  });
  const presentationSystem = createPresentationSystem({
    context,
    scene,
    bird: {
      birdEid: bird.birdEid,
      birdSprite: bird.birdSprite,
      birdFrames: bird.birdFrames,
    },
    updateCrashState,
  });

  const update = (dt: number): void => {
    const frame = simulationSystem.update(dt);
    presentationSystem.update(dt, frame);
  };

  return {
    reset: presentationSystem.reset,
    beginPlay: presentationSystem.beginPlay,
    update,
  };
};