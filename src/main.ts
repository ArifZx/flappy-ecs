import './style.css';

import { Application, Assets, Container, Sprite, Text } from 'pixi.js';
import type { Spritesheet } from 'pixi.js';
import * as ecs from 'bitecs';
import * as planck from 'planck';
import {
  GAME_WIDTH,
  GAME_HEIGHT,
  GROUND_HEIGHT,
  GROUND_Y,
  PIPE_SPEED,
  PIPE_SPAWN_INTERVAL,
  BIRD_START_Y,
  pxToM,
  BIRD_X,
} from './game/config/constants';
import { createBackground } from './game/ui/background';

import {
  MAX_ENTITIES,
  Position,
  SpriteRef,
  BodyRef,
  BirdTag,
  PipeTag,
} from './game/ecs/components';
import type { EntityStores, PipePair } from './game/ecs/types';
import { destroyEntity } from './game/ecs/entity-lifecycle';
import { createBirdEntity } from './game/entities/bird';
import { spawnPipePair } from './game/entities/pipe';
import { moveAndCleanupPipes } from './game/systems/pipe-system';
import {
  syncBirdFromPhysics,
  syncSpritesFromPosition,
} from './game/systems/render-system';

(async () => {
  const app = new Application();
  await app.init({
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    backgroundColor: 0x70c5ce,
    antialias: true,
  });

  const appRoot = document.getElementById('app');
  if (appRoot) {
    appRoot.appendChild(app.canvas);
  } else {
    document.body.appendChild(app.canvas);
  }

  const atlasTexture = await Assets.load('sprites/game.png');
  Assets.add({
    alias: 'game-atlas',
    src: 'sprites/game.json',
    data: { texture: atlasTexture },
  });
  const sheet = await Assets.load<Spritesheet>('game-atlas');

  const lcpPoster = document.getElementById('lcp-poster');
  if (lcpPoster) {
    lcpPoster.remove();
  }

  const scene = new Container();
  app.stage.addChild(scene);

  const background = createBackground(sheet, GAME_WIDTH, GAME_HEIGHT);
  scene.addChild(background);

  const pipesLayer = new Container();
  scene.addChild(pipesLayer);

  const birdLayer = new Container();
  scene.addChild(birdLayer);

  const groundA = new Sprite(sheet.textures.base);
  const groundB = new Sprite(sheet.textures.base);
  groundA.anchor.set(0, 0);
  groundB.anchor.set(0, 0);
  groundA.position.set(0, GROUND_Y);
  groundB.position.set(groundA.width, GROUND_Y);
  scene.addChild(groundA, groundB);

  const scoreText = new Text({
    text: '0',
    style: {
      fontFamily: 'Arial',
      fontSize: 36,
      fill: 0xffffff,
      stroke: { color: 0x000000, width: 4 },
    },
  });
  scoreText.anchor.set(0.5, 0);
  scoreText.position.set(GAME_WIDTH / 2, 16);
  scene.addChild(scoreText);

  const hintText = new Text({
    text: 'Klik atau tekan Space untuk flap',
    style: {
      fontFamily: 'Arial',
      fontSize: 16,
      fill: 0xffffff,
      stroke: { color: 0x000000, width: 3 },
    },
  });
  hintText.anchor.set(0.5, 0.5);
  hintText.position.set(GAME_WIDTH / 2, GAME_HEIGHT * 0.28);
  scene.addChild(hintText);

  const gameOverSprite = new Sprite(sheet.textures.gameover);
  gameOverSprite.anchor.set(0.5);
  gameOverSprite.position.set(GAME_WIDTH / 2, GAME_HEIGHT * 0.32);
  gameOverSprite.visible = false;
  scene.addChild(gameOverSprite);

  const ecsWorld = ecs.createWorld();
  const physicsWorld = planck.World(planck.Vec2(0, 24));

  const stores: EntityStores = {
    sprites: new Array(MAX_ENTITIES).fill(null),
    bodies: new Array(MAX_ENTITIES).fill(null),
  };

  const { birdEid, birdBody, birdSprite, birdFrames } = createBirdEntity({
    ecsWorld,
    physicsWorld,
    birdLayer,
    sheet,
    stores,
  });

  const groundBody = physicsWorld.createBody({
    type: 'static',
    position: planck.Vec2(pxToM(GAME_WIDTH / 2), pxToM(GROUND_Y + GROUND_HEIGHT / 2)),
  });
  groundBody.createFixture(planck.Box(pxToM(GAME_WIDTH / 2), pxToM(GROUND_HEIGHT / 2)));
  groundBody.setUserData({ type: 'ground' });

  const ceilingBody = physicsWorld.createBody({
    type: 'static',
    position: planck.Vec2(pxToM(GAME_WIDTH / 2), pxToM(-12)),
  });
  ceilingBody.createFixture(planck.Box(pxToM(GAME_WIDTH / 2), pxToM(12)));
  ceilingBody.setUserData({ type: 'ceiling' });

  const birdQuery = ecs.query(ecsWorld, [BirdTag, Position, BodyRef]);
  const pipeQuery = ecs.query(ecsWorld, [PipeTag, Position, SpriteRef, BodyRef]);
  const renderQuery = ecs.query(ecsWorld, [Position, SpriteRef]);

  const pipePairs: PipePair[] = [];

  let spawnTimer = 0;
  let score = 0;
  let started = false;
  let gameOver = false;
  let flapFrame = 0;
  let flapTimer = 0;
  let bobTimer = 0;

  const setBirdPose = (idx: number): void => {
    birdSprite.texture = birdFrames[idx % birdFrames.length];
  };

  const resetGame = (): void => {
    for (const pair of pipePairs) {
      if (ecs.entityExists(ecsWorld, pair.topEid)) {
        destroyEntity(ecsWorld, physicsWorld, stores, pair.topEid);
      }
      if (ecs.entityExists(ecsWorld, pair.bottomEid)) {
        destroyEntity(ecsWorld, physicsWorld, stores, pair.bottomEid);
      }
    }
    pipePairs.length = 0;

    birdBody.setTransform(planck.Vec2(pxToM(BIRD_X), pxToM(BIRD_START_Y)), 0);
    birdBody.setLinearVelocity(planck.Vec2(0, 0));
    birdBody.setAngularVelocity(0);
    birdBody.setGravityScale(0);

    Position.x[birdEid] = BIRD_X;
    Position.y[birdEid] = BIRD_START_Y;
    birdSprite.rotation = 0;

    score = 0;
    scoreText.text = '0';
    spawnTimer = 0;
    started = false;
    gameOver = false;
    hintText.visible = true;
    gameOverSprite.visible = false;
    setBirdPose(1);
  };

  const flap = (): void => {
    if (gameOver) {
      resetGame();
      return;
    }
    if (!started) {
      started = true;
      birdBody.setGravityScale(1);
      hintText.visible = false;
    }
    birdBody.setLinearVelocity(planck.Vec2(0, -7.2));
  };

  physicsWorld.on('begin-contact', (contact: planck.Contact) => {
    const bodyA = contact.getFixtureA().getBody();
    const bodyB = contact.getFixtureB().getBody();
    const dataA = bodyA.getUserData() as { type?: string } | undefined;
    const dataB = bodyB.getUserData() as { type?: string } | undefined;

    const hitBird = dataA?.type === 'bird' || dataB?.type === 'bird';
    const hitPipeGroundOrCeiling =
      dataA?.type === 'pipe' ||
      dataB?.type === 'pipe' ||
      dataA?.type === 'ground' ||
      dataB?.type === 'ground' ||
      dataA?.type === 'ceiling' ||
      dataB?.type === 'ceiling';

    if (hitBird && hitPipeGroundOrCeiling && !gameOver) {
      gameOver = true;
      gameOverSprite.visible = true;
      hintText.text = 'Klik / Space untuk ulang';
      hintText.visible = true;
    }
  });

  app.canvas.addEventListener('pointerdown', flap);
  window.addEventListener('keydown', (event) => {
    if (event.code === 'Space' || event.code === 'ArrowUp') {
      event.preventDefault();
      flap();
    }
  });

  app.ticker.add(() => {
    const dt = Math.min(app.ticker.deltaMS / 1000, 1 / 30);

    if (!started && !gameOver) {
      bobTimer += dt;
      Position.y[birdEid] = BIRD_START_Y + Math.sin(bobTimer * 5) * 6;
      syncSpritesFromPosition({ renderQuery, stores });
      return;
    }

    if (!gameOver) {
      physicsWorld.step(dt);
      spawnTimer += dt;

      if (spawnTimer >= PIPE_SPAWN_INTERVAL) {
        spawnTimer -= PIPE_SPAWN_INTERVAL;
        spawnPipePair({
          ecsWorld,
          physicsWorld,
          stores,
          pipesLayer,
          sheet,
          pipePairs,
        });
      }

      const scoreDelta = moveAndCleanupPipes({
        dt,
        ecsWorld,
        physicsWorld,
        stores,
        pipeQuery,
        pipePairs,
      });
      if (scoreDelta > 0) {
        score += scoreDelta;
        scoreText.text = String(score);
      }

      syncBirdFromPhysics({ birdQuery, stores });

      flapTimer += dt;
      if (flapTimer >= 0.12) {
        flapTimer = 0;
        flapFrame = (flapFrame + 1) % birdFrames.length;
        setBirdPose(flapFrame);
      }

      const vy = birdBody.getLinearVelocity().y;
      birdSprite.rotation = Math.max(-0.6, Math.min(1.2, vy * 0.08));
    }

    if (!gameOver) {
      const scroll = PIPE_SPEED * dt;
      groundA.x -= scroll;
      groundB.x -= scroll;
      if (groundA.x + groundA.width <= 0) {
        groundA.x = groundB.x + groundB.width;
      }
      if (groundB.x + groundB.width <= 0) {
        groundB.x = groundA.x + groundA.width;
      }
    }

    syncSpritesFromPosition({ renderQuery, stores });
  });
})();
