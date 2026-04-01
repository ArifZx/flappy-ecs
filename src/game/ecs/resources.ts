export type GamePhase = 'idle' | 'playing' | 'game-over';

export type GameRuntimeResource = {
  phase: GamePhase;
  flapFrame: number;
  flapTimer: number;
  bobTimer: number;
  reset: () => void;
  peek: () => number;
  bump: (delta: number) => number;
  guard: () => boolean;
};

const randomUint32 = (): number => {
  const values = new Uint32Array(1);
  crypto.getRandomValues(values);
  return values[0] ?? 0;
};

const mix32 = (value: number): number => {
  let mixed = value >>> 0;
  mixed ^= mixed >>> 16;
  mixed = Math.imul(mixed, 0x7feb352d) >>> 0;
  mixed ^= mixed >>> 15;
  mixed = Math.imul(mixed, 0x846ca68b) >>> 0;
  mixed ^= mixed >>> 16;
  return mixed >>> 0;
};

export const createGameRuntimeResource = (): GameRuntimeResource => {
  const maskA = randomUint32();
  const maskB = randomUint32();

  let payload = new Uint16Array(0);
  let stamp = 0;
  let sealed = true;

  const keyAt = (index: number): number => {
    const lane = index & 7;
    const partA = (maskA >>> (lane * 4)) & 0xff;
    const partB = (maskB >>> (((lane + 3) & 7) * 4)) & 0xff;
    return (partA ^ partB ^ ((index * 29) & 0xff) ^ 0x5a) & 0xff;
  };

  const unpack = (): number => {
    if (payload.length === 0) {
      return 0;
    }

    let text = '';
    for (let index = 0; index < payload.length; index += 1) {
      text += String.fromCharCode(payload[index] ^ keyAt(index));
    }

    return Number.parseInt(text, 10);
  };

  const stampOf = (value: number): number => {
    let mixed = mix32(maskA ^ maskB ^ payload.length ^ value);
    for (let index = 0; index < payload.length; index += 1) {
      mixed = mix32(mixed ^ payload[index] ^ ((index + 1) * 131));
    }
    return mixed >>> 0;
  };

  const write = (value: number): number => {
    const text = String(value);
    const next = new Uint16Array(text.length);

    for (let index = 0; index < text.length; index += 1) {
      next[index] = text.charCodeAt(index) ^ keyAt(index);
    }

    payload = next;
    stamp = stampOf(value);
    sealed = true;
    return value;
  };

  const poison = (): void => {
    sealed = false;
  };

  const resource: GameRuntimeResource = {
    phase: 'idle',
    flapFrame: 0,
    flapTimer: 0,
    bobTimer: 0,
    reset: () => {
      resource.phase = 'idle';
      resource.flapFrame = 0;
      resource.flapTimer = 0;
      resource.bobTimer = 0;
      write(0);
    },
    peek: () => unpack(),
    bump: (delta) => {
      const currentValue = unpack();
      if (!Number.isSafeInteger(delta) || delta < 0) {
        poison();
        return currentValue;
      }

      const nextValue = currentValue + delta;
      if (!Number.isSafeInteger(nextValue) || nextValue < currentValue) {
        poison();
        return currentValue;
      }

      return write(nextValue);
    },
    guard: () => {
      if (!sealed) {
        return false;
      }

      const value = unpack();
      if (!Number.isSafeInteger(value) || value < 0) {
        poison();
        return false;
      }

      if (stampOf(value) !== stamp) {
        poison();
        return false;
      }

      return true;
    },
  };

  write(0);

  return resource;
};
