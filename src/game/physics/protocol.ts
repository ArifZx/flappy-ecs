import type { PhysicsSharedBuffers } from './shared-state';

export type PhysicsBodyShape =
  | {
      kind: 'dynamic-circle';
      radius: number;
      density?: number;
      friction?: number;
      restitution?: number;
      gravityScale?: number;
      fixedRotation?: boolean;
      linearDamping?: number;
    }
  | {
      kind: 'static-box';
      halfWidth: number;
      halfHeight: number;
    };

export type PhysicsBodyUserData = {
  type: string;
  eid: number;
};

export type PhysicsWorkerRequest =
  | {
      type: 'init';
      capacity: number;
      gravity: { x: number; y: number };
      buffers: PhysicsSharedBuffers;
    }
  | {
      type: 'create-body';
      bodyId: number;
      entityId: number;
      x: number;
      y: number;
      angle?: number;
      shape: PhysicsBodyShape;
      userData: PhysicsBodyUserData;
    }
  | {
      type: 'destroy-body';
      bodyId: number;
    }
  | {
      type: 'set-linear-velocity';
      bodyId: number;
      x: number;
      y: number;
    }
  | {
      type: 'set-angular-velocity';
      bodyId: number;
      value: number;
    }
  | {
      type: 'set-gravity-scale';
      bodyId: number;
      value: number;
    }
  | {
      type: 'set-fixed-rotation';
      bodyId: number;
      value: boolean;
    }
  | {
      type: 'set-awake';
      bodyId: number;
      value: boolean;
    }
  | {
      type: 'set-transform';
      bodyId: number;
      x: number;
      y: number;
      angle: number;
    }
  | {
      type: 'step';
      dt: number;
    }
  | {
      type: 'dispose';
    };

export type PhysicsContactEvent = {
  type: 'contact-begin';
  bodyAId: number;
  bodyBId: number;
  userDataA?: PhysicsBodyUserData;
  userDataB?: PhysicsBodyUserData;
};

export type PhysicsWorkerResponse =
  | { type: 'ready' }
  | { type: 'stepped'; version: number; step: number }
  | PhysicsContactEvent;
