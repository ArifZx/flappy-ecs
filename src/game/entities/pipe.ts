import { Container, Sprite } from 'pixi.js';
import type { Spritesheet } from 'pixi.js';
import { addComponent, addEntity } from 'bitecs';
import type { World as EcsWorld } from 'bitecs';
import { BoxShape, Vec2 } from 'planck';
import type { World as PlanckWorld } from 'planck';

import { pxToM } from '../config/constants';
import { BodyRef, PipeTag, Position, SpriteRef } from '../ecs/components';
import type { EntityStores, PipePair } from '../ecs/types';

type CreatePipeSegmentParams = {
  ecsWorld: EcsWorld;
  physicsWorld: PlanckWorld;
  stores: EntityStores;
  pipesLayer: Container;
  sheet: Spritesheet;
  x: number;
  y: number;
  flipY: boolean;
};

const createPipeSegment = ({
  ecsWorld,
  physicsWorld,
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

  const body = physicsWorld.createBody({
    type: 'static',
    position: new Vec2(pxToM(x), pxToM(y)),
  });
  body.createFixture(new BoxShape(pxToM(26), pxToM(160)));
  body.setUserData({ type: 'pipe', eid });
  BodyRef.id[eid] = eid;
  stores.bodies[eid] = body;

  return eid;
};

type SpawnPipePairParams = {
  ecsWorld: EcsWorld;
  physicsWorld: PlanckWorld;
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
  physicsWorld,
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
    physicsWorld,
    stores,
    pipesLayer,
    sheet,
    x,
    y: topCenterY,
    flipY: true,
  });

  const bottomEid = createPipeSegment({
    ecsWorld,
    physicsWorld,
    stores,
    pipesLayer,
    sheet,
    x,
    y: bottomCenterY,
    flipY: false,
  });

  pipePairs.push({ topEid, bottomEid, scored: false });
};