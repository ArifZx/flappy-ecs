import { PIPE_GAP, PIPE_SPEED, PIPE_SPEED_MAX } from '../config/constants';

const SPEED_CURVE_STEEPNESS = 12;
const GAP_CURVE_STEEPNESS = 14;
const PIPE_GAP_MIN = 95;
const GAP_VARIATION_RATIO = 0.18;

export const getPipeSpeedByScore = (score: number): number => {
  if (score <= 0) return PIPE_SPEED;

  const t = 1 - Math.exp(-score / SPEED_CURVE_STEEPNESS);
  return PIPE_SPEED + (PIPE_SPEED_MAX - PIPE_SPEED) * t;
};

export const getPipeGapByScore = (score: number, rng: number): number => {
  const safeRng = Math.max(0, Math.min(1, rng));

  const t = 1 - Math.exp(-Math.max(0, score) / GAP_CURVE_STEEPNESS);
  const baseGap = PIPE_GAP - (PIPE_GAP - PIPE_GAP_MIN) * t;
  const variance = baseGap * GAP_VARIATION_RATIO;

  // Blend sine/cosine waves so gap variation feels organic, not purely random.
  const phase = score * 0.85 + safeRng * Math.PI * 2;
  const wave = Math.sin(phase) * 0.65 + Math.cos(phase * 0.5 + 1.2) * 0.35;
  const variedGap = baseGap + wave * variance;

  return Math.max(PIPE_GAP_MIN, variedGap);
};
