import type { Spritesheet } from 'pixi.js';

import {
  BIRD_START_Y,
  BIRD_X,
  pxToM,
} from '../config/constants';
import { GAME_SFX, flushSoundQueue, playSound } from '../audio/sound';
import { createGameRuntimeResource, type GamePhase } from '../ecs/resources';
import { Position } from '../ecs/components';
import type { PhysicsAdapter } from '../physics';
import { getPipeSpeedByMark, isNightByMark } from '../systems/difficulty';
import {
  syncBirdFromPhysics,
  syncSpritesFromPosition,
} from '../systems/render-system';
import { createBirdCrashController } from './create-bird-crash-controller';
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
  peek: () => number;
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
  const birdCrashController = createBirdCrashController({
    physics,
    scene,
    runtime,
    birdBodyId: birdBody.bodyId,
    birdSprite,
  });

  const setBirdPose = (idx: number): void => {
    birdSprite.texture = birdFrames[idx % birdFrames.length];
  };

  const triggerGuardFailure = (): void => {
    runtime.phase = 'game-over';
    physics.setLinearVelocity(birdBody.bodyId, 0, 0);
    physics.setAngularVelocity(birdBody.bodyId, 0);
    physics.setFixedRotation(birdBody.bodyId, true);
    physics.setGravityScale(birdBody.bodyId, 0);
    physics.setAwake(birdBody.bodyId, false);
    scene.pointsText.text = '0';
    scene.hintText.text = 'YOU ARE CHEATED!';
    scene.hintText.visible = true;
    scene.gameOverSprite.visible = true;
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

    runtime.reset();
    birdCrashController.reset();

    scene.pointsText.text = '0';
    scene.hintText.text = 'Click or press Space to flap';
    scene.hintText.visible = true;
    scene.gameOverSprite.visible = false;
    scene.background.reset();
    setBirdPose(1);
  };

  physics.onContact(birdCrashController.handleContact);

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
    if (!runtime.guard()) {
      triggerGuardFailure();
      return;
    }

    let mark = runtime.peek();

    scene.background.setNightTarget(isNightByMark(mark));
    scene.background.update(dt);

    flushSoundQueue();

    if (runtime.phase === 'idle') {
      runtime.bobTimer += dt;
      Position.y[birdEid] = BIRD_START_Y + Math.sin(runtime.bobTimer * 5) * 6;
      syncSpritesFromPosition({ renderQuery: context.renderQuery, stores: context.stores });
      return;
    }

    physics.step(dt);
    syncBirdFromPhysics({ birdQuery: context.birdQuery, physics });

    if (runtime.phase === 'playing') {
      const currentSpeed = getPipeSpeedByMark(mark);
      const delta = pipeDirector.update(dt, currentSpeed, mark);

      if (delta > 0) {
        mark = runtime.bump(delta);
        scene.pointsText.text = String(mark);
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
    } else {
      birdCrashController.update(dt);
    }

    if (runtime.phase === 'playing') {
      const scroll = getPipeSpeedByMark(mark) * dt;
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
    peek: runtime.peek,
    consumeScreenshotRequest: birdCrashController.consumeScreenshotRequest,
  };
};
