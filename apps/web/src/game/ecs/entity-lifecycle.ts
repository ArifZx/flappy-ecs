import { removeEntity } from 'bitecs';
import type { World as EcsWorld } from 'bitecs';

import { BodyRef, SpriteRef } from './components';
import type { EntityStores } from './types';
import type { PhysicsAdapter } from '../physics';

export const destroyEntity = (
  ecsWorld: EcsWorld,
  physics: PhysicsAdapter,
  stores: EntityStores,
  eid: number,
): void => {
  const spriteId = SpriteRef.id[eid];
  const bodyId = BodyRef.id[eid];
  const sprite = stores.sprites[spriteId];

  if (sprite) {
    sprite.destroy();
    stores.sprites[spriteId] = null;
  }

  if (bodyId > 0) {
    physics.destroyBody(bodyId);
  }

  removeEntity(ecsWorld, eid);
};