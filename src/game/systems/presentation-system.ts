import { BIRD_START_Y } from '../config/constants';
import { GAME_SFX, flushSoundQueue, playSound } from '../audio/sound';
import { Position } from '../ecs/components';
import { GamePhase } from '../ecs/resources';
import type { BirdEntityBundle } from '../entities/bird';
import { syncSpritesFromPosition } from './render-system';
import type { SimulationFrame } from './simulation-system';
import type { GameRuntimeContext } from '../app/create-runtime-context';
import type { GameScene } from '../app/create-scene';

type CreatePresentationSystemParams = {
  context: GameRuntimeContext;
  scene: GameScene;
  bird: Pick<BirdEntityBundle, 'birdEid' | 'birdSprite' | 'birdFrames'>;
  updateCrashState: (dt: number) => void;
};

export type PresentationSystem = {
  reset: () => void;
  beginPlay: () => void;
  update: (dt: number, frame: SimulationFrame) => void;
};

export const createPresentationSystem = ({
  context,
  scene,
  bird,
  updateCrashState,
}: CreatePresentationSystemParams): PresentationSystem => {
  const { birdEid, birdSprite, birdFrames } = bird;
  let flapFrame = 0;
  let flapTimer = 0;
  let bobTimer = 0;

  const setBirdPose = (index: number): void => {
    birdSprite.texture = birdFrames[index % birdFrames.length];
  };

  const reset = (): void => {
    flapFrame = 0;
    flapTimer = 0;
    bobTimer = 0;
    birdSprite.rotation = 0;
    scene.pointsText.text = '0';
    scene.hintText.text = 'Click or press Space to flap';
    scene.hintText.visible = true;
    scene.gameOverSprite.visible = false;
    scene.background.reset();
    setBirdPose(1);
  };

  const beginPlay = (): void => {
    scene.hintText.visible = false;
  };

  const showGuardFailure = (): void => {
    scene.pointsText.text = '0';
    scene.hintText.text = 'YOU ARE CHEATED!';
    scene.hintText.visible = true;
    scene.gameOverSprite.visible = true;
  };

  const updateIdlePresentation = (dt: number): void => {
    bobTimer += dt;
    Position.y[birdEid] = BIRD_START_Y + Math.sin(bobTimer * 5) * 6;
    syncSpritesFromPosition({ renderQuery: context.renderQuery, stores: context.stores });
  };

  const updatePlayingPresentation = (dt: number, frame: SimulationFrame): void => {
    if (frame.scoreDelta > 0) {
      scene.pointsText.text = String(frame.mark);
      playSound(GAME_SFX.point);
    }

    flapTimer += dt;
    if (flapTimer >= 0.12) {
      flapTimer = 0;
      flapFrame = (flapFrame + 1) % birdFrames.length;
      setBirdPose(flapFrame);
    }

    birdSprite.rotation = Math.max(-0.6, Math.min(1.2, frame.birdVelocityY * 0.08));

    scene.groundA.x -= frame.groundScroll;
    scene.groundB.x -= frame.groundScroll;

    if (scene.groundA.x + scene.groundA.width <= 0) {
      scene.groundA.x = scene.groundB.x + scene.groundB.width;
    }
    if (scene.groundB.x + scene.groundB.width <= 0) {
      scene.groundB.x = scene.groundA.x + scene.groundA.width;
    }
  };

  const update = (dt: number, frame: SimulationFrame): void => {
    scene.background.setNightTarget(frame.isNight);
    scene.background.update(dt);
    flushSoundQueue();

    if (frame.guardFailed) {
      showGuardFailure();
      return;
    }

    if (frame.phase === GamePhase.Idle) {
      updateIdlePresentation(dt);
      return;
    }

    if (frame.phase === GamePhase.Playing) {
      updatePlayingPresentation(dt, frame);
    } else {
      updateCrashState(dt);
    }

    syncSpritesFromPosition({ renderQuery: context.renderQuery, stores: context.stores });
  };

  return {
    reset,
    beginPlay,
    update,
  };
};