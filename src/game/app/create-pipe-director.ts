import { entityExists } from 'bitecs';
import type { Spritesheet } from 'pixi.js';

import { BIRD_START_Y, GAME_WIDTH } from '../config/constants';
import { Position } from '../ecs/components';
import { destroyEntity } from '../ecs/entity-lifecycle';
import type { PipePair } from '../ecs/types';
import { spawnPipePair } from '../entities/pipe';
import type { PhysicsAdapter } from '../physics';
import {
  createPipeMapProvider,
  type PipeMapEntry,
} from '../systems/pipe-map';
import { moveAndCleanupPipes } from '../systems/pipe-system';
import type { GameRuntimeContext } from './create-runtime-context';
import type { GameScene } from './create-scene';

type CreatePipeDirectorParams = {
  context: GameRuntimeContext;
  physics: PhysicsAdapter;
  scene: GameScene;
  sheet: Spritesheet;
};

export type PipeDirector = {
  reset: () => void;
  update: (dt: number, speed: number, mark: number) => number;
};

export const createPipeDirector = ({
  context,
  physics,
  scene,
  sheet,
}: CreatePipeDirectorParams): PipeDirector => {
  const pipePairs: PipePair[] = [];
  const pipeMap: PipeMapEntry[] = [];
  const pipeMapProvider = createPipeMapProvider({
    seed: 0x24f1a5c3,
    initialHeight: BIRD_START_Y,
  });

  const refillPipeMap = (mark: number): void => {
    if (pipeMap.length >= 10) return;
    pipeMap.push(...pipeMapProvider.nextEntries(mark, 12));
  };

  const getRightMostPipeX = (): number | null => {
    let maxX: number | null = null;
    for (let i = 0; i < pipePairs.length; i += 1) {
      const x = Position.x[pipePairs[i].topEid];
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

      const next = pipeMap.shift();
      if (!next) {
        break;
      }

      const spawnX = rightMostX === null ? GAME_WIDTH + 40 : rightMostX + next.x;

      spawnPipePair({
        ecsWorld: context.ecsWorld,
        physics,
        stores: context.stores,
        pipesLayer: scene.pipesLayer,
        sheet,
        pipePairs,
        x: spawnX,
        gap: next.gap,
        height: next.height,
      });
    }
  };

  const reset = (): void => {
    for (const pair of pipePairs) {
      if (entityExists(context.ecsWorld, pair.topEid)) {
        destroyEntity(context.ecsWorld, physics, context.stores, pair.topEid);
      }
      if (entityExists(context.ecsWorld, pair.bottomEid)) {
        destroyEntity(context.ecsWorld, physics, context.stores, pair.bottomEid);
      }
    }

    pipePairs.length = 0;
    pipeMap.length = 0;
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
      pipePairs,
    });
  };

  return {
    reset,
    update,
  };
};
