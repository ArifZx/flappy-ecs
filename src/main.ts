import './style.css';

import { Application, Assets, Container, Sprite, Text } from 'pixi.js';
import type { Spritesheet } from 'pixi.js';
import { createWorld, entityExists, query } from 'bitecs';
import { BoxShape, Vec2, World } from 'planck';
import type { Contact } from 'planck';
import {
  GAME_WIDTH,
  GAME_HEIGHT,
  GROUND_HEIGHT,
  GROUND_Y,
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
import { createGameRuntimeResource } from './game/ecs/resources';
import { destroyEntity } from './game/ecs/entity-lifecycle';
import { createBirdEntity } from './game/entities/bird';
import { spawnPipePair } from './game/entities/pipe';
import {
  createPipeMapProvider,
  type PipeMapEntry,
} from './game/systems/pipe-map';
import { moveAndCleanupPipes } from './game/systems/pipe-system';
import { getPipeSpeedByScore, isNightByScore } from './game/systems/difficulty';
import {
  syncBirdFromPhysics,
  syncSpritesFromPosition,
} from './game/systems/render-system';

(async () => {
  const app = new Application();
  await app.init({
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    backgroundColor: 'black',
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
  scene.addChild(background.container);

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
    text: 'Click or press Space to flap',
    style: {
      fontFamily: 'Arial',
      fontSize: 16,
      fill: 0xffffff,
      stroke: { color: 0x000000, width: 3 },
    },
  });
  hintText.anchor.set(0.5, 0.5);
  hintText.position.set(GAME_WIDTH / 2, GAME_HEIGHT * 0.2);
  scene.addChild(hintText);

  const gameOverSprite = new Sprite(sheet.textures.gameover);
  gameOverSprite.anchor.set(0.5);
  gameOverSprite.position.set(GAME_WIDTH / 2, GAME_HEIGHT * 0.32);
  gameOverSprite.visible = false;
  scene.addChild(gameOverSprite);

  const ecsWorld = createWorld();
  const physicsWorld = new World(new Vec2(0, 24));

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
    position: new Vec2(pxToM(GAME_WIDTH / 2), pxToM(GROUND_Y + GROUND_HEIGHT / 2)),
  });
  groundBody.createFixture(new BoxShape(pxToM(GAME_WIDTH / 2), pxToM(GROUND_HEIGHT / 2)));
  groundBody.setUserData({ type: 'ground' });

  const ceilingBody = physicsWorld.createBody({
    type: 'static',
    position: new Vec2(pxToM(GAME_WIDTH / 2), pxToM(-12)),
  });
  ceilingBody.createFixture(new BoxShape(pxToM(GAME_WIDTH / 2), pxToM(12)));
  ceilingBody.setUserData({ type: 'ceiling' });

  const birdQuery = query(ecsWorld, [BirdTag, Position, BodyRef]);
  const pipeQuery = query(ecsWorld, [PipeTag, Position, SpriteRef, BodyRef]);
  const renderQuery = query(ecsWorld, [Position, SpriteRef]);

  const pipePairs: PipePair[] = [];
  const pipeMap: PipeMapEntry[] = [];
  const pipeMapProvider = createPipeMapProvider({
    seed: 0x24f1a5c3,
    initialHeight: BIRD_START_Y,
  });

  const runtime = createGameRuntimeResource();

  const setBirdPose = (idx: number): void => {
    birdSprite.texture = birdFrames[idx % birdFrames.length];
  };

  const refillPipeMap = (): void => {
    if (pipeMap.length >= 10) return;
    const newEntries = pipeMapProvider.nextEntries(runtime.score, 12);
    pipeMap.push(...newEntries);
  };

  const getRightMostPipeX = (): number | null => {
    let maxX: number | null = null;
    for (let i = 0; i < pipePairs.length; i += 1) {
      const x = Position.x[pipePairs[i].topEid];
      if (maxX === null || x > maxX) maxX = x;
    }
    return maxX;
  };

  const spawnPipesByMap = (): void => {
    refillPipeMap();
    const spawnLeadX = GAME_WIDTH + 120;

    while (true) {
      const rightMostX = getRightMostPipeX();
      if (rightMostX !== null && rightMostX > spawnLeadX) break;

      const next = pipeMap.shift();
      if (!next) break;

      const spawnX = rightMostX === null ? GAME_WIDTH + 40 : rightMostX + next.x;

      spawnPipePair({
        ecsWorld,
        physicsWorld,
        stores,
        pipesLayer,
        sheet,
        pipePairs,
        x: spawnX,
        gap: next.gap,
        height: next.height,
      });
    }
  };

  const resetGame = (): void => {
    for (const pair of pipePairs) {
      if (entityExists(ecsWorld, pair.topEid)) {
        destroyEntity(ecsWorld, physicsWorld, stores, pair.topEid);
      }
      if (entityExists(ecsWorld, pair.bottomEid)) {
        destroyEntity(ecsWorld, physicsWorld, stores, pair.bottomEid);
      }
    }
    pipePairs.length = 0;
    pipeMap.length = 0;
    pipeMapProvider.reset();

    birdBody.setTransform(new Vec2(pxToM(BIRD_X), pxToM(BIRD_START_Y)), 0);
    birdBody.setLinearVelocity(new Vec2(0, 0));
    birdBody.setAngularVelocity(0);
    birdBody.setGravityScale(0);

    Position.x[birdEid] = BIRD_X;
    Position.y[birdEid] = BIRD_START_Y;
    birdSprite.rotation = 0;

    runtime.score = 0;
    scoreText.text = '0';
    runtime.started = false;
    runtime.gameOver = false;
    runtime.flapFrame = 0;
    runtime.flapTimer = 0;
    runtime.bobTimer = 0;
    hintText.visible = true;
    gameOverSprite.visible = false;
    background.reset();
    setBirdPose(1);
  };

  const flap = (): void => {
    if (runtime.gameOver) {
      resetGame();
      return;
    }
    if (!runtime.started) {
      runtime.started = true;
      birdBody.setGravityScale(1);
      hintText.visible = false;
    }
    birdBody.setLinearVelocity(new Vec2(0, -7.2));
  };

  physicsWorld.on('begin-contact', (contact: Contact) => {
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

    if (hitBird && hitPipeGroundOrCeiling && !runtime.gameOver) {
      runtime.gameOver = true;
      gameOverSprite.visible = true;
      hintText.text = 'Click or press Space to restart';
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

    const isNightBand = isNightByScore(runtime.score);
    background.setNightTarget(isNightBand);
    background.update(dt);

    if (!runtime.started && !runtime.gameOver) {
      runtime.bobTimer += dt;
      Position.y[birdEid] = BIRD_START_Y + Math.sin(runtime.bobTimer * 5) * 6;
      syncSpritesFromPosition({ renderQuery, stores });
      return;
    }

    if (!runtime.gameOver) {
      physicsWorld.step(dt);
      const currentSpeed = getPipeSpeedByScore(runtime.score);
      spawnPipesByMap();

      const scoreDelta = moveAndCleanupPipes({
        dt,
        speed: currentSpeed,
        ecsWorld,
        physicsWorld,
        stores,
        pipeQuery,
        pipePairs,
      });
      if (scoreDelta > 0) {
        runtime.score += scoreDelta;
        scoreText.text = String(runtime.score);
      }

      syncBirdFromPhysics({ birdQuery, stores });

      runtime.flapTimer += dt;
      if (runtime.flapTimer >= 0.12) {
        runtime.flapTimer = 0;
        runtime.flapFrame = (runtime.flapFrame + 1) % birdFrames.length;
        setBirdPose(runtime.flapFrame);
      }

      const vy = birdBody.getLinearVelocity().y;
      birdSprite.rotation = Math.max(-0.6, Math.min(1.2, vy * 0.08));
    }

    if (!runtime.gameOver) {
      const scroll = getPipeSpeedByScore(runtime.score) * dt;
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
