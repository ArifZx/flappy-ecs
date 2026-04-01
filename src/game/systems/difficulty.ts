import {
  NIGHT_MODE_STEP,
  PIPE_GAP,
  PIPE_SPEED,
  PIPE_SPEED_MAX,
} from '../config/constants';

export const MAX_DIFFICULTY_MARK = 300;
const PIPE_GAP_MIN = 95;
const GAP_VARIATION_RATIO = 0.18;
const DAY_DIFFICULTY_FACTOR = 0.88;
const NIGHT_DIFFICULTY_FACTOR = 1.12;

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));

export const isNightByMark = (mark: number): boolean => {
  const band = Math.floor(Math.max(0, mark) / NIGHT_MODE_STEP);
  return band % 2 === 1;
};

// Ease-out cubic: non-linear and reaches full difficulty exactly at 300 marks.
export const getGlobalDifficultyByMark = (mark: number): number => {
  const x = clamp01(mark / MAX_DIFFICULTY_MARK);
  const base = 1 - Math.pow(1 - x, 3);
  const phaseFactor = isNightByMark(mark)
    ? NIGHT_DIFFICULTY_FACTOR
    : DAY_DIFFICULTY_FACTOR;

  return clamp01(base * phaseFactor);
};

export const getPipeSpeedByMark = (mark: number): number => {
  if (mark <= 0) return PIPE_SPEED;

  const t = getGlobalDifficultyByMark(mark);
  return PIPE_SPEED + (PIPE_SPEED_MAX - PIPE_SPEED) * t;
};

export const getPipeGapByMark = (mark: number, rng: number): number => {
  const safeRng = Math.max(0, Math.min(1, rng));

  const t = getGlobalDifficultyByMark(mark);
  const baseGap = PIPE_GAP - (PIPE_GAP - PIPE_GAP_MIN) * t;
  const variance = baseGap * GAP_VARIATION_RATIO;

  // Blend sine/cosine waves so gap variation feels organic, not purely random.
  const phase = mark * 0.85 + safeRng * Math.PI * 2;
  const wave = Math.sin(phase) * 0.65 + Math.cos(phase * 0.5 + 1.2) * 0.35;
  const variedGap = baseGap + wave * variance;

  return Math.max(PIPE_GAP_MIN, variedGap);
};
