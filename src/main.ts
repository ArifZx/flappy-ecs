import './style.css';

import { Application, Assets } from 'pixi.js';
import type { Spritesheet } from 'pixi.js';
import { GAME_HEIGHT, GAME_WIDTH } from './game/config/constants';
import { preloadSounds } from './game/audio/sound';
import { MAX_ENTITIES } from './game/ecs/components';
import { createShareImageCapture } from './game/app/create-share-image-capture';
import { createShareButton } from './game/app/create-share-button';
import {
  createPhysicsBackend,
  type PhysicsBackendName,
} from './game/app/create-physics-backend';
import { createGameRuntime } from './game/app/create-game-runtime';
import { createGameScene } from './game/app/create-scene';
import type { GamePhase } from './game/ecs/resources';

const PHYSICS_BACKEND: PhysicsBackendName = 'worker';

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

  const shareButton = createShareButton({
    parent: appRoot ?? document.body,
  });

  const atlasTexture = await Assets.load('sprites/game.png');
  Assets.add({
    alias: 'game-atlas',
    src: 'sprites/game.json',
    data: { texture: atlasTexture },
  });
  const sheet = await Assets.load<Spritesheet>('game-atlas');
  await preloadSounds();

  const lcpPoster = document.getElementById('lcp-poster');
  const lcpPosterImage = lcpPoster?.querySelector('img');
  const shareLogoSrc = lcpPosterImage?.currentSrc || lcpPosterImage?.getAttribute('src');
  if (lcpPoster) {
    lcpPoster.remove();
  }

  const scene = createGameScene(sheet);
  app.stage.addChild(scene.container);

  const { physics, backend } = await createPhysicsBackend({
    preferredBackend: PHYSICS_BACKEND,
    capacity: MAX_ENTITIES,
    gravity: { x: 0, y: 24 },
  });
  console.log(`Using physics backend: ${backend}`);

  const runtime = createGameRuntime({
    physics,
    scene,
    sheet,
  });
  const captureShareImage = createShareImageCapture({
    app,
    scene,
    runtime,
    shareUrl: window.location.href,
    logoSrc: shareLogoSrc,
  });
  let lastPhase: GamePhase | null = null;

  app.canvas.addEventListener('pointerdown', runtime.flap);
  window.addEventListener('keydown', (event) => {
    if (event.code === 'Space' || event.code === 'ArrowUp') {
      event.preventDefault();
      runtime.flap();
    }
  });

  app.ticker.add(() => {
    const dt = Math.min(app.ticker.deltaMS / 1000, 1 / 30);
    runtime.update(dt);

    const phase = runtime.getPhase();
    if (phase !== lastPhase) {
      shareButton.setVisible(phase === 'game-over');
      if (phase !== 'game-over') {
        shareButton.setScreenshotSrc(null);
      }
      lastPhase = phase;
    }

    if (runtime.consumeScreenshotRequest()) {
      void captureShareImage().then((imageSrc) => {
        shareButton.setScreenshotSrc(imageSrc);
      });
    }
  });
})();
