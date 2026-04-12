import { Container, Sprite } from 'pixi.js';
import type { Spritesheet } from 'pixi.js';
import { addComponent, addEntity } from 'bitecs';
import type { World as EcsWorld } from 'bitecs';

import { BIRD_START_Y, BIRD_X, pxToM } from '../config/constants';
import {
  BirdAppearance,
  BirdTag,
  BodyRef,
  Position,
  SpriteRef,
} from '../ecs/components';
import type { EntityStores } from '../ecs/types';
import {
  PhysicsBodyKinds,
  type PhysicsAdapter,
  type PhysicsBodyHandle,
} from '../physics';

export type BirdEntityBundle = {
  birdEid: number;
  birdBody: PhysicsBodyHandle;
  birdSprite: Sprite;
  birdFrames: Sprite['texture'][];
};

export type RemoteBirdEntityBundle = {
  birdEid: number;
  birdSprite: Sprite;
  birdFrames: Sprite['texture'][];
};


type CreateBirdEntityParams = {
  ecsWorld: EcsWorld;
  physics: PhysicsAdapter;
  birdLayer: Container;
  sheet: Spritesheet;
  stores: EntityStores;
  variant?: 0 | 1;
  x?: number;
  y?: number;
};

type CreateRemoteBirdEntityParams = {
  ecsWorld: EcsWorld;
  birdLayer: Container;
  sheet: Spritesheet;
  stores: EntityStores;
  variant?: 0 | 1;
  x?: number;
  y?: number;
};

const getBirdFrames = (sheet: Spritesheet, variant: 0 | 1): Sprite['texture'][] =>
  variant === 0
    ? [
        sheet.textures['yellowbird-upflap'],
        sheet.textures['yellowbird-midflap'],
        sheet.textures['yellowbird-downflap'],
      ]
    : [
        sheet.textures['redbird-upflap'],
        sheet.textures['redbird-midflap'],
        sheet.textures['redbird-downflap'],
      ];

const createBirdVisualEntity = ({
  ecsWorld,
  birdLayer,
  stores,
  variant,
  x,
  y,
  birdFrames,
}: {
  ecsWorld: EcsWorld;
  birdLayer: Container;
  stores: EntityStores;
  variant: 0 | 1;
  x: number;
  y: number;
  birdFrames: Sprite['texture'][];
}): { birdEid: number; birdSprite: Sprite } => {
  const birdEid = addEntity(ecsWorld);
  addComponent(ecsWorld, birdEid, Position);
  addComponent(ecsWorld, birdEid, SpriteRef);
  addComponent(ecsWorld, birdEid, BirdTag);
  addComponent(ecsWorld, birdEid, BirdAppearance);
  BirdTag[birdEid] = 1;
  BirdAppearance.variant[birdEid] = variant;

  Position.x[birdEid] = x;
  Position.y[birdEid] = y;

  const birdSprite = new Sprite(birdFrames[1]);
  birdSprite.anchor.set(0.5);
  birdLayer.addChild(birdSprite);
  SpriteRef.id[birdEid] = birdEid;
  stores.sprites[birdEid] = birdSprite;

  return { birdEid, birdSprite };
};

export const createBirdEntity = ({
  ecsWorld,
  physics,
  birdLayer,
  sheet,
  stores,
  variant = 0,
  x = BIRD_X,
  y = BIRD_START_Y,
}: CreateBirdEntityParams): BirdEntityBundle => {
  const birdFrames = getBirdFrames(sheet, variant);
  const { birdEid, birdSprite } = createBirdVisualEntity({
    ecsWorld,
    birdLayer,
    stores,
    variant,
    x,
    y,
    birdFrames,
  });

  addComponent(ecsWorld, birdEid, BodyRef);

  const birdBody = physics.createBody({
    entityId: birdEid,
    x: pxToM(x),
    y: pxToM(y),
    shape: {
      kind: 'dynamic-circle',
      radius: pxToM(11),
      density: 1,
      friction: 0,
      restitution: 0,
      gravityScale: 0,
      fixedRotation: true,
      linearDamping: 0,
    },
    userData: { kind: PhysicsBodyKinds.Bird, eid: birdEid },
  });

  BodyRef.id[birdEid] = birdBody.bodyId;

  return {
    birdEid,
    birdBody,
    birdSprite,
    birdFrames,
  };
};

export const createRemoteBirdEntity = ({
  ecsWorld,
  birdLayer,
  sheet,
  stores,
  variant = 1,
  x = BIRD_X,
  y = BIRD_START_Y,
}: CreateRemoteBirdEntityParams): RemoteBirdEntityBundle => {
  const birdFrames = getBirdFrames(sheet, variant);
  const { birdEid, birdSprite } = createBirdVisualEntity({
    ecsWorld,
    birdLayer,
    stores,
    variant,
    x,
    y,
    birdFrames,
  });

  return {
    birdEid,
    birdSprite,
    birdFrames,
  };
};