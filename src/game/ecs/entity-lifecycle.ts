import { removeEntity } from 'bitecs';
import type { World as EcsWorld } from 'bitecs';
import type { World as PlanckWorld } from 'planck';

import { BodyRef, SpriteRef } from './components';
import type { EntityStores } from './types';

export const destroyEntity = (
  ecsWorld: EcsWorld,
  physicsWorld: PlanckWorld,
  stores: EntityStores,
  eid: number,
): void => {
  const spriteId = SpriteRef.id[eid];
  const bodyId = BodyRef.id[eid];
  const sprite = stores.sprites[spriteId];
  const body = stores.bodies[bodyId];

  if (sprite) {
    sprite.destroy();
    stores.sprites[spriteId] = null;
  }

  if (body) {
    physicsWorld.destroyBody(body);
    stores.bodies[bodyId] = null;
  }

  removeEntity(ecsWorld, eid);
};