import { entityExists } from 'bitecs';
import type { Spritesheet } from 'pixi.js';
import { createPipeMapProvider } from '@flappy/shared';

import { BIRD_START_Y, GAME_WIDTH } from '../config/constants';
import { Position } from '../ecs/components';
import type { PipeRuntimeResource } from '../ecs/resources';
import { destroyEntity } from '../ecs/entity-lifecycle';
import { spawnPipePair } from '../entities/pipe';
import type { PhysicsAdapter } from '../physics';
import { moveAndCleanupPipes } from '../systems/pipe-system';
import type { GameRuntimeContext } from './create-runtime-context';
import type { GameScene } from './create-scene';

const OFFLINE_PIPE_SEED = 0x24f1a5c3;

type CreatePipeDirectorParams = {
  context: GameRuntimeContext;
  physics: PhysicsAdapter;
  pipeRuntime: PipeRuntimeResource;
  scene: GameScene;
  sheet: Spritesheet;
};

export type PipeDirector = {
  setSeed: (seed: number | null) => void;
  reset: () => void;
  update: (dt: number, speed: number, mark: number) => number;
};

export const createPipeDirector = ({
  context,
  physics,
  pipeRuntime,
  scene,
  sheet,
}: CreatePipeDirectorParams): PipeDirector => {
  let currentSeed = OFFLINE_PIPE_SEED;
  let pipeMapProvider = createPipeMapProvider({
    seed: currentSeed,
    initialHeight: BIRD_START_Y,
  });

  const refillPipeMap = (mark: number): void => {
    if (pipeRuntime.pendingEntries.length >= 10) return;
    pipeRuntime.pendingEntries.push(...pipeMapProvider.nextEntries(mark, 12));
  };

  const getRightMostPipeX = (): number | null => {
    let maxX: number | null = null;
    for (let i = 0; i < pipeRuntime.activePairs.length; i += 1) {
      const x = Position.x[pipeRuntime.activePairs[i].topEid];
      if (maxX === null || x > maxX) {
        maxX = x;
      }
    }
    return maxX;
  };

  const spawnFromMap = (mark: number): void => {
    refillPipeMap(mark);
    const spawnLeadX = GAME_WIDTH + 120;

    while (true) {
      const rightMostX = getRightMostPipeX();
      if (rightMostX !== null && rightMostX > spawnLeadX) {
        break;
      }

      const next = pipeRuntime.pendingEntries.shift();
      if (!next) {
        break;
      }

      const spawnX = rightMostX === null ? GAME_WIDTH + 40 : rightMostX + next.x;

      pipeRuntime.activePairs.push(spawnPipePair({
        ecsWorld: context.ecsWorld,
        physics,
        stores: context.stores,
        pipesLayer: scene.pipesLayer,
        sheet,
        entry: {
          ...next,
          x: spawnX,
        },
      }));
    }
  };

  const reset = (): void => {
    for (const pair of pipeRuntime.activePairs) {
      if (entityExists(context.ecsWorld, pair.topEid)) {
        destroyEntity(context.ecsWorld, physics, context.stores, pair.topEid);
      }
      if (entityExists(context.ecsWorld, pair.bottomEid)) {
        destroyEntity(context.ecsWorld, physics, context.stores, pair.bottomEid);
      }
    }

    pipeRuntime.reset();
    pipeMapProvider.reset();
  };

  const update = (dt: number, speed: number, mark: number): number => {
    spawnFromMap(mark);

    return moveAndCleanupPipes({
      dt,
      speed,
      ecsWorld: context.ecsWorld,
      physics,
      stores: context.stores,
      pipeQuery: context.pipeQuery,
      pipePairs: pipeRuntime.activePairs,
    });
  };

  return {
    setSeed: (seed) => {
      const nextSeed = seed ?? OFFLINE_PIPE_SEED;
      if (nextSeed === currentSeed) {
        return;
      }

      currentSeed = nextSeed;
      pipeMapProvider = createPipeMapProvider({
        seed: currentSeed,
        initialHeight: BIRD_START_Y,
      });
    },
    reset,
    update,
  };
};
