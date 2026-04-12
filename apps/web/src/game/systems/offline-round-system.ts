import { BIRD_START_Y, BIRD_X, pxToM } from '../config/constants';
import { GAME_SFX, playSound } from '../audio/sound';
import { Position } from '../ecs/components';
import { GamePhase, type GameRuntimeResource } from '../ecs/resources';
import type { BirdEntityBundle } from '../entities/bird';
import type { PhysicsAdapter } from '../physics';
import type { BirdCrashController } from '../app/create-bird-crash-controller';
import type { PipeDirector } from '../app/create-pipe-director';
import type { GameplaySystem } from './gameplay-system';

type CreateOfflineRoundSystemParams = {
  physics: PhysicsAdapter;
  runtime: GameRuntimeResource;
  pipeDirector: PipeDirector;
  birdCrashController: Pick<BirdCrashController, 'reset'>;
  gameplaySystem: Pick<GameplaySystem, 'reset' | 'beginPlay' | 'update'>;
  bird: Pick<BirdEntityBundle, 'birdEid' | 'birdBody'>;
};

export type OfflineRoundSystem = {
  flap: () => void;
  restart: () => void;
  update: (dt: number) => void;
  getPhase: () => GamePhase;
  peekMark: () => number;
};

export const createOfflineRoundSystem = ({
  physics,
  runtime,
  pipeDirector,
  birdCrashController,
  gameplaySystem,
  bird,
}: CreateOfflineRoundSystemParams): OfflineRoundSystem => {
  const resetRound = (): void => {
    pipeDirector.reset();

    physics.setTransform(bird.birdBody.bodyId, pxToM(BIRD_X), pxToM(BIRD_START_Y), 0);
    physics.setLinearVelocity(bird.birdBody.bodyId, 0, 0);
    physics.setAngularVelocity(bird.birdBody.bodyId, 0);
    physics.setFixedRotation(bird.birdBody.bodyId, true);
    physics.setGravityScale(bird.birdBody.bodyId, 0);
    physics.setAwake(bird.birdBody.bodyId, true);

    Position.x[bird.birdEid] = BIRD_X;
    Position.y[bird.birdEid] = BIRD_START_Y;

    runtime.reset();
    birdCrashController.reset();
    gameplaySystem.reset();
  };

  const restart = (): void => {
    resetRound();
    playSound(GAME_SFX.swoosh);
  };

  const flap = (): void => {
    if (runtime.phase === GamePhase.GameOver) {
      return;
    }

    if (runtime.phase === GamePhase.Idle) {
      runtime.phase = GamePhase.Playing;
      physics.setGravityScale(bird.birdBody.bodyId, 1);
      gameplaySystem.beginPlay();
      playSound(GAME_SFX.swoosh);
    }

    physics.setLinearVelocity(bird.birdBody.bodyId, 0, -7.2);
    playSound(GAME_SFX.flap);
  };

  return {
    flap,
    restart,
    update: gameplaySystem.update,
    getPhase: () => runtime.phase,
    peekMark: runtime.peek,
  };
};