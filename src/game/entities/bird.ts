import { Container, Sprite } from 'pixi.js';
import type { Spritesheet } from 'pixi.js';
import * as ecs from 'bitecs';
import * as planck from 'planck';

import { BIRD_START_Y, BIRD_X, pxToM } from '../config/constants';
import {
  BirdAppearance,
  BirdTag,
  BodyRef,
  Position,
  SpriteRef,
} from '../ecs/components';
import type { EntityStores } from '../ecs/types';

export type BirdEntityBundle = {
  birdEid: number;
  birdBody: planck.Body;
  birdSprite: Sprite;
  birdFrames: Sprite['texture'][];
};

type CreateBirdEntityParams = {
  ecsWorld: ReturnType<typeof ecs.createWorld>;
  physicsWorld: planck.World;
  birdLayer: Container;
  sheet: Spritesheet;
  stores: EntityStores;
};

export const createBirdEntity = ({
  ecsWorld,
  physicsWorld,
  birdLayer,
  sheet,
  stores,
}: CreateBirdEntityParams): BirdEntityBundle => {
  const birdFrames = [
    sheet.textures['yellowbird-upflap'],
    sheet.textures['yellowbird-midflap'],
    sheet.textures['yellowbird-downflap'],
  ];

  const birdEid = ecs.addEntity(ecsWorld);
  ecs.addComponent(ecsWorld, birdEid, Position);
  ecs.addComponent(ecsWorld, birdEid, SpriteRef);
  ecs.addComponent(ecsWorld, birdEid, BodyRef);
  ecs.addComponent(ecsWorld, birdEid, BirdTag);
  ecs.addComponent(ecsWorld, birdEid, BirdAppearance);
  BirdTag[birdEid] = 1;
  BirdAppearance.variant[birdEid] = 0;

  Position.x[birdEid] = BIRD_X;
  Position.y[birdEid] = BIRD_START_Y;

  const birdSprite = new Sprite(birdFrames[1]);
  birdSprite.anchor.set(0.5);
  birdLayer.addChild(birdSprite);
  SpriteRef.id[birdEid] = birdEid;
  stores.sprites[birdEid] = birdSprite;

  const birdBody = physicsWorld.createDynamicBody({
    position: planck.Vec2(pxToM(BIRD_X), pxToM(BIRD_START_Y)),
    fixedRotation: true,
    linearDamping: 0,
  });
  birdBody.createFixture(planck.Circle(pxToM(11)), {
    density: 1,
    friction: 0,
    restitution: 0,
  });
  birdBody.setGravityScale(0);
  birdBody.setUserData({ type: 'bird', eid: birdEid });

  BodyRef.id[birdEid] = birdEid;
  stores.bodies[birdEid] = birdBody;

  return {
    birdEid,
    birdBody,
    birdSprite,
    birdFrames,
  };
};