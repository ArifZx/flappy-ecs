import type { PhysicsAdapter, PhysicsBodyHandle, PhysicsContactListener } from './adapter';
import type {
  PhysicsBodyShape,
  PhysicsBodyUserData,
  PhysicsWorkerRequest,
  PhysicsWorkerResponse,
} from './protocol';
import {
  createPhysicsSharedBuffers,
  createPhysicsSharedViews,
  type PhysicsSharedViews,
} from './shared-state';

type WorkerAdapterOptions = {
  capacity: number;
  gravity: { x: number; y: number };
};

export const canUseSharedArrayBufferPhysics = (): boolean =>
  typeof Worker !== 'undefined' &&
  typeof SharedArrayBuffer !== 'undefined' &&
  globalThis.crossOriginIsolated === true;

export class WorkerPhysicsAdapter implements PhysicsAdapter {
  readonly shared: PhysicsSharedViews;

  private readonly worker: Worker;
  private readonly listeners = new Set<PhysicsContactListener>();
  private readonly pendingMessages: PhysicsWorkerRequest[] = [];
  private nextBodyId = 1;
  private initPromise: Promise<void> | null = null;
  private ready = false;

  constructor(options: WorkerAdapterOptions) {
    if (!canUseSharedArrayBufferPhysics()) {
      throw new Error(
        'SharedArrayBuffer physics requires crossOriginIsolated context with COOP/COEP headers.',
      );
    }

    const buffers = createPhysicsSharedBuffers(options.capacity);
    this.shared = createPhysicsSharedViews(buffers, options.capacity);
    this.worker = new Worker(new URL('./planck.worker.ts', import.meta.url), {
      type: 'module',
    });

    this.worker.addEventListener('message', (event: MessageEvent<PhysicsWorkerResponse>) => {
      if (event.data.type === 'contact-begin') {
        for (const listener of this.listeners) {
          listener(event.data);
        }
      }
    });

    this.initPromise = new Promise<void>((resolve) => {
      const handleMessage = (event: MessageEvent<PhysicsWorkerResponse>): void => {
        if (event.data.type !== 'ready') return;
        this.ready = true;
        this.flushPendingMessages();
        this.worker.removeEventListener('message', handleMessage as EventListener);
        resolve();
      };

      this.worker.addEventListener('message', handleMessage as EventListener);
      this.post({
        type: 'init',
        capacity: options.capacity,
        gravity: options.gravity,
        buffers,
      });
    });
  }

  init(): Promise<void> {
    return this.initPromise ?? Promise.resolve();
  }

  createBody(args: {
    entityId: number;
    x: number;
    y: number;
    angle?: number;
    shape: PhysicsBodyShape;
    userData: PhysicsBodyUserData;
  }): PhysicsBodyHandle {
    const bodyId = this.nextBodyId;
    this.nextBodyId += 1;

    this.post({
      type: 'create-body',
      bodyId,
      entityId: args.entityId,
      x: args.x,
      y: args.y,
      angle: args.angle,
      shape: args.shape,
      userData: args.userData,
    });

    return { bodyId, entityId: args.entityId };
  }

  destroyBody(bodyId: number): void {
    this.post({ type: 'destroy-body', bodyId });
  }

  setLinearVelocity(bodyId: number, x: number, y: number): void {
    this.post({ type: 'set-linear-velocity', bodyId, x, y });
  }

  setAngularVelocity(bodyId: number, value: number): void {
    this.post({ type: 'set-angular-velocity', bodyId, value });
  }

  setGravityScale(bodyId: number, value: number): void {
    this.post({ type: 'set-gravity-scale', bodyId, value });
  }

  setFixedRotation(bodyId: number, value: boolean): void {
    this.post({ type: 'set-fixed-rotation', bodyId, value });
  }

  setAwake(bodyId: number, value: boolean): void {
    this.post({ type: 'set-awake', bodyId, value });
  }

  setTransform(bodyId: number, x: number, y: number, angle: number): void {
    this.post({ type: 'set-transform', bodyId, x, y, angle });
  }

  step(dt: number): void {
    this.post({ type: 'step', dt });
  }

  onContact(listener: PhysicsContactListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  dispose(): void {
    this.post({ type: 'dispose' });
    this.worker.terminate();
    this.listeners.clear();
  }

  private post(message: PhysicsWorkerRequest): void {
    if (!this.ready && message.type !== 'init') {
      this.pendingMessages.push(message);
      return;
    }

    this.worker.postMessage(message);
  }

  private flushPendingMessages(): void {
    for (const message of this.pendingMessages) {
      this.worker.postMessage(message);
    }
    this.pendingMessages.length = 0;
  }
}
