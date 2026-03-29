import { GROUND_Y } from '../config/constants';
import { getPipeGapByScore } from './difficulty';

export type PipeMapEntry = {
  id: number;
  x: number;
  gap: number;
  height: number;
};

type PipePattern = 'flat' | 'up' | 'down' | 'wave';

type PipeMapState = {
  cursor: number;
  lastHeight: number;
  pattern: PipePattern;
  segmentRemaining: number;
  wavePhase: number;
  closeBurstRemaining: number;
};

export type PipeMapProvider = {
  reset: () => void;
  nextEntries: (score: number, count: number) => PipeMapEntry[];
};

type CreatePipeMapProviderParams = {
  seed: number;
  initialHeight: number;
};

const MIN_HEIGHT = 110;
const MAX_HEIGHT_PADDING = 110;
const CLOSE_SPACING_MIN = 62;
const CLOSE_SPACING_MAX = 84;
const NORMAL_SPACING_MIN = 92;


const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

const pickPattern = (rng: () => number): PipePattern => {
  const roll = rng();
  if (roll < 0.28) return 'flat';
  if (roll < 0.52) return 'up';
  if (roll < 0.76) return 'down';
  return 'wave';
};

const pickSegmentLength = (rng: () => number): number => 2 + Math.floor(rng() * 4);

const createMulberry32 = (seed: number): (() => number) => {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), t | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
};

const createPipeMapState = (initialHeight: number): PipeMapState => ({
  cursor: 0,
  lastHeight: initialHeight,
  pattern: 'flat',
  segmentRemaining: 0,
  wavePhase: 0,
  closeBurstRemaining: 0,
});

type GeneratePipeMapEntriesParams = {
  score: number;
  count: number;
  state: PipeMapState;
  rng: () => number;
};

const generatePipeMapEntries = ({
  score,
  count,
  state,
  rng,
}: GeneratePipeMapEntriesParams): PipeMapEntry[] => {
  const entries: PipeMapEntry[] = [];
  const difficulty = 1 - Math.exp(-Math.max(0, score) / 16);

  for (let i = 0; i < count; i += 1) {
    if (state.segmentRemaining <= 0) {
      state.pattern = pickPattern(rng);
      state.segmentRemaining = pickSegmentLength(rng);
    }

    if (state.closeBurstRemaining <= 0) {
      const closeBurstChance = 0.14 + difficulty * 0.2;
      if (rng() < closeBurstChance) {
        state.closeBurstRemaining = 2 + Math.floor(rng() * 2);
      }
    }

    const spacingMin = NORMAL_SPACING_MIN;
    const spacingMax = 168 - difficulty * 26;
    let xSpacing = spacingMin + rng() * (spacingMax - spacingMin);
    if (state.closeBurstRemaining > 0) {
      xSpacing = CLOSE_SPACING_MIN + rng() * (CLOSE_SPACING_MAX - CLOSE_SPACING_MIN);
      state.closeBurstRemaining -= 1;
    }

    let deltaY = 0;
    if (state.pattern === 'flat') {
      deltaY = (rng() * 2 - 1) * 10;
    } else if (state.pattern === 'up') {
      deltaY = 7 + rng() * (11 + difficulty * 8);
    } else if (state.pattern === 'down') {
      deltaY = -(7 + rng() * (11 + difficulty * 8));
    } else {
      state.wavePhase += 0.8 + rng() * 0.55;
      deltaY = Math.sin(state.wavePhase) * (14 + difficulty * 12);
    }

    // Keep steep vertical changes only for wider spacing so tight bursts stay passable.
    const spacingFactor = clamp((xSpacing - CLOSE_SPACING_MIN) / (168 - CLOSE_SPACING_MIN), 0, 1);
    const maxDeltaY = 8 + spacingFactor * 22;
    deltaY = clamp(deltaY, -maxDeltaY, maxDeltaY);

    const nextHeight = clamp(
      state.lastHeight + deltaY,
      MIN_HEIGHT,
      GROUND_Y - MAX_HEIGHT_PADDING,
    );

    const baseGap = getPipeGapByScore(score, rng());
    const closeness = clamp((NORMAL_SPACING_MIN - xSpacing) / (NORMAL_SPACING_MIN - CLOSE_SPACING_MIN), 0, 1);
    const closeGapBonus = closeness * (10 + difficulty * 7);
    const gap = Math.min(baseGap + closeGapBonus, 170);

    entries.push({
      id: state.cursor,
      x: xSpacing,
      gap,
      height: nextHeight,
    });

    state.cursor += 1;
    state.lastHeight = nextHeight;
    state.segmentRemaining -= 1;
  }

  return entries;
};

export const createPipeMapProvider = ({
  seed,
  initialHeight,
}: CreatePipeMapProviderParams): PipeMapProvider => {
  let state = createPipeMapState(initialHeight);
  let rng = createMulberry32(seed);

  return {
    reset: () => {
      state = createPipeMapState(initialHeight);
      rng = createMulberry32(seed);
    },
    nextEntries: (score: number, count: number): PipeMapEntry[] =>
      generatePipeMapEntries({
        score,
        count,
        state,
        rng,
      }),
  };
};
