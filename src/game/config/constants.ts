export const GAME_WIDTH = 288;
export const GAME_HEIGHT = 512;
export const GROUND_HEIGHT = 112;
export const GROUND_Y = GAME_HEIGHT - GROUND_HEIGHT;
export const PIPE_SPEED = 90;
export const PIPE_SPEED_MAX = 165;
export const PIPE_GAP = 130;
export const PIPE_SPAWN_INTERVAL = 1.4;
export const BIRD_X = 78;
export const BIRD_START_Y = 220;

const PPM = 60;

export const pxToM = (px: number): number => px / PPM;
export const mToPx = (m: number): number => m * PPM;
