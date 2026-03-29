import {
  NIGHT_MODE_SCORE_STEP,
  PIPE_GAP,
  PIPE_SPEED,
  PIPE_SPEED_MAX,
} from '../config/constants';

export const MAX_DIFFICULTY_SCORE = 300;
const PIPE_GAP_MIN = 95;
const GAP_VARIATION_RATIO = 0.18;
const DAY_DIFFICULTY_FACTOR = 0.88;
const NIGHT_DIFFICULTY_FACTOR = 1.12;

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));

export const isNightByScore = (score: number): boolean => {
  const scoreBand = Math.floor(Math.max(0, score) / NIGHT_MODE_SCORE_STEP);
  return scoreBand % 2 === 1;
};

// Ease-out cubic: non-linear and reaches full difficulty exactly at score 300.
export const getGlobalDifficultyByScore = (score: number): number => {
  const x = clamp01(score / MAX_DIFFICULTY_SCORE);
  const base = 1 - Math.pow(1 - x, 3);
  const phaseFactor = isNightByScore(score)
    ? NIGHT_DIFFICULTY_FACTOR
    : DAY_DIFFICULTY_FACTOR;

  return clamp01(base * phaseFactor);
};

export const getPipeSpeedByScore = (score: number): number => {
  if (score <= 0) return PIPE_SPEED;

  const t = getGlobalDifficultyByScore(score);
  return PIPE_SPEED + (PIPE_SPEED_MAX - PIPE_SPEED) * t;
};

export const getPipeGapByScore = (score: number, rng: number): number => {
  const safeRng = Math.max(0, Math.min(1, rng));

  const t = getGlobalDifficultyByScore(score);
  const baseGap = PIPE_GAP - (PIPE_GAP - PIPE_GAP_MIN) * t;
  const variance = baseGap * GAP_VARIATION_RATIO;

  // Blend sine/cosine waves so gap variation feels organic, not purely random.
  const phase = score * 0.85 + safeRng * Math.PI * 2;
  const wave = Math.sin(phase) * 0.65 + Math.cos(phase * 0.5 + 1.2) * 0.35;
  const variedGap = baseGap + wave * variance;

  return Math.max(PIPE_GAP_MIN, variedGap);
};
