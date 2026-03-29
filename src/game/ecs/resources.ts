export type GamePhase = 'idle' | 'playing' | 'game-over';

export type GameRuntimeResource = {
  phase: GamePhase;
  score: number;
  flapFrame: number;
  flapTimer: number;
  bobTimer: number;
};

export const createGameRuntimeResource = (): GameRuntimeResource => ({
  phase: 'idle',
  score: 0,
  flapFrame: 0,
  flapTimer: 0,
  bobTimer: 0,
});
