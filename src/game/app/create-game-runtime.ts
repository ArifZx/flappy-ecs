import type { Spritesheet } from 'pixi.js';

import {
  BIRD_START_Y,
  BIRD_X,
  pxToM,
} from '../config/constants';
import { GAME_SFX, flushSoundQueue, playSound } from '../audio/sound';
import { createGameRuntimeResource, type GamePhase } from '../ecs/resources';
import { Position } from '../ecs/components';
import type { PhysicsAdapter, PhysicsContactEvent } from '../physics';
import { getPipeSpeedByScore, isNightByScore } from '../systems/difficulty';
import {
  syncBirdFromPhysics,
  syncSpritesFromPosition,
} from '../systems/render-system';
import { createPipeDirector } from './create-pipe-director';
import type { GameScene } from './create-scene';
import { createRuntimeContext } from './create-runtime-context';

type CreateGameRuntimeParams = {
  physics: PhysicsAdapter;
  scene: GameScene;
  sheet: Spritesheet;
};

export type GameRuntimeController = {
  flap: () => void;
  restart: () => void;
  update: (dt: number) => void;
  getPhase: () => GamePhase;
  getScore: () => number;
  consumeScreenshotRequest: () => boolean;
};

export const createGameRuntime = ({
  physics,
  scene,
  sheet,
}: CreateGameRuntimeParams): GameRuntimeController => {
  const context = createRuntimeContext({
    physics,
    scene,
    sheet,
  });
  const { birdEid, birdBody, birdSprite, birdFrames } = context.bird;
  const pipeDirector = createPipeDirector({
    context,
    physics,
    scene,
    sheet,
  });

  const runtime = createGameRuntimeResource();
  let birdLandedAfterCrash = false;
  let screenshotRequested = false;

  const setBirdPose = (idx: number): void => {
    birdSprite.texture = birdFrames[idx % birdFrames.length];
  };

  const resetGame = (): void => {
    pipeDirector.reset();

    physics.setTransform(birdBody.bodyId, pxToM(BIRD_X), pxToM(BIRD_START_Y), 0);
    physics.setLinearVelocity(birdBody.bodyId, 0, 0);
    physics.setAngularVelocity(birdBody.bodyId, 0);
    physics.setFixedRotation(birdBody.bodyId, true);
    physics.setGravityScale(birdBody.bodyId, 0);
    physics.setAwake(birdBody.bodyId, true);

    Position.x[birdEid] = BIRD_X;
    Position.y[birdEid] = BIRD_START_Y;
    birdSprite.rotation = 0;

    runtime.phase = 'idle';
    runtime.score = 0;
    runtime.flapFrame = 0;
    runtime.flapTimer = 0;
    runtime.bobTimer = 0;
    birdLandedAfterCrash = false;
    screenshotRequested = false;

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

    if (hitBird && hitPipeGroundOrCeiling && runtime.phase !== 'game-over') {
      runtime.phase = 'game-over';
      screenshotRequested = true;
      physics.setFixedRotation(birdBody.bodyId, false);
      physics.setAngularVelocity(birdBody.bodyId, 6);
      scene.gameOverSprite.visible = true;
      scene.hintText.visible = false;

      if (hitPipe) {
        playSound(GAME_SFX.hit);
      }
      playSound(GAME_SFX.die);
    }

    if (runtime.phase === 'game-over' && hitBird && hitGround && !birdLandedAfterCrash) {
      birdLandedAfterCrash = true;
      physics.setLinearVelocity(birdBody.bodyId, 0, 0);
      physics.setAngularVelocity(birdBody.bodyId, 0);
      physics.setGravityScale(birdBody.bodyId, 0);
      physics.setFixedRotation(birdBody.bodyId, true);
      physics.setAwake(birdBody.bodyId, false);
    }
  };

  physics.onContact(handleContact);

  const restart = (): void => {
    resetGame();
    playSound(GAME_SFX.swoosh);
  };

  const flap = (): void => {
    if (runtime.phase === 'game-over') {
      return;
    }

    if (runtime.phase === 'idle') {
      runtime.phase = 'playing';
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

    if (runtime.phase === 'idle') {
      runtime.bobTimer += dt;
      Position.y[birdEid] = BIRD_START_Y + Math.sin(runtime.bobTimer * 5) * 6;
      syncSpritesFromPosition({ renderQuery: context.renderQuery, stores: context.stores });
      return;
    }

    if (runtime.phase !== 'idle') {
      physics.step(dt);
      syncBirdFromPhysics({ birdQuery: context.birdQuery, physics });
    }

    if (runtime.phase === 'playing') {
      const currentSpeed = getPipeSpeedByScore(runtime.score);
      const scoreDelta = pipeDirector.update(dt, currentSpeed, runtime.score);

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

    if (runtime.phase === 'playing') {
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

    syncSpritesFromPosition({ renderQuery: context.renderQuery, stores: context.stores });
  };

  return {
    flap,
    restart,
    update,
    getPhase: () => runtime.phase,
    getScore: () => runtime.score,
    consumeScreenshotRequest: () => {
      const requested = screenshotRequested;
      screenshotRequested = false;
      return requested;
    },
  };
};
