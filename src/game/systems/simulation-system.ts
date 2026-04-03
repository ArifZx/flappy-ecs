import { GamePhase, type GameRuntimeResource } from '../ecs/resources';
import type { BirdEntityBundle } from '../entities/bird';
import type { PhysicsAdapter } from '../physics';
import { getPipeSpeedByMark, isNightByMark } from './difficulty';
import { syncBirdFromPhysics } from './render-system';
import type { PipeDirector } from '../app/create-pipe-director';
import type { GameRuntimeContext } from '../app/create-runtime-context';

type CreateSimulationSystemParams = {
  context: GameRuntimeContext;
  physics: PhysicsAdapter;
  runtime: GameRuntimeResource;
  pipeDirector: PipeDirector;
  bird: Pick<BirdEntityBundle, 'birdBody'>;
};

export type SimulationFrame = {
  phase: GamePhase;
  mark: number;
  isNight: boolean;
  markDelta: number;
  groundScroll: number;
  birdVelocityY: number;
  guardFailed: boolean;
};

export type SimulationSystem = {
  update: (dt: number) => SimulationFrame;
};

export const createSimulationSystem = ({
  context,
  physics,
  runtime,
  pipeDirector,
  bird,
}: CreateSimulationSystemParams): SimulationSystem => {
  const failGuardPhysics = (): void => {
    runtime.phase = GamePhase.GameOver;
    physics.setLinearVelocity(bird.birdBody.bodyId, 0, 0);
    physics.setAngularVelocity(bird.birdBody.bodyId, 0);
    physics.setFixedRotation(bird.birdBody.bodyId, true);
    physics.setGravityScale(bird.birdBody.bodyId, 0);
    physics.setAwake(bird.birdBody.bodyId, false);
  };

  const update = (dt: number): SimulationFrame => {
    if (!runtime.guard()) {
      failGuardPhysics();
      return {
        phase: GamePhase.GameOver,
        mark: 0,
        isNight: false,
        markDelta: 0,
        groundScroll: 0,
        birdVelocityY: 0,
        guardFailed: true,
      };
    }

    const mark = runtime.peek();
    const isNight = isNightByMark(mark);

    if (runtime.phase === GamePhase.Idle) {
      return {
        phase: runtime.phase,
        mark,
        isNight,
        markDelta: 0,
        groundScroll: 0,
        birdVelocityY: 0,
        guardFailed: false,
      };
    }

    physics.step(dt);
    syncBirdFromPhysics({ birdQuery: context.birdQuery, physics });

    let nextMark = mark;
    let markDelta = 0;
    let groundScroll = 0;

    if (runtime.phase === GamePhase.Playing) {
      const currentSpeed = getPipeSpeedByMark(mark);
      markDelta = pipeDirector.update(dt, currentSpeed, mark);

      if (markDelta > 0) {
        nextMark = runtime.bump(markDelta);
      }

      groundScroll = getPipeSpeedByMark(nextMark) * dt;
    }

    return {
      phase: runtime.phase,
      mark: nextMark,
      isNight,
      markDelta,
      groundScroll,
      birdVelocityY: physics.shared.velocityY[bird.birdBody.bodyId],
      guardFailed: false,
    };
  };

  return {
    update,
  };
};