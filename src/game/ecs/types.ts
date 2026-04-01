import { Sprite } from 'pixi.js';
import type { QueryResult } from 'bitecs';

export type PipePair = {
  topEid: number;
  bottomEid: number;
  passed: boolean;
};

export type EntityStores = {
  sprites: Array<Sprite | null>;
};

export type EcsQuery = QueryResult;