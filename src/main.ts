import './style.css';

import { Application, Assets, Container, Sprite, Text } from 'pixi.js';
import type { Spritesheet } from 'pixi.js';
import * as ecs from 'bitecs';
import * as planck from 'planck';

import {
  MAX_ENTITIES,
  Position,
  SpriteRef,
  BodyRef,
  BirdTag,
  BirdAppearance,
} from './ecs/components';

const GAME_WIDTH = 288;
const GAME_HEIGHT = 512;
const GROUND_HEIGHT = 112;
const GROUND_Y = GAME_HEIGHT - GROUND_HEIGHT;
const PIPE_SPEED = 90;
const PIPE_GAP = 130;
const PIPE_SPAWN_INTERVAL = 1.4;
const BIRD_X = 78;
const BIRD_START_Y = 220;
const PPM = 60;

const pxToM = (px: number): number => px / PPM;
const mToPx = (m: number): number => m * PPM;

const PipeTag = [] as number[];

type PipePair = {
  topEid: number;
  bottomEid: number;
  scored: boolean;
};

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

  const scene = new Container();
  app.stage.addChild(scene);

  const background = new Sprite(sheet.textures['background-day']);
  background.anchor.set(0.5);
  background.position.set(GAME_WIDTH / 2, GAME_HEIGHT / 2);
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

  const sprites: Array<Sprite | null> = new Array(MAX_ENTITIES).fill(null);
  const bodies: Array<planck.Body | null> = new Array(MAX_ENTITIES).fill(null);

  const birdFrames = [
    sheet.textures['yellowbird-upflap'],
    sheet.textures['yellowbird-midflap'],
    sheet.textures['yellowbird-downflap'],
  ];

  const birdEid = ecs.addEntity(ecsWorld);
  ecs.addComponent(ecsWorld, birdEid, Position);
  ecs.addComponent(ecsWorld, birdEid, SpriteRef);
  ecs.addComponent(ecsWorld, birdEid, BodyRef);
  ecs.addComponent(ecsWorld, birdEid, BirdTag);
  ecs.addComponent(ecsWorld, birdEid, BirdAppearance);
  BirdTag[birdEid] = 1;
  BirdAppearance.variant[birdEid] = 0;

  Position.x[birdEid] = BIRD_X;
  Position.y[birdEid] = BIRD_START_Y;

  const birdSprite = new Sprite(birdFrames[1]);
  birdSprite.anchor.set(0.5);
  birdLayer.addChild(birdSprite);
  SpriteRef.id[birdEid] = birdEid;
  sprites[birdEid] = birdSprite;

  const birdBody = physicsWorld.createDynamicBody({
    position: planck.Vec2(pxToM(BIRD_X), pxToM(BIRD_START_Y)),
    fixedRotation: true,
    linearDamping: 0,
  });
  birdBody.createFixture(planck.Circle(pxToM(11)), {
    density: 1,
    friction: 0,
    restitution: 0,
  });
  birdBody.setGravityScale(0);
  birdBody.setUserData({ type: 'bird', eid: birdEid });
  BodyRef.id[birdEid] = birdEid;
  bodies[birdEid] = birdBody;

  const groundBody = physicsWorld.createBody({
    type: 'static',
    position: planck.Vec2(pxToM(GAME_WIDTH / 2), pxToM(GROUND_Y + GROUND_HEIGHT / 2)),
  });
  groundBody.createFixture(planck.Box(pxToM(GAME_WIDTH / 2), pxToM(GROUND_HEIGHT / 2)));
  groundBody.setUserData({ type: 'ground' });

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

  const destroyEntity = (eid: number): void => {
    const spriteId = SpriteRef.id[eid];
    const bodyId = BodyRef.id[eid];
    const sprite = sprites[spriteId];
    const body = bodies[bodyId];

    if (sprite) {
      sprite.destroy();
      sprites[spriteId] = null;
    }
    if (body) {
      physicsWorld.destroyBody(body);
      bodies[bodyId] = null;
    }
    ecs.removeEntity(ecsWorld, eid);
  };

  const createPipeSegment = (x: number, y: number, flipY: boolean): number => {
    const eid = ecs.addEntity(ecsWorld);
    ecs.addComponent(ecsWorld, eid, Position);
    ecs.addComponent(ecsWorld, eid, SpriteRef);
    ecs.addComponent(ecsWorld, eid, BodyRef);
    ecs.addComponent(ecsWorld, eid, PipeTag);
    PipeTag[eid] = 1;

    Position.x[eid] = x;
    Position.y[eid] = y;

    const sprite = new Sprite(sheet.textures['pipe-green']);
    sprite.anchor.set(0.5);
    sprite.scale.y = flipY ? -1 : 1;
    pipesLayer.addChild(sprite);
    SpriteRef.id[eid] = eid;
    sprites[eid] = sprite;

    const body = physicsWorld.createBody({
      type: 'static',
      position: planck.Vec2(pxToM(x), pxToM(y)),
    });
    body.createFixture(planck.Box(pxToM(26), pxToM(160)));
    body.setUserData({ type: 'pipe', eid });
    BodyRef.id[eid] = eid;
    bodies[eid] = body;

    return eid;
  };

  const spawnPipePair = (): void => {
    const x = GAME_WIDTH + 40;
    const gapCenter = 120 + Math.random() * (GROUND_Y - 120 - 120);

    const topCenterY = gapCenter - PIPE_GAP / 2 - 160;
    const bottomCenterY = gapCenter + PIPE_GAP / 2 + 160;

    const topEid = createPipeSegment(x, topCenterY, true);
    const bottomEid = createPipeSegment(x, bottomCenterY, false);
    pipePairs.push({ topEid, bottomEid, scored: false });
  };

  const resetGame = (): void => {
    for (const pair of pipePairs) {
      if (ecs.entityExists(ecsWorld, pair.topEid)) {
        destroyEntity(pair.topEid);
      }
      if (ecs.entityExists(ecsWorld, pair.bottomEid)) {
        destroyEntity(pair.bottomEid);
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
    const hitPipeOrGround =
      dataA?.type === 'pipe' ||
      dataB?.type === 'pipe' ||
      dataA?.type === 'ground' ||
      dataB?.type === 'ground';

    if (hitBird && hitPipeOrGround && !gameOver) {
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

  const moveAndCleanupPipes = (dt: number): void => {
    const eids = pipeQuery;
    for (let i = 0; i < eids.length; i += 1) {
      const eid = eids[i];
      Position.x[eid] -= PIPE_SPEED * dt;

      const body = bodies[BodyRef.id[eid]];
      if (body) {
        body.setTransform(planck.Vec2(pxToM(Position.x[eid]), pxToM(Position.y[eid])), 0);
      }
    }

    for (let i = pipePairs.length - 1; i >= 0; i -= 1) {
      const pair = pipePairs[i];
      if (!ecs.entityExists(ecsWorld, pair.topEid)) {
        pipePairs.splice(i, 1);
        continue;
      }

      const pairX = Position.x[pair.topEid];
      if (!pair.scored && pairX < BIRD_X) {
        pair.scored = true;
        score += 1;
        scoreText.text = String(score);
      }

      if (pairX < -60) {
        if (ecs.entityExists(ecsWorld, pair.topEid)) destroyEntity(pair.topEid);
        if (ecs.entityExists(ecsWorld, pair.bottomEid)) destroyEntity(pair.bottomEid);
        pipePairs.splice(i, 1);
      }
    }
  };

  const syncBirdFromPhysics = (): void => {
    const eids = birdQuery;
    for (let i = 0; i < eids.length; i += 1) {
      const eid = eids[i];
      const body = bodies[BodyRef.id[eid]];
      if (!body) continue;
      const pos = body.getPosition();
      Position.x[eid] = mToPx(pos.x);
      Position.y[eid] = mToPx(pos.y);
    }
  };

  const syncSpritesFromPosition = (): void => {
    const eids = renderQuery;
    for (let i = 0; i < eids.length; i += 1) {
      const eid = eids[i];
      const sprite = sprites[SpriteRef.id[eid]];
      if (!sprite) continue;
      sprite.position.set(Position.x[eid], Position.y[eid]);
    }
  };

  app.ticker.add(() => {
    const dt = Math.min(app.ticker.deltaMS / 1000, 1 / 30);

    if (!started && !gameOver) {
      bobTimer += dt;
      Position.y[birdEid] = BIRD_START_Y + Math.sin(bobTimer * 5) * 6;
      syncSpritesFromPosition();
      return;
    }

    if (!gameOver) {
      physicsWorld.step(dt);
      spawnTimer += dt;

      if (spawnTimer >= PIPE_SPAWN_INTERVAL) {
        spawnTimer -= PIPE_SPAWN_INTERVAL;
        spawnPipePair();
      }

      moveAndCleanupPipes(dt);
      syncBirdFromPhysics();

      flapTimer += dt;
      if (flapTimer >= 0.12) {
        flapTimer = 0;
        flapFrame = (flapFrame + 1) % birdFrames.length;
        setBirdPose(flapFrame);
      }

      const vy = birdBody.getLinearVelocity().y;
      birdSprite.rotation = Math.max(-0.6, Math.min(1.2, vy * 0.08));
    }

    const scroll = PIPE_SPEED * dt;
    groundA.x -= scroll;
    groundB.x -= scroll;
    if (groundA.x + groundA.width <= 0) {
      groundA.x = groundB.x + groundB.width;
    }
    if (groundB.x + groundB.width <= 0) {
      groundB.x = groundA.x + groundA.width;
    }

    syncSpritesFromPosition();
  });
})();
