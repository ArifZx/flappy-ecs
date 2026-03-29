import { Container, Sprite } from 'pixi.js';
import type { Spritesheet } from 'pixi.js';
import { addComponent, addEntity } from 'bitecs';
import type { World as EcsWorld } from 'bitecs';

import { pxToM } from '../config/constants';
import { BodyRef, PipeTag, Position, SpriteRef } from '../ecs/components';
import type { EntityStores, PipePair } from '../ecs/types';
import type { PhysicsAdapter } from '../physics';

type CreatePipeSegmentParams = {
  ecsWorld: EcsWorld;
  physics: PhysicsAdapter;
  stores: EntityStores;
  pipesLayer: Container;
  sheet: Spritesheet;
  x: number;
  y: number;
  flipY: boolean;
};

const createPipeSegment = ({
  ecsWorld,
  physics,
  stores,
  pipesLayer,
  sheet,
  x,
  y,
  flipY,
}: CreatePipeSegmentParams): number => {
  const eid = addEntity(ecsWorld);
  addComponent(ecsWorld, eid, Position);
  addComponent(ecsWorld, eid, SpriteRef);
  addComponent(ecsWorld, eid, BodyRef);
  addComponent(ecsWorld, eid, PipeTag);
  PipeTag[eid] = 1;

  Position.x[eid] = x;
  Position.y[eid] = y;

  const sprite = new Sprite(sheet.textures['pipe-green']);
  sprite.anchor.set(0.5);
  sprite.scale.y = flipY ? -1 : 1;
  pipesLayer.addChild(sprite);
  SpriteRef.id[eid] = eid;
  stores.sprites[eid] = sprite;

  const body = physics.createBody({
    entityId: eid,
    x: pxToM(x),
    y: pxToM(y),
    shape: {
      kind: 'static-box',
      halfWidth: pxToM(26),
      halfHeight: pxToM(160),
    },
    userData: { type: 'pipe', eid },
  });
  BodyRef.id[eid] = body.bodyId;

  return eid;
};

type SpawnPipePairParams = {
  ecsWorld: EcsWorld;
  physics: PhysicsAdapter;
  stores: EntityStores;
  pipesLayer: Container;
  sheet: Spritesheet;
  pipePairs: PipePair[];
  x: number;
  gap: number;
  height: number;
};

export const spawnPipePair = ({
  ecsWorld,
  physics,
  stores,
  pipesLayer,
  sheet,
  pipePairs,
  x,
  gap,
  height,
}: SpawnPipePairParams): void => {
  const topCenterY = height - gap / 2 - 160;
  const bottomCenterY = height + gap / 2 + 160;

  const topEid = createPipeSegment({
    ecsWorld,
    physics,
    stores,
    pipesLayer,
    sheet,
    x,
    y: topCenterY,
    flipY: true,
  });

  const bottomEid = createPipeSegment({
    ecsWorld,
    physics,
    stores,
    pipesLayer,
    sheet,
    x,
    y: bottomCenterY,
    flipY: false,
  });

  pipePairs.push({ topEid, bottomEid, scored: false });
};