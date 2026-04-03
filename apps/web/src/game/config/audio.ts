export const AUDIO_CONFIG = {
  sfx_die: {
    src: 'audio/sfx_die.{ogg,m4a,mp3}',
  },
  sfx_point: {
    src: 'audio/sfx_point.{ogg,m4a,mp3}',
  },
  sfx_hit: {
    src: 'audio/sfx_hit.{ogg,m4a,mp3}',
  },
  sfx_swooshing: {
    src: 'audio/sfx_swooshing.{ogg,m4a,mp3}',
  },
  sfx_wing: {
    src: 'audio/sfx_wing.{ogg,m4a,mp3}',
  },
} as const;

export type SoundAlias = keyof typeof AUDIO_CONFIG;

export const GAME_SFX = {
  flap: 'sfx_wing',
  point: 'sfx_point',
  hit: 'sfx_hit',
  die: 'sfx_die',
  swoosh: 'sfx_swooshing',
} as const satisfies Record<string, SoundAlias>;