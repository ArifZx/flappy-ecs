import { Assets } from 'pixi.js';
import { sound } from '@pixi/sound';

import { AUDIO_CONFIG, GAME_SFX } from '../config/audio';
import type { SoundAlias } from '../config/audio';

const soundQueue = new Set<SoundAlias>();
const AUDIO_MUTED_STORAGE_KEY = 'flappy-party-audio-muted';
let initialized = false;
let muted = false;

const loadMutedPreference = (): boolean => {
  if (typeof window === 'undefined') {
    return false;
  }

  return window.localStorage.getItem(AUDIO_MUTED_STORAGE_KEY) === '1';
};

const storeMutedPreference = (value: boolean): void => {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(AUDIO_MUTED_STORAGE_KEY, value ? '1' : '0');
};

muted = loadMutedPreference();

export const preloadSounds = async (): Promise<void> => {
  if (initialized) return;

  const entries = Object.entries(AUDIO_CONFIG) as Array<
    [SoundAlias, (typeof AUDIO_CONFIG)[SoundAlias]]
  >;

  for (const [alias, { src }] of entries) {
    Assets.add({ alias, src });
  }

  await Promise.all(entries.map(([alias]) => Assets.load(alias)));
  initialized = true;
};

export const playSound = (alias: SoundAlias): void => {
  if (muted) {
    return;
  }

  soundQueue.add(alias);
};

export const flushSoundQueue = (): void => {
  if (muted) {
    soundQueue.clear();
    return;
  }

  for (const alias of soundQueue) {
    if (!sound.exists(alias)) continue;
    sound.play(alias);
  }
  soundQueue.clear();
};

export const setAudioMuted = (value: boolean): void => {
  muted = value;
  storeMutedPreference(value);
  if (muted) {
    sound.stopAll();
    soundQueue.clear();
  }
};

export const isAudioMuted = (): boolean => muted;

export { GAME_SFX };
