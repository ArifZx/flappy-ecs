import { BodyRef, Position, SpriteRef } from '../ecs/components';
import { mToPx } from '../config/constants';
import type { EcsQuery, EntityStores } from '../ecs/types';

type SyncBirdFromPhysicsParams = {
  birdQuery: EcsQuery;
  stores: EntityStores;
};

export const syncBirdFromPhysics = ({
  birdQuery,
  stores,
}: SyncBirdFromPhysicsParams): void => {
  for (let i = 0; i < birdQuery.length; i += 1) {
    const eid = birdQuery[i];
    const body = stores.bodies[BodyRef.id[eid]];
    if (!body) continue;

    const pos = body.getPosition();
    Position.x[eid] = mToPx(pos.x);
    Position.y[eid] = mToPx(pos.y);
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