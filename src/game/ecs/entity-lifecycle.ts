import * as ecs from 'bitecs';
import * as planck from 'planck';

import { BodyRef, SpriteRef } from './components';
import type { EntityStores } from './types';

export const destroyEntity = (
  ecsWorld: ReturnType<typeof ecs.createWorld>,
  physicsWorld: planck.World,
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

  ecs.removeEntity(ecsWorld, eid);
};