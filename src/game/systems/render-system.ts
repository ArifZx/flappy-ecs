import { BodyRef, Position, SpriteRef } from '../ecs/components';
import { mToPx } from '../config/constants';
import type { EcsQuery, EntityStores } from '../ecs/types';
import type { PhysicsAdapter } from '../physics';

type SyncBirdFromPhysicsParams = {
  birdQuery: EcsQuery;
  physics: PhysicsAdapter;
};

export const syncBirdFromPhysics = ({
  birdQuery,
  physics,
}: SyncBirdFromPhysicsParams): void => {
  for (let i = 0; i < birdQuery.length; i += 1) {
    const eid = birdQuery[i];
    const bodyId = BodyRef.id[eid];
    if (physics.shared.active[bodyId] === 0) continue;

    Position.x[eid] = mToPx(physics.shared.x[bodyId]);
    Position.y[eid] = mToPx(physics.shared.y[bodyId]);
  }
};

type SyncSpritesFromPositionParams = {
  renderQuery: EcsQuery;
  stores: EntityStores;
};

export const syncSpritesFromPosition = ({
  renderQuery,
  stores,
}: SyncSpritesFromPositionParams): void => {
  for (let i = 0; i < renderQuery.length; i += 1) {
    const eid = renderQuery[i];
    const sprite = stores.sprites[SpriteRef.id[eid]];
    if (!sprite) continue;

    sprite.position.set(Position.x[eid], Position.y[eid]);
  }
};