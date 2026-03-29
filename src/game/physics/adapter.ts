import type { PhysicsBodyShape, PhysicsBodyUserData, PhysicsContactEvent } from './protocol';
import type { PhysicsSharedViews } from './shared-state';

export type PhysicsBodyHandle = {
  bodyId: number;
  entityId: number;
};

export type PhysicsContactListener = (event: PhysicsContactEvent) => void;

export interface PhysicsAdapter {
  readonly shared: PhysicsSharedViews;
  init(): Promise<void>;
  createBody(args: {
    entityId: number;
    x: number;
    y: number;
    angle?: number;
    shape: PhysicsBodyShape;
    userData: PhysicsBodyUserData;
  }): PhysicsBodyHandle;
  destroyBody(bodyId: number): void;
  setLinearVelocity(bodyId: number, x: number, y: number): void;
  setAngularVelocity(bodyId: number, value: number): void;
  setGravityScale(bodyId: number, value: number): void;
  setFixedRotation(bodyId: number, value: boolean): void;
  setAwake(bodyId: number, value: boolean): void;
  setTransform(bodyId: number, x: number, y: number, angle: number): void;
  step(dt: number): void;
  onContact(listener: PhysicsContactListener): () => void;
  dispose(): void;
}
