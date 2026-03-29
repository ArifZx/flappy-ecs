import * as ecs from 'bitecs';
import * as planck from 'planck';

import { BIRD_X, PIPE_SPEED, pxToM } from '../config/constants';
import { BodyRef, Position } from '../ecs/components';
import { destroyEntity } from '../ecs/entity-lifecycle';
import type { EcsQuery, EntityStores, PipePair } from '../ecs/types';

type MoveAndCleanupPipesParams = {
  dt: number;
  ecsWorld: ReturnType<typeof ecs.createWorld>;
  physicsWorld: planck.World;
  stores: EntityStores;
  pipeQuery: EcsQuery;
  pipePairs: PipePair[];
};

export const moveAndCleanupPipes = ({
  dt,
  ecsWorld,
  physicsWorld,
  stores,
  pipeQuery,
  pipePairs,
}: MoveAndCleanupPipesParams): number => {
  for (let i = 0; i < pipeQuery.length; i += 1) {
    const eid = pipeQuery[i];
    Position.x[eid] -= PIPE_SPEED * dt;

    const body = stores.bodies[BodyRef.id[eid]];
    if (body) {
      body.setTransform(planck.Vec2(pxToM(Position.x[eid]), pxToM(Position.y[eid])), 0);
    }
  }

  let scoredCount = 0;

  for (let i = pipePairs.length - 1; i >= 0; i -= 1) {
    const pair = pipePairs[i];
    if (!ecs.entityExists(ecsWorld, pair.topEid)) {
      pipePairs.splice(i, 1);
      continue;
    }

    const pairX = Position.x[pair.topEid];
    if (!pair.scored && pairX < BIRD_X) {
      pair.scored = true;
      scoredCount += 1;
    }

    if (pairX < -60) {
      if (ecs.entityExists(ecsWorld, pair.topEid)) {
        destroyEntity(ecsWorld, physicsWorld, stores, pair.topEid);
      }
      if (ecs.entityExists(ecsWorld, pair.bottomEid)) {
        destroyEntity(ecsWorld, physicsWorld, stores, pair.bottomEid);
      }
      pipePairs.splice(i, 1);
    }
  }

  return scoredCount;
};