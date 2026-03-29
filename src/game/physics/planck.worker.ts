/// <reference lib="webworker" />

import { BoxShape, CircleShape, Vec2, World } from 'planck';
import type { Body } from 'planck';

import type {
  PhysicsBodyUserData,
  PhysicsWorkerRequest,
  PhysicsWorkerResponse,
} from './protocol';
import {
  createPhysicsSharedViews,
  PHYSICS_META_STEP_INDEX,
  PHYSICS_META_VERSION_INDEX,
  type PhysicsSharedViews,
} from './shared-state';

const ctx: DedicatedWorkerGlobalScope = self as DedicatedWorkerGlobalScope;

let world: World | null = null;
let shared: PhysicsSharedViews | null = null;
const bodyMap = new Map<number, Body>();
const bodyIdByBody = new Map<Body, number>();

const writeBodyState = (bodyId: number, body: Body, userData?: PhysicsBodyUserData): void => {
  if (!shared) return;

  const position = body.getPosition();
  const velocity = body.getLinearVelocity();
  shared.active[bodyId] = 1;
  shared.entityIds[bodyId] = userData?.eid ?? -1;
  shared.x[bodyId] = position.x;
  shared.y[bodyId] = position.y;
  shared.angle[bodyId] = body.getAngle();
  shared.velocityX[bodyId] = velocity.x;
  shared.velocityY[bodyId] = velocity.y;
};

const clearBodyState = (bodyId: number): void => {
  if (!shared) return;

  shared.active[bodyId] = 0;
  shared.entityIds[bodyId] = -1;
  shared.x[bodyId] = 0;
  shared.y[bodyId] = 0;
  shared.angle[bodyId] = 0;
  shared.velocityX[bodyId] = 0;
  shared.velocityY[bodyId] = 0;
};

const syncAllBodies = (): void => {
  if (!shared) return;

  for (const [bodyId, body] of bodyMap) {
    writeBodyState(bodyId, body, body.getUserData() as PhysicsBodyUserData | undefined);
  }

  const nextVersion = Atomics.add(shared.meta, PHYSICS_META_VERSION_INDEX, 1) + 1;
  const nextStep = Atomics.add(shared.meta, PHYSICS_META_STEP_INDEX, 1) + 1;
  ctx.postMessage({ type: 'stepped', version: nextVersion, step: nextStep } satisfies PhysicsWorkerResponse);
};

const handleCreateBody = (message: Extract<PhysicsWorkerRequest, { type: 'create-body' }>): void => {
  if (!world) return;

  const { bodyId, x, y, angle = 0, entityId, shape, userData } = message;
  const body = world.createBody({
    type: shape.kind === 'dynamic-circle' ? 'dynamic' : 'static',
    position: new Vec2(x, y),
    angle,
    fixedRotation: shape.kind === 'dynamic-circle' ? (shape.fixedRotation ?? false) : false,
    linearDamping: shape.kind === 'dynamic-circle' ? (shape.linearDamping ?? 0) : 0,
  });

  if (shape.kind === 'dynamic-circle') {
    body.createFixture(new CircleShape(shape.radius), {
      density: shape.density ?? 1,
      friction: shape.friction ?? 0,
      restitution: shape.restitution ?? 0,
    });
    body.setGravityScale(shape.gravityScale ?? 1);
  } else {
    body.createFixture(new BoxShape(shape.halfWidth, shape.halfHeight));
  }

  body.setUserData({ ...userData, eid: entityId });
  bodyMap.set(bodyId, body);
  bodyIdByBody.set(body, bodyId);
  writeBodyState(bodyId, body, userData);
};

const handleMessage = (message: PhysicsWorkerRequest): void => {
  switch (message.type) {
    case 'init': {
      world = new World(new Vec2(message.gravity.x, message.gravity.y));
      shared = createPhysicsSharedViews(message.buffers, message.capacity);
      world.on('begin-contact', (contact) => {
        const bodyA = contact.getFixtureA().getBody();
        const bodyB = contact.getFixtureB().getBody();
        const bodyAId = bodyIdByBody.get(bodyA) ?? -1;
        const bodyBId = bodyIdByBody.get(bodyB) ?? -1;

        ctx.postMessage({
          type: 'contact-begin',
          bodyAId,
          bodyBId,
          userDataA: bodyA.getUserData() as PhysicsBodyUserData | undefined,
          userDataB: bodyB.getUserData() as PhysicsBodyUserData | undefined,
        } satisfies PhysicsWorkerResponse);
      });
      ctx.postMessage({ type: 'ready' } satisfies PhysicsWorkerResponse);
      return;
    }
    case 'create-body':
      handleCreateBody(message);
      return;
    case 'destroy-body': {
      if (!world) return;
      const body = bodyMap.get(message.bodyId);
      if (!body) return;
      world.destroyBody(body);
      bodyIdByBody.delete(body);
      bodyMap.delete(message.bodyId);
      clearBodyState(message.bodyId);
      return;
    }
    case 'set-linear-velocity': {
      const body = bodyMap.get(message.bodyId);
      if (!body) return;
      body.setLinearVelocity(new Vec2(message.x, message.y));
      return;
    }
    case 'set-angular-velocity': {
      const body = bodyMap.get(message.bodyId);
      if (!body) return;
      body.setAngularVelocity(message.value);
      return;
    }
    case 'set-gravity-scale': {
      const body = bodyMap.get(message.bodyId);
      if (!body) return;
      body.setGravityScale(message.value);
      return;
    }
    case 'set-fixed-rotation': {
      const body = bodyMap.get(message.bodyId);
      if (!body) return;
      body.setFixedRotation(message.value);
      return;
    }
    case 'set-awake': {
      const body = bodyMap.get(message.bodyId);
      if (!body) return;
      body.setAwake(message.value);
      return;
    }
    case 'set-transform': {
      const body = bodyMap.get(message.bodyId);
      if (!body) return;
      body.setTransform(new Vec2(message.x, message.y), message.angle);
      return;
    }
    case 'step': {
      if (!world) return;
      world.step(message.dt);
      syncAllBodies();
      return;
    }
    case 'dispose': {
      bodyIdByBody.clear();
      bodyMap.clear();
      world = null;
      shared = null;
      ctx.close();
      return;
    }
    default:
      return;
  }
};

ctx.addEventListener('message', (event: MessageEvent<PhysicsWorkerRequest>) => {
  handleMessage(event.data);
});
