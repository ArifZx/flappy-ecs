export const FFA_ROOM_ID = 'ffa-main';
export const FFA_IDLE_TIMEOUT_MS = 30_000;
export const FFA_DURATION_SECONDS = 90;
export const MAX_VISIBLE_PLAYERS = 20;
export const FFA_DEFAULT_BIRD_X = 78;
export const FFA_DEFAULT_BIRD_Y = 220;

const DEFAULT_ALLOWED_ORIGINS = [
  'https://flappy.arifz.com',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:4173',
  'http://127.0.0.1:4173',
];

export const ALLOWED_ORIGINS = (process.env.CORS_ORIGINS ?? DEFAULT_ALLOWED_ORIGINS.join(','))
  .split(',')
  .map((origin) => origin.trim())
  .filter((origin) => origin.length > 0);

export const randomSeed = (): number => Math.floor(Math.random() * 0x7fffffff);

export const createRoomCode = (): string => Math.random().toString(36).slice(2, 8).toUpperCase();