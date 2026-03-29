export const MAX_ENTITIES = 10000;

export const Position = {
  x: new Float32Array(MAX_ENTITIES),
  y: new Float32Array(MAX_ENTITIES),
};

export const SpriteRef = {
  id: new Uint32Array(MAX_ENTITIES),
};

export const BodyRef = {
  id: new Uint32Array(MAX_ENTITIES),
};

export const BirdTag = [] as number[];
export const PipeTag = [] as number[];

export const BirdAppearance = {
  variant: new Uint8Array(MAX_ENTITIES),
};