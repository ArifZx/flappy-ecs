export const PHYSICS_META_VERSION_INDEX = 0;
export const PHYSICS_META_CAPACITY_INDEX = 1;
export const PHYSICS_META_STEP_INDEX = 2;
export const PHYSICS_META_LENGTH = 3;

export type PhysicsSharedBuffer = SharedArrayBuffer | ArrayBuffer;

export type PhysicsSharedBuffers = {
  meta: PhysicsSharedBuffer;
  active: PhysicsSharedBuffer;
  entityIds: PhysicsSharedBuffer;
  x: PhysicsSharedBuffer;
  y: PhysicsSharedBuffer;
  angle: PhysicsSharedBuffer;
  velocityX: PhysicsSharedBuffer;
  velocityY: PhysicsSharedBuffer;
};

export type PhysicsSharedViews = {
  meta: Int32Array;
  active: Int32Array;
  entityIds: Int32Array;
  x: Float32Array;
  y: Float32Array;
  angle: Float32Array;
  velocityX: Float32Array;
  velocityY: Float32Array;
};

export const createPhysicsSharedBuffers = (
  capacity: number,
  useSharedArrayBuffer = true,
): PhysicsSharedBuffers => {
  const createBuffer = (byteLength: number): PhysicsSharedBuffer => {
    if (useSharedArrayBuffer && typeof SharedArrayBuffer !== 'undefined') {
      return new SharedArrayBuffer(byteLength);
    }

    return new ArrayBuffer(byteLength);
  };

  return {
    meta: createBuffer(Int32Array.BYTES_PER_ELEMENT * PHYSICS_META_LENGTH),
    active: createBuffer(Int32Array.BYTES_PER_ELEMENT * capacity),
    entityIds: createBuffer(Int32Array.BYTES_PER_ELEMENT * capacity),
    x: createBuffer(Float32Array.BYTES_PER_ELEMENT * capacity),
    y: createBuffer(Float32Array.BYTES_PER_ELEMENT * capacity),
    angle: createBuffer(Float32Array.BYTES_PER_ELEMENT * capacity),
    velocityX: createBuffer(Float32Array.BYTES_PER_ELEMENT * capacity),
    velocityY: createBuffer(Float32Array.BYTES_PER_ELEMENT * capacity),
  };
};

export const createPhysicsSharedViews = (
  buffers: PhysicsSharedBuffers,
  capacity: number,
): PhysicsSharedViews => {
  const views: PhysicsSharedViews = {
    meta: new Int32Array(buffers.meta),
    active: new Int32Array(buffers.active),
    entityIds: new Int32Array(buffers.entityIds),
    x: new Float32Array(buffers.x),
    y: new Float32Array(buffers.y),
    angle: new Float32Array(buffers.angle),
    velocityX: new Float32Array(buffers.velocityX),
    velocityY: new Float32Array(buffers.velocityY),
  };

  views.meta[PHYSICS_META_CAPACITY_INDEX] = capacity;

  return views;
};
