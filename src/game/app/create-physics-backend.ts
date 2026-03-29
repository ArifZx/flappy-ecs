import {
  MainThreadPhysicsAdapter,
  WorkerPhysicsAdapter,
  canUseSharedArrayBufferPhysics,
  type PhysicsAdapter,
} from '../physics';

export type PhysicsBackendName = 'main-thread' | 'worker';

type CreatePhysicsBackendParams = {
  preferredBackend: PhysicsBackendName;
  capacity: number;
  gravity: { x: number; y: number };
};

export type PhysicsBackendResult = {
  physics: PhysicsAdapter;
  backend: PhysicsBackendName;
};

export const createPhysicsBackend = async ({
  preferredBackend,
  capacity,
  gravity,
}: CreatePhysicsBackendParams): Promise<PhysicsBackendResult> => {
  const useWorkerPhysics =
    preferredBackend === 'worker' && canUseSharedArrayBufferPhysics();

  if (preferredBackend === 'worker' && !useWorkerPhysics) {
    console.warn(
      'Worker physics disabled: SharedArrayBuffer is unavailable or crossOriginIsolated is false. Falling back to main-thread physics.',
    );
  }

  const physics: PhysicsAdapter = useWorkerPhysics
    ? new WorkerPhysicsAdapter({ capacity, gravity })
    : new MainThreadPhysicsAdapter({ capacity, gravity });

  await physics.init();

  return {
    physics,
    backend: useWorkerPhysics ? 'worker' : 'main-thread',
  };
};
