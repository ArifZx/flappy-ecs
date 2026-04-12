import type { Spritesheet } from 'pixi.js';

import {
  createGameRuntimeResource,
  createPipeRuntimeResource,
  GamePhase,
} from '../ecs/resources';
import type { PhysicsAdapter } from '../physics';
import { getPipeSpeedByMark } from '../systems/difficulty';
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
  setCourseSeed: (seed: number | null) => void;
  update: (dt: number) => void;
  getPhase: () => GamePhase;
  peek: () => number;
  getSnapshotState: () => {
    screenX: number;
    screenY: number;
    worldX: number;
    worldOffset: number;
    rotation: number;
    score: number;
    progress: number;
    alive: boolean;
    finished: boolean;
  };
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
  const pipeRuntime = createPipeRuntimeResource();
  const pipeDirector = createPipeDirector({
    context,
    physics,
    pipeRuntime,
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

  let worldOffset = 0;

  return {
    flap: roundSystem.flap,
    setCourseSeed: (seed) => {
      pipeDirector.setSeed(seed);
    },
    restart: () => {
      worldOffset = 0;
      roundSystem.restart();
    },
    update: (dt) => {
      if (runtime.phase === GamePhase.Playing) {
        worldOffset += getPipeSpeedByMark(runtime.peek()) * dt;
      }

      roundSystem.update(dt);
    },
    getPhase: roundSystem.getPhase,
    peek: roundSystem.peekMark,
    getSnapshotState: () => ({
      screenX: birdSprite.x,
      screenY: birdSprite.y,
      worldX: worldOffset + birdSprite.x,
      worldOffset,
      rotation: birdSprite.rotation,
      score: runtime.peek(),
      progress: runtime.peek(),
      alive: runtime.phase !== GamePhase.GameOver,
      finished: runtime.phase === GamePhase.GameOver,
    }),
    consumeScreenshotRequest: birdCrashController.consumeScreenshotRequest,
  };
};
