import { Sprite } from 'pixi.js';
import type { QueryResult } from 'bitecs';
import type { Body } from 'planck';

export type PipePair = {
  topEid: number;
  bottomEid: number;
  scored: boolean;
};

export type EntityStores = {
  sprites: Array<Sprite | null>;
  bodies: Array<Body | null>;
};

export type EcsQuery = QueryResult;