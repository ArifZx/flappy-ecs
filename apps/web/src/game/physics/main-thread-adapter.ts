import { BoxShape, CircleShape, Vec2, World } from 'planck';
import type { Body } from 'planck';

import type { PhysicsAdapter, PhysicsBodyHandle, PhysicsContactListener } from './adapter';
import type { PhysicsBodyShape, PhysicsBodyUserData } from './protocol';
import {
  createPhysicsSharedBuffers,
  createPhysicsSharedViews,
  PHYSICS_META_STEP_INDEX,
  PHYSICS_META_VERSION_INDEX,
  type PhysicsSharedViews,
} from './shared-state';

type MainThreadAdapterOptions = {
  capacity: number;
  gravity: { x: number; y: number };
};

export class MainThreadPhysicsAdapter implements PhysicsAdapter {
  readonly shared: PhysicsSharedViews;

  private readonly world: World;
  private readonly listeners = new Set<PhysicsContactListener>();
  private readonly bodyMap = new Map<number, Body>();
  private readonly bodyIdByBody = new Map<Body, number>();
  private nextBodyId = 1;

  constructor(options: MainThreadAdapterOptions) {
    const buffers = createPhysicsSharedBuffers(options.capacity);
    this.shared = createPhysicsSharedViews(buffers, options.capacity);
    this.world = new World(new Vec2(options.gravity.x, options.gravity.y));

    this.world.on('begin-contact', (contact) => {
      const bodyA = contact.getFixtureA().getBody();
      const bodyB = contact.getFixtureB().getBody();

      for (const listener of this.listeners) {
        listener({
          type: 'contact-begin',
          bodyAId: this.bodyIdByBody.get(bodyA) ?? -1,
          bodyBId: this.bodyIdByBody.get(bodyB) ?? -1,
          userDataA: bodyA.getUserData() as PhysicsBodyUserData | undefined,
          userDataB: bodyB.getUserData() as PhysicsBodyUserData | undefined,
        });
      }
    });
  }

  init(): Promise<void> {
    return Promise.resolve();
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

    const body = this.world.createBody({
      type: args.shape.kind === 'dynamic-circle' ? 'dynamic' : 'static',
      position: new Vec2(args.x, args.y),
      angle: args.angle ?? 0,
      fixedRotation:
        args.shape.kind === 'dynamic-circle' ? (args.shape.fixedRotation ?? false) : false,
      linearDamping:
        args.shape.kind === 'dynamic-circle' ? (args.shape.linearDamping ?? 0) : 0,
    });

    if (args.shape.kind === 'dynamic-circle') {
      body.createFixture(new CircleShape(args.shape.radius), {
        density: args.shape.density ?? 1,
        friction: args.shape.friction ?? 0,
        restitution: args.shape.restitution ?? 0,
      });
      body.setGravityScale(args.shape.gravityScale ?? 1);
    } else {
      body.createFixture(new BoxShape(args.shape.halfWidth, args.shape.halfHeight));
    }

    body.setUserData({ ...args.userData, eid: args.entityId });
    this.bodyMap.set(bodyId, body);
    this.bodyIdByBody.set(body, bodyId);
    this.writeBodyState(bodyId, body, args.userData);

    return { bodyId, entityId: args.entityId };
  }

  destroyBody(bodyId: number): void {
    const body = this.bodyMap.get(bodyId);
    if (!body) return;

    this.world.destroyBody(body);
    this.bodyMap.delete(bodyId);
    this.bodyIdByBody.delete(body);
    this.clearBodyState(bodyId);
  }

  setLinearVelocity(bodyId: number, x: number, y: number): void {
    const body = this.bodyMap.get(bodyId);
    if (!body) return;
    body.setLinearVelocity(new Vec2(x, y));
    this.writeBodyState(bodyId, body, body.getUserData() as PhysicsBodyUserData | undefined);
  }

  setAngularVelocity(bodyId: number, value: number): void {
    const body = this.bodyMap.get(bodyId);
    if (!body) return;
    body.setAngularVelocity(value);
  }

  setGravityScale(bodyId: number, value: number): void {
    const body = this.bodyMap.get(bodyId);
    if (!body) return;
    body.setGravityScale(value);
  }

  setFixedRotation(bodyId: number, value: boolean): void {
    const body = this.bodyMap.get(bodyId);
    if (!body) return;
    body.setFixedRotation(value);
  }

  setAwake(bodyId: number, value: boolean): void {
    const body = this.bodyMap.get(bodyId);
    if (!body) return;
    body.setAwake(value);
  }

  setTransform(bodyId: number, x: number, y: number, angle: number): void {
    const body = this.bodyMap.get(bodyId);
    if (!body) return;
    body.setTransform(new Vec2(x, y), angle);
    this.writeBodyState(bodyId, body, body.getUserData() as PhysicsBodyUserData | undefined);
  }

  step(dt: number): void {
    this.world.step(dt);

    for (const [bodyId, body] of this.bodyMap) {
      this.writeBodyState(bodyId, body, body.getUserData() as PhysicsBodyUserData | undefined);
    }

    Atomics.add(this.shared.meta, PHYSICS_META_VERSION_INDEX, 1);
    Atomics.add(this.shared.meta, PHYSICS_META_STEP_INDEX, 1);
  }

  onContact(listener: PhysicsContactListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  dispose(): void {
    this.listeners.clear();
    this.bodyIdByBody.clear();
    this.bodyMap.clear();
  }

  private writeBodyState(bodyId: number, body: Body, userData?: PhysicsBodyUserData): void {
    const position = body.getPosition();
    const velocity = body.getLinearVelocity();
    this.shared.active[bodyId] = 1;
    this.shared.entityIds[bodyId] = userData?.eid ?? -1;
    this.shared.x[bodyId] = position.x;
    this.shared.y[bodyId] = position.y;
    this.shared.angle[bodyId] = body.getAngle();
    this.shared.velocityX[bodyId] = velocity.x;
    this.shared.velocityY[bodyId] = velocity.y;
  }

  private clearBodyState(bodyId: number): void {
    this.shared.active[bodyId] = 0;
    this.shared.entityIds[bodyId] = -1;
    this.shared.x[bodyId] = 0;
    this.shared.y[bodyId] = 0;
    this.shared.angle[bodyId] = 0;
    this.shared.velocityX[bodyId] = 0;
    this.shared.velocityY[bodyId] = 0;
  }
}