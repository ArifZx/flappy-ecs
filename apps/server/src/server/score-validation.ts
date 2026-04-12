import {
  BIRD_RADIUS,
  BIRD_START_Y,
  createPipeMapProvider,
  BIRD_X,
  GAME_WIDTH,
  PIPE_HALF_WIDTH,
  type PipeMapEntry,
  type ScoreTrigger,
} from '@flappy/shared';

const PIPE_LOOKAHEAD_PX = GAME_WIDTH + 120 - BIRD_X;
const INITIAL_PIPE_X = GAME_WIDTH + 40;
const MAX_TRIGGER_OVERSHOOT_PX = 18;

type PendingPipe = PipeMapEntry & {
  worldX: number;
};

export type ScoreValidationDebugEvent = {
  outcome: 'accepted' | 'rejected';
  reason: string;
  acceptedScore: number;
  triggerScore?: number;
  triggerWorldX?: number;
  triggerScreenY?: number;
  nextPipeId?: number;
  nextPipeWorldX?: number;
  nextPipeGapTop?: number;
  nextPipeGapBottom?: number;
  lastWorldX: number;
};

export type ScoreValidationState = {
  reset: (seed: number) => void;
  notePosition: (worldX: number) => void;
  getAcceptedScore: () => number;
  validateScoreTrigger: (trigger: ScoreTrigger | undefined) => number;
};

export const createScoreValidationState = (
  seed: number,
  onDebug?: (event: ScoreValidationDebugEvent) => void,
): ScoreValidationState => {
  let mapProvider = createPipeMapProvider({
    seed,
    initialHeight: BIRD_START_Y,
  });
  let pendingEntries: PipeMapEntry[] = [];
  let queuedPipes: PendingPipe[] = [];
  let lastSpawnX: number | null = null;
  let acceptedScore = 0;
  let lastWorldX = BIRD_X;

  const emitDebug = (
    outcome: ScoreValidationDebugEvent['outcome'],
    reason: string,
    trigger?: ScoreTrigger,
    nextPipe?: PendingPipe,
  ): number => {
    onDebug?.({
      outcome,
      reason,
      acceptedScore,
      triggerScore: trigger?.score,
      triggerWorldX: trigger?.worldX,
      triggerScreenY: trigger?.screenY,
      nextPipeId: nextPipe?.id,
      nextPipeWorldX: nextPipe?.worldX,
      nextPipeGapTop: nextPipe ? nextPipe.height - nextPipe.gap / 2 : undefined,
      nextPipeGapBottom: nextPipe ? nextPipe.height + nextPipe.gap / 2 : undefined,
      lastWorldX,
    });

    return acceptedScore;
  };

  const refillEntries = (): void => {
    if (pendingEntries.length >= 10) {
      return;
    }

    pendingEntries.push(...mapProvider.nextEntries(acceptedScore, 12));
  };

  const ensurePipesAhead = (worldX: number): void => {
    refillEntries();

    while (lastSpawnX === null || lastSpawnX <= worldX + PIPE_LOOKAHEAD_PX) {
      const next = pendingEntries.shift();
      if (!next) {
        refillEntries();
        continue;
      }

      const worldPipeX = lastSpawnX === null ? INITIAL_PIPE_X : lastSpawnX + next.x;
      queuedPipes.push({
        ...next,
        worldX: worldPipeX,
      });
      lastSpawnX = worldPipeX;
      refillEntries();
    }

    while (queuedPipes.length > 0 && queuedPipes[0].worldX < worldX - 96) {
      queuedPipes.shift();
    }
  };

  const reset = (nextSeed: number): void => {
    mapProvider = createPipeMapProvider({
      seed: nextSeed,
      initialHeight: BIRD_START_Y,
    });
    pendingEntries = [];
    queuedPipes = [];
    lastSpawnX = null;
    acceptedScore = 0;
    lastWorldX = BIRD_X;
  };

  const validateScoreTrigger = (trigger: ScoreTrigger | undefined): number => {
    if (!trigger) {
      return acceptedScore;
    }

    if (!Number.isSafeInteger(trigger.score) || trigger.score !== acceptedScore + 1) {
      return emitDebug('rejected', 'unexpected-score-step', trigger);
    }

    if (!Number.isFinite(trigger.worldX) || !Number.isFinite(trigger.screenY)) {
      return emitDebug('rejected', 'non-finite-trigger', trigger);
    }

    ensurePipesAhead(trigger.worldX);

    const nextPipe = queuedPipes[0];
    if (!nextPipe) {
      return emitDebug('rejected', 'missing-next-pipe', trigger);
    }

    if (trigger.worldX < nextPipe.worldX) {
      return emitDebug('rejected', 'trigger-before-pipe', trigger, nextPipe);
    }

    if (trigger.worldX > nextPipe.worldX + MAX_TRIGGER_OVERSHOOT_PX) {
      return emitDebug('rejected', 'trigger-too-far-past-pipe', trigger, nextPipe);
    }

    const horizontalDistance = Math.abs(trigger.worldX - nextPipe.worldX);
    if (horizontalDistance > PIPE_HALF_WIDTH + BIRD_RADIUS) {
      return emitDebug('rejected', 'horizontal-overlap-missed', trigger, nextPipe);
    }

    const gapTop = nextPipe.height - nextPipe.gap / 2;
    const gapBottom = nextPipe.height + nextPipe.gap / 2;
    if (trigger.screenY - BIRD_RADIUS < gapTop || trigger.screenY + BIRD_RADIUS > gapBottom) {
      return emitDebug('rejected', 'vertical-gap-missed', trigger, nextPipe);
    }

    if (lastWorldX > nextPipe.worldX + MAX_TRIGGER_OVERSHOOT_PX) {
      return emitDebug('rejected', 'player-already-past-pipe', trigger, nextPipe);
    }

    acceptedScore += 1;
    queuedPipes.shift();
    emitDebug('accepted', 'trigger-validated', trigger, nextPipe);
    return acceptedScore;
  };

  return {
    reset,
    notePosition: (worldX) => {
      if (!Number.isFinite(worldX)) {
        return;
      }

      lastWorldX = Math.max(lastWorldX, worldX);
      ensurePipesAhead(lastWorldX);
    },
    getAcceptedScore: () => acceptedScore,
    validateScoreTrigger,
  };
};