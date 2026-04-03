import type { Spritesheet } from 'pixi.js';

import { createGameRuntimeResource, GamePhase } from '../ecs/resources';
import type { PhysicsAdapter } from '../physics';
import { createGameplaySystem } from '../systems/gameplay-system';
import { createOfflineRoundSystem } from '../systems/offline-round-system';
import { createBirdCrashController } from './create-bird-crash-controller';
import { createPipeDirector } from './create-pipe-director';
import type { GameScene } from './create-scene';
import { createRuntimeContext } from './create-runtime-context';

type CreateGameRuntimeParams = {
  physics: PhysicsAdapter;
  scene: GameScene;
  sheet: Spritesheet;
};

export type GameRuntimeController = {
  flap: () => void;
  restart: () => void;
  update: (dt: number) => void;
  getPhase: () => GamePhase;
  peek: () => number;
  consumeScreenshotRequest: () => boolean;
};

export const createGameRuntime = ({
  physics,
  scene,
  sheet,
}: CreateGameRuntimeParams): GameRuntimeController => {
  const context = createRuntimeContext({
    physics,
    scene,
    sheet,
  });
  const { birdEid, birdBody, birdSprite, birdFrames } = context.bird;
  const pipeDirector = createPipeDirector({
    context,
    physics,
    scene,
    sheet,
  });

  const runtime = createGameRuntimeResource();
  const birdCrashController = createBirdCrashController({
    physics,
    scene,
    runtime,
    birdBodyId: birdBody.bodyId,
    birdSprite,
  });
  const gameplaySystem = createGameplaySystem({
    context,
    physics,
    runtime,
    scene,
    pipeDirector,
    bird: { birdEid, birdBody, birdSprite, birdFrames },
    updateCrashState: birdCrashController.update,
  });
  const roundSystem = createOfflineRoundSystem({
    physics,
    runtime,
    pipeDirector,
    birdCrashController,
    gameplaySystem,
    bird: { birdEid, birdBody },
  });

  physics.onContact(birdCrashController.handleContact);

  return {
    flap: roundSystem.flap,
    restart: roundSystem.restart,
    update: roundSystem.update,
    getPhase: roundSystem.getPhase,
    peek: roundSystem.peekMark,
    consumeScreenshotRequest: birdCrashController.consumeScreenshotRequest,
  };
};
