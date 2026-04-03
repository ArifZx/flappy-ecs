import { GAME_SFX, playSound } from '../audio/sound';
import { GamePhase, type GameRuntimeResource } from '../ecs/resources';
import {
  PhysicsBodyKinds,
  type PhysicsAdapter,
  type PhysicsContactEvent,
} from '../physics';
import type { GameScene } from './create-scene';

type CreateBirdCrashControllerParams = {
  physics: PhysicsAdapter;
  scene: GameScene;
  runtime: GameRuntimeResource;
  birdBodyId: number;
  birdSprite: { rotation: number };
};

export type BirdCrashController = {
  reset: () => void;
  handleContact: (event: PhysicsContactEvent) => void;
  update: (dt: number) => void;
  isLanded: () => boolean;
  consumeScreenshotRequest: () => boolean;
};

export const createBirdCrashController = ({
  physics,
  scene,
  runtime,
  birdBodyId,
  birdSprite,
}: CreateBirdCrashControllerParams): BirdCrashController => {
  let birdLandedAfterCrash = false;
  let screenshotRequested = false;

  const enterGameOver = (hitPipe: boolean): void => {
    runtime.phase = GamePhase.GameOver;
    screenshotRequested = true;
    physics.setFixedRotation(birdBodyId, false);
    physics.setAngularVelocity(birdBodyId, 6);
    scene.gameOverSprite.visible = true;
    scene.hintText.visible = false;

    if (hitPipe) {
      playSound(GAME_SFX.hit);
    }
    playSound(GAME_SFX.die);
  };

  const landBirdAfterCrash = (): void => {
    birdLandedAfterCrash = true;
    physics.setLinearVelocity(birdBodyId, 0, 0);
    physics.setAngularVelocity(birdBodyId, 0);
    physics.setGravityScale(birdBodyId, 0);
    physics.setFixedRotation(birdBodyId, true);
    physics.setAwake(birdBodyId, false);
  };

  return {
    reset: () => {
      birdLandedAfterCrash = false;
      screenshotRequested = false;
    },
    handleContact: (event) => {
      const dataA = event.userDataA;
      const dataB = event.userDataB;

      const hitBird = dataA?.kind === PhysicsBodyKinds.Bird || dataB?.kind === PhysicsBodyKinds.Bird;
      const hitGround = dataA?.kind === PhysicsBodyKinds.Ground || dataB?.kind === PhysicsBodyKinds.Ground;
      const hitPipe = dataA?.kind === PhysicsBodyKinds.Pipe || dataB?.kind === PhysicsBodyKinds.Pipe;
      const hitPipeGroundOrCeiling =
        hitPipe ||
        dataA?.kind === PhysicsBodyKinds.Ground ||
        dataB?.kind === PhysicsBodyKinds.Ground ||
        dataA?.kind === PhysicsBodyKinds.Ceiling ||
        dataB?.kind === PhysicsBodyKinds.Ceiling;

      if (hitBird && hitPipeGroundOrCeiling && runtime.phase !== GamePhase.GameOver) {
        enterGameOver(hitPipe);
      }

      if (runtime.phase === GamePhase.GameOver && hitBird && hitGround && !birdLandedAfterCrash) {
        landBirdAfterCrash();
      }
    },
    update: (dt) => {
      if (runtime.phase === GamePhase.GameOver && !birdLandedAfterCrash) {
        birdSprite.rotation = Math.min(1.45, birdSprite.rotation + dt * 5);
      }
    },
    isLanded: () => birdLandedAfterCrash,
    consumeScreenshotRequest: () => {
      const requested = screenshotRequested;
      screenshotRequested = false;
      return requested;
    },
  };
};