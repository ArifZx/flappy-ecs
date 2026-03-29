import { Assets } from 'pixi.js';
import { sound } from '@pixi/sound';

import { AUDIO_CONFIG, GAME_SFX } from '../config/audio';
import type { SoundAlias } from '../config/audio';

const soundQueue = new Set<SoundAlias>();
let initialized = false;

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
  soundQueue.add(alias);
};

export const flushSoundQueue = (): void => {
  for (const alias of soundQueue) {
    if (!sound.exists(alias)) continue;
    sound.play(alias);
  }
  soundQueue.clear();
};

export { GAME_SFX };
