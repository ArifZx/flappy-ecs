import { Sprite } from 'pixi.js';
import * as planck from 'planck';

export type PipePair = {
  topEid: number;
  bottomEid: number;
  scored: boolean;
};

export type EntityStores = {
  sprites: Array<Sprite | null>;
  bodies: Array<planck.Body | null>;
};

export type EcsQuery = ArrayLike<number>;