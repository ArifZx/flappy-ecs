export type GameRuntimeResource = {
  score: number;
  started: boolean;
  gameOver: boolean;
  flapFrame: number;
  flapTimer: number;
  bobTimer: number;
};

export const createGameRuntimeResource = (): GameRuntimeResource => ({
  score: 0,
  started: false,
  gameOver: false,
  flapFrame: 0,
  flapTimer: 0,
  bobTimer: 0,
});
