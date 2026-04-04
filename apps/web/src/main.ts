import './style.css';

import type {
  GameMode,
  LeaderboardUpdate,
  NearbyPlayersSnapshot,
  RoomSummary,
} from '@flappy/shared';
import { Application, Assets } from 'pixi.js';
import type { Spritesheet } from 'pixi.js';
import { GAME_HEIGHT, GAME_WIDTH } from './game/config/constants';
import { preloadSounds } from './game/audio/sound';
import { MAX_ENTITIES } from './game/ecs/components';
import { createGameOverActions } from './game/app/create-game-over-actions';
import { createFfaPresence } from './game/app/create-ffa-presence';
import { createMainMenu } from './game/app/create-main-menu';
import { createMultiplayerClient } from './game/app/create-multiplayer-client';
import { createSessionPanel } from './game/app/create-session-panel';
import { createShareImageCapture } from './game/app/create-share-image-capture';
import {
  createPhysicsBackend,
  type PhysicsBackendName,
} from './game/app/create-physics-backend';
import { createGameRuntime } from './game/app/create-game-runtime';
import { createGameScene } from './game/app/create-scene';
import { GamePhase } from './game/ecs/resources';

const PHYSICS_BACKEND: PhysicsBackendName = 'worker';
const FFA_ROOM_ID = 'ffa-main';
const FFA_SNAPSHOT_INTERVAL_MS = 50;

(async () => {
  const app = new Application();
  await app.init({
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    backgroundColor: 'black',
    antialias: true,
  });

  const appRoot = document.getElementById('app');
  const rootHost = appRoot ?? document.body;
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
  const ffaPresence = createFfaPresence({
    layer: scene.remoteBirdLayer,
    sheet,
  });
  const sessionPanel = createSessionPanel(rootHost);
  const gameOverActions = createGameOverActions({
    parent: rootHost,
    onRestart: runtime.restart,
  });
  let activeMode: GameMode = 'offline';
  let gameplayEnabled = false;
  let latestFfaState: RoomSummary | null = null;
  let latestLeaderboard: LeaderboardUpdate | null = null;
  let currentDisplayName = 'Player';
  let snapshotAccumulatorMs = 0;
  let finishReported = false;

  const multiplayer = createMultiplayerClient({
    onFfaState: (summary) => {
      latestFfaState = summary;
      if (activeMode === 'free-for-all') {
        sessionPanel.showFfa(summary, latestLeaderboard);
        if (mainMenu.isOpen()) {
          gameplayEnabled = true;
          snapshotAccumulatorMs = 0;
          finishReported = false;
          runtime.restart();
          mainMenu.close();
        }
      }
    },
    onFriendsSummary: (summary) => {
      if (activeMode !== 'friends') {
        return;
      }

      if (summary.status === 'running') {
        gameplayEnabled = true;
        runtime.restart();
        sessionPanel.showFriendsRunning(summary);
      }
    },
    onLobbyState: (state) => {
      if (activeMode === 'friends') {
        gameplayEnabled = false;
        sessionPanel.showFriendsLobby(state);
        mainMenu.close();
      }
    },
    onNearbyPlayers: (payload: NearbyPlayersSnapshot) => {
      if (activeMode === 'free-for-all') {
        ffaPresence.sync(payload);
      }
    },
    onCountdown: (payload) => {
      if (activeMode === 'friends') {
        sessionPanel.showCountdown(payload);
      }
    },
    onLeaderboard: (payload) => {
      latestLeaderboard = payload;
      if (activeMode === 'free-for-all' && latestFfaState) {
        sessionPanel.showFfa(latestFfaState, payload);
      }
    },
    onError: ({ message }) => {
      mainMenu.setStatus(message);
    },
  });

  sessionPanel.setStartHandler((roomId) => {
    multiplayer.startFriendsRoom(roomId);
  });

  const resetToMenu = (): void => {
    gameplayEnabled = false;
    snapshotAccumulatorMs = 0;
    finishReported = false;
    runtime.restart();
    gameOverActions.setVisible(false);
    gameOverActions.setScreenshotSrc(null);
    ffaPresence.clear();
    sessionPanel.hide();
  };

  const mainMenu = createMainMenu({
    parent: app.stage,
    onOpen: resetToMenu,
    onStart: async ({ mode, displayName, roomId, durationSeconds }) => {
      activeMode = mode;
      currentDisplayName = displayName.trim() || 'Player';
      latestFfaState = null;
      latestLeaderboard = null;
      ffaPresence.clear();

      if (mode === 'free-for-all') {
        gameplayEnabled = false;
        snapshotAccumulatorMs = 0;
        finishReported = false;
        mainMenu.setStatus('Checking server RTT...');
        const rtt = await multiplayer.measureRtt('ffa-connect');
        mainMenu.setStatus(
          rtt === null
            ? 'Connecting to FFA room... RTT check timed out.'
            : `Connecting to FFA room... RTT ${rtt} ms`,
        );
        multiplayer.joinFfa({ displayName });
        return;
      }

      if (mode === 'friends') {
        gameplayEnabled = false;
        snapshotAccumulatorMs = 0;
        finishReported = false;
        mainMenu.setStatus('Checking server RTT...');
        const rtt = await multiplayer.measureRtt(roomId ? 'friends-join' : 'friends-create');
        mainMenu.setStatus(
          roomId
            ? rtt === null
              ? `Joining room ${roomId}... RTT check timed out.`
              : `Joining room ${roomId}... RTT ${rtt} ms`
            : rtt === null
              ? 'Creating friends room... RTT check timed out.'
              : `Creating friends room... RTT ${rtt} ms`,
        );
        if (roomId) {
          multiplayer.joinFriendsRoom({ roomId, displayName });
        } else {
          multiplayer.createFriendsRoom({ displayName, durationSeconds });
        }
        return;
      }

      mainMenu.setStatus(null);
      gameplayEnabled = true;
      snapshotAccumulatorMs = 0;
      finishReported = false;
      runtime.restart();
      gameOverActions.setVisible(false);
      gameOverActions.setScreenshotSrc(null);
      sessionPanel.showOffline();
      mainMenu.close();
    },
  });

  const captureShareImage = createShareImageCapture({
    app,
    scene,
    runtime,
    shareUrl: window.location.href,
    logoSrc: shareLogoSrc,
  });
  let lastPhase: GamePhase | null = null;

  app.canvas.addEventListener('pointerdown', () => {
    if (!gameplayEnabled || mainMenu.isOpen()) {
      return;
    }
    runtime.flap();
  });

  window.addEventListener('keydown', (event) => {
    if (event.code === 'Space' || event.code === 'ArrowUp') {
      if (!gameplayEnabled || mainMenu.isOpen()) {
        return;
      }
      event.preventDefault();
      runtime.flap();
      return;
    }

    if (event.code === 'Escape') {
      event.preventDefault();
      mainMenu.open();
    }
  });

  app.ticker.add(() => {
    const dt = Math.min(app.ticker.deltaMS / 1000, 1 / 30);
    runtime.update(dt);
    ffaPresence.update(dt, runtime.getSnapshotState().worldOffset);

    if (mainMenu.isOpen()) {
      scene.pointsText.visible = false;
      scene.hintText.visible = false;
      scene.gameOverSprite.visible = false;
    }

    const phase = runtime.getPhase();
    if (phase !== lastPhase) {
      gameOverActions.setVisible(phase === GamePhase.GameOver && !mainMenu.isOpen());
      if (phase !== GamePhase.GameOver) {
        gameOverActions.setScreenshotSrc(null);
      }
      lastPhase = phase;
    }

    if (activeMode === 'free-for-all' && gameplayEnabled && !mainMenu.isOpen()) {
      snapshotAccumulatorMs += app.ticker.deltaMS;

      if (snapshotAccumulatorMs >= FFA_SNAPSHOT_INTERVAL_MS) {
        snapshotAccumulatorMs %= FFA_SNAPSHOT_INTERVAL_MS;
        const snapshotState = runtime.getSnapshotState();
        multiplayer.sendPlayerUpdate({
          roomId: FFA_ROOM_ID,
          snapshot: {
            playerId: '',
            displayName: currentDisplayName,
            variant: 'yellow',
            x: snapshotState.worldX,
            y: snapshotState.screenY,
            rotation: snapshotState.rotation,
            progress: snapshotState.progress,
            score: snapshotState.score,
            alive: snapshotState.alive,
            finished: snapshotState.finished,
            updatedAt: Date.now(),
          },
        });
      }

      if (phase === GamePhase.GameOver && !finishReported) {
        const snapshotState = runtime.getSnapshotState();
        finishReported = true;
        multiplayer.finishRun({
          roomId: FFA_ROOM_ID,
          progress: snapshotState.progress,
          score: snapshotState.score,
        });
      }

      if (phase !== GamePhase.GameOver) {
        finishReported = false;
      }
    }

    if (runtime.consumeScreenshotRequest() && activeMode === 'offline' && !mainMenu.isOpen()) {
      void captureShareImage().then((imageSrc) => {
        gameOverActions.setScreenshotSrc(imageSrc);
      });
    }
  });
})();
