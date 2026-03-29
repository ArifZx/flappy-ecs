import { createWorld, entityExists, query } from 'bitecs';
import type { Spritesheet } from 'pixi.js';

import {
  BIRD_START_Y,
  BIRD_X,
  GAME_WIDTH,
  GROUND_HEIGHT,
  GROUND_Y,
  pxToM,
} from '../config/constants';
import { GAME_SFX, flushSoundQueue, playSound } from '../audio/sound';
import { createGameRuntimeResource } from '../ecs/resources';
import { destroyEntity } from '../ecs/entity-lifecycle';
import type { EntityStores, PipePair } from '../ecs/types';
import {
  BirdTag,
  BodyRef,
  PipeTag,
  Position,
  SpriteRef,
  MAX_ENTITIES,
} from '../ecs/components';
import { createBirdEntity } from '../entities/bird';
import { spawnPipePair } from '../entities/pipe';
import type { PhysicsAdapter, PhysicsContactEvent } from '../physics';
import {
  getPipeSpeedByScore,
  isNightByScore,
} from '../systems/difficulty';
import {
  createPipeMapProvider,
  type PipeMapEntry,
} from '../systems/pipe-map';
import { moveAndCleanupPipes } from '../systems/pipe-system';
import {
  syncBirdFromPhysics,
  syncSpritesFromPosition,
} from '../systems/render-system';
import type { GameScene } from './create-scene';

type CreateGameRuntimeParams = {
  physics: PhysicsAdapter;
  scene: GameScene;
  sheet: Spritesheet;
};

export type GameRuntimeController = {
  flap: () => void;
  update: (dt: number) => void;
};

export const createGameRuntime = ({
  physics,
  scene,
  sheet,
}: CreateGameRuntimeParams): GameRuntimeController => {
  const ecsWorld = createWorld();
  const stores: EntityStores = {
    sprites: new Array(MAX_ENTITIES).fill(null),
  };

  const { birdEid, birdBody, birdSprite, birdFrames } = createBirdEntity({
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

  const birdQuery = query(ecsWorld, [BirdTag, Position, BodyRef]);
  const pipeQuery = query(ecsWorld, [PipeTag, Position, SpriteRef, BodyRef]);
  const renderQuery = query(ecsWorld, [Position, SpriteRef]);

  const pipePairs: PipePair[] = [];
  const pipeMap: PipeMapEntry[] = [];
  const pipeMapProvider = createPipeMapProvider({
    seed: 0x24f1a5c3,
    initialHeight: BIRD_START_Y,
  });

  const runtime = createGameRuntimeResource();
  let birdLandedAfterCrash = false;

  const setBirdPose = (idx: number): void => {
    birdSprite.texture = birdFrames[idx % birdFrames.length];
  };

  const refillPipeMap = (): void => {
    if (pipeMap.length >= 10) return;
    const newEntries = pipeMapProvider.nextEntries(runtime.score, 12);
    pipeMap.push(...newEntries);
  };

  const getRightMostPipeX = (): number | null => {
    let maxX: number | null = null;
    for (let i = 0; i < pipePairs.length; i += 1) {
      const x = Position.x[pipePairs[i].topEid];
      if (maxX === null || x > maxX) {
        maxX = x;
      }
    }
    return maxX;
  };

  const spawnPipesByMap = (): void => {
    refillPipeMap();
    const spawnLeadX = GAME_WIDTH + 120;

    while (true) {
      const rightMostX = getRightMostPipeX();
      if (rightMostX !== null && rightMostX > spawnLeadX) {
        break;
      }

      const next = pipeMap.shift();
      if (!next) {
        break;
      }

      const spawnX = rightMostX === null ? GAME_WIDTH + 40 : rightMostX + next.x;

      spawnPipePair({
        ecsWorld,
        physics,
        stores,
        pipesLayer: scene.pipesLayer,
        sheet,
        pipePairs,
        x: spawnX,
        gap: next.gap,
        height: next.height,
      });
    }
  };

  const resetGame = (): void => {
    for (const pair of pipePairs) {
      if (entityExists(ecsWorld, pair.topEid)) {
        destroyEntity(ecsWorld, physics, stores, pair.topEid);
      }
      if (entityExists(ecsWorld, pair.bottomEid)) {
        destroyEntity(ecsWorld, physics, stores, pair.bottomEid);
      }
    }

    pipePairs.length = 0;
    pipeMap.length = 0;
    pipeMapProvider.reset();

    physics.setTransform(birdBody.bodyId, pxToM(BIRD_X), pxToM(BIRD_START_Y), 0);
    physics.setLinearVelocity(birdBody.bodyId, 0, 0);
    physics.setAngularVelocity(birdBody.bodyId, 0);
    physics.setFixedRotation(birdBody.bodyId, true);
    physics.setGravityScale(birdBody.bodyId, 0);
    physics.setAwake(birdBody.bodyId, true);

    Position.x[birdEid] = BIRD_X;
    Position.y[birdEid] = BIRD_START_Y;
    birdSprite.rotation = 0;

    runtime.score = 0;
    runtime.started = false;
    runtime.gameOver = false;
    runtime.flapFrame = 0;
    runtime.flapTimer = 0;
    runtime.bobTimer = 0;
    birdLandedAfterCrash = false;

    scene.scoreText.text = '0';
    scene.hintText.text = 'Click or press Space to flap';
    scene.hintText.visible = true;
    scene.gameOverSprite.visible = false;
    scene.background.reset();
    setBirdPose(1);
  };

  const handleContact = (event: PhysicsContactEvent): void => {
    const dataA = event.userDataA;
    const dataB = event.userDataB;

    const hitBird = dataA?.type === 'bird' || dataB?.type === 'bird';
    const hitGround = dataA?.type === 'ground' || dataB?.type === 'ground';
    const hitPipe = dataA?.type === 'pipe' || dataB?.type === 'pipe';
    const hitPipeGroundOrCeiling =
      hitPipe ||
      dataA?.type === 'ground' ||
      dataB?.type === 'ground' ||
      dataA?.type === 'ceiling' ||
      dataB?.type === 'ceiling';

    if (hitBird && hitPipeGroundOrCeiling && !runtime.gameOver) {
      runtime.gameOver = true;
      physics.setFixedRotation(birdBody.bodyId, false);
      physics.setAngularVelocity(birdBody.bodyId, 6);
      scene.gameOverSprite.visible = true;
      scene.hintText.text = 'Click or press Space to restart';
      scene.hintText.visible = true;

      if (hitPipe) {
        playSound(GAME_SFX.hit);
      }
      playSound(GAME_SFX.die);
    }

    if (runtime.gameOver && hitBird && hitGround && !birdLandedAfterCrash) {
      birdLandedAfterCrash = true;
      physics.setLinearVelocity(birdBody.bodyId, 0, 0);
      physics.setAngularVelocity(birdBody.bodyId, 0);
      physics.setGravityScale(birdBody.bodyId, 0);
      physics.setFixedRotation(birdBody.bodyId, true);
      physics.setAwake(birdBody.bodyId, false);
    }
  };

  physics.onContact(handleContact);

  const flap = (): void => {
    if (runtime.gameOver) {
      resetGame();
      playSound(GAME_SFX.swoosh);
      return;
    }

    if (!runtime.started) {
      runtime.started = true;
      physics.setGravityScale(birdBody.bodyId, 1);
      scene.hintText.visible = false;
      playSound(GAME_SFX.swoosh);
    }

    physics.setLinearVelocity(birdBody.bodyId, 0, -7.2);
    playSound(GAME_SFX.flap);
  };

  const update = (dt: number): void => {
    scene.background.setNightTarget(isNightByScore(runtime.score));
    scene.background.update(dt);

    flushSoundQueue();

    if (!runtime.started && !runtime.gameOver) {
      runtime.bobTimer += dt;
      Position.y[birdEid] = BIRD_START_Y + Math.sin(runtime.bobTimer * 5) * 6;
      syncSpritesFromPosition({ renderQuery, stores });
      return;
    }

    if (runtime.started) {
      physics.step(dt);
      syncBirdFromPhysics({ birdQuery, physics });
    }

    if (!runtime.gameOver) {
      const currentSpeed = getPipeSpeedByScore(runtime.score);
      spawnPipesByMap();

      const scoreDelta = moveAndCleanupPipes({
        dt,
        speed: currentSpeed,
        ecsWorld,
        physics,
        stores,
        pipeQuery,
        pipePairs,
      });

      if (scoreDelta > 0) {
        runtime.score += scoreDelta;
        scene.scoreText.text = String(runtime.score);
        playSound(GAME_SFX.point);
      }

      runtime.flapTimer += dt;
      if (runtime.flapTimer >= 0.12) {
        runtime.flapTimer = 0;
        runtime.flapFrame = (runtime.flapFrame + 1) % birdFrames.length;
        setBirdPose(runtime.flapFrame);
      }

      const velocityY = physics.shared.velocityY[birdBody.bodyId];
      birdSprite.rotation = Math.max(-0.6, Math.min(1.2, velocityY * 0.08));
    } else if (!birdLandedAfterCrash) {
      birdSprite.rotation = Math.min(1.45, birdSprite.rotation + dt * 5);
    }

    if (!runtime.gameOver) {
      const scroll = getPipeSpeedByScore(runtime.score) * dt;
      scene.groundA.x -= scroll;
      scene.groundB.x -= scroll;

      if (scene.groundA.x + scene.groundA.width <= 0) {
        scene.groundA.x = scene.groundB.x + scene.groundB.width;
      }
      if (scene.groundB.x + scene.groundB.width <= 0) {
        scene.groundB.x = scene.groundA.x + scene.groundA.width;
      }
    }

    syncSpritesFromPosition({ renderQuery, stores });
  };

  return {
    flap,
    update,
  };
};
