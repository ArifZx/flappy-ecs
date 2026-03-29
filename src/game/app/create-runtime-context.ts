import { createWorld, query } from 'bitecs';
import type { Spritesheet } from 'pixi.js';

import { BIRD_START_Y, GAME_WIDTH, GROUND_HEIGHT, GROUND_Y, pxToM } from '../config/constants';
import {
  BirdTag,
  BodyRef,
  MAX_ENTITIES,
  PipeTag,
  Position,
  SpriteRef,
} from '../ecs/components';
import type { EntityStores } from '../ecs/types';
import { createBirdEntity } from '../entities/bird';
import type { PhysicsAdapter } from '../physics';
import type { GameScene } from './create-scene';

type CreateRuntimeContextParams = {
  physics: PhysicsAdapter;
  scene: GameScene;
  sheet: Spritesheet;
};

export type GameRuntimeContext = {
  ecsWorld: ReturnType<typeof createWorld>;
  stores: EntityStores;
  bird: ReturnType<typeof createBirdEntity>;
  birdQuery: ReturnType<typeof query>;
  pipeQuery: ReturnType<typeof query>;
  renderQuery: ReturnType<typeof query>;
};

export const createRuntimeContext = ({
  physics,
  scene,
  sheet,
}: CreateRuntimeContextParams): GameRuntimeContext => {
  const ecsWorld = createWorld();
  const stores: EntityStores = {
    sprites: new Array(MAX_ENTITIES).fill(null),
  };

  const bird = createBirdEntity({
    ecsWorld,
    physics,
    birdLayer: scene.birdLayer,
    sheet,
    stores,
  });

  physics.createBody({
    entityId: -1,
    x: pxToM(GAME_WIDTH / 2),
    y: pxToM(GROUND_Y + GROUND_HEIGHT / 2),
    shape: {
      kind: 'static-box',
      halfWidth: pxToM(GAME_WIDTH / 2),
      halfHeight: pxToM(GROUND_HEIGHT / 2),
    },
    userData: { type: 'ground', eid: -1 },
  });

  physics.createBody({
    entityId: -1,
    x: pxToM(GAME_WIDTH / 2),
    y: pxToM(-12),
    shape: {
      kind: 'static-box',
      halfWidth: pxToM(GAME_WIDTH / 2),
      halfHeight: pxToM(12),
    },
    userData: { type: 'ceiling', eid: -1 },
  });

  return {
    ecsWorld,
    stores,
    bird,
    birdQuery: query(ecsWorld, [BirdTag, Position, BodyRef]),
    pipeQuery: query(ecsWorld, [PipeTag, Position, SpriteRef, BodyRef]),
    renderQuery: query(ecsWorld, [Position, SpriteRef]),
  };
};
