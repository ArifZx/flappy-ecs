import './style.css';

import type {
  GameMode,
  LeaderboardUpdate,
  NearbyPlayersSnapshot,
  RoomFinished,
  RoomKicked,
  RoomSummary,
} from '@flappy/shared';
import { Application, Assets, Container, Graphics } from 'pixi.js';
import type { Spritesheet, Texture } from 'pixi.js';
import { GAME_HEIGHT, GAME_WIDTH } from './game/config/constants';
import { DISPLAY_RESOLUTION } from './game/config/display';
import { ensureUiFontLoaded } from './game/config/font';
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
    backgroundColor: 'black',
    antialias: true,
    autoDensity: true,
    resolution: DISPLAY_RESOLUTION,
    resizeTo: window,
  });

  const appRoot = document.getElementById('app');
  const rootHost = appRoot ?? document.body;
  if (appRoot) {
    appRoot.appendChild(app.canvas);
  } else {
    document.body.appendChild(app.canvas);
  }

  const atlasTexture = await Assets.load('sprites/game.png');
  const diceTexture = await Assets.load<Texture>({
    src: '/dice.svg',
    data: { resolution: 2 },
  });
  Assets.add({
    alias: 'game-atlas',
    src: 'sprites/game.json',
    data: { texture: atlasTexture },
  });
  const sheet = await Assets.load<Spritesheet>('game-atlas');
  await ensureUiFontLoaded();
  await preloadSounds();

  const lcpPoster = document.getElementById('lcp-poster');
  const lcpPosterImage = lcpPoster?.querySelector('img');
  const shareLogoSrc = lcpPosterImage?.currentSrc || lcpPosterImage?.getAttribute('src');
  if (lcpPoster) {
    lcpPoster.remove();
  }

  const gameRoot = new Container();
  app.stage.addChild(gameRoot);

  const gameMask = new Graphics();
  gameRoot.addChild(gameMask);
  gameRoot.mask = gameMask;

  const fitGameToViewport = (): void => {
    const viewportWidth = app.screen.width;
    const viewportHeight = app.screen.height;
    const scale = Math.min(viewportWidth / GAME_WIDTH, viewportHeight / GAME_HEIGHT);

    gameRoot.scale.set(scale);
    gameRoot.position.set(
      Math.round((viewportWidth - GAME_WIDTH * scale) / 2),
      Math.round((viewportHeight - GAME_HEIGHT * scale) / 2),
    );

    gameMask.clear();
    gameMask.rect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    gameMask.fill(0xffffff);
  };

  const scene = createGameScene(sheet);
  gameRoot.addChild(scene.container);
  fitGameToViewport();
  window.addEventListener('resize', fitGameToViewport);

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
  const sessionPanel = createSessionPanel(gameRoot);
  const gameOverActions = createGameOverActions({
    parent: rootHost,
    onRestart: runtime.restart,
  });
  let mainMenu: ReturnType<typeof createMainMenu>;
  let activeMode: GameMode = 'offline';
  let gameplayEnabled = false;
  let latestFfaState: RoomSummary | null = null;
  let latestLeaderboard: LeaderboardUpdate | null = null;
  let currentDisplayName = 'Player';
  let activeFriendsRoomId: string | null = null;
  let activeFriendsEndsAt: number | null = null;
  let activeFriendsDurationSeconds = 0;
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

      activeFriendsRoomId = summary.roomId;

      if (summary.status === 'running') {
        activeFriendsEndsAt = summary.endsAt ?? null;
        activeFriendsDurationSeconds = summary.config.durationSeconds;
        gameplayEnabled = true;
        runtime.restart();
        sessionPanel.hide();
      }
    },
    onLobbyState: (state) => {
      if (activeMode === 'friends') {
        activeFriendsRoomId = state.room.roomId;
        mainMenu.close();

        if (state.room.status !== 'waiting') {
          return;
        }

        activeFriendsEndsAt = null;
        activeFriendsDurationSeconds = state.room.config.durationSeconds;
        gameplayEnabled = false;
        ffaPresence.clear();
        sessionPanel.showFriendsLobby(state);
      }
    },
    onNearbyPlayers: (payload: NearbyPlayersSnapshot) => {
      if (activeMode === 'free-for-all' || (activeMode === 'friends' && gameplayEnabled)) {
        ffaPresence.sync(payload);
      }
    },
    onCountdown: (payload) => {
      if (activeMode === 'friends') {
        activeFriendsRoomId = payload.roomId;
        activeFriendsEndsAt = payload.startsAt + payload.countdownSeconds * 1000;
        ffaPresence.clear();
        sessionPanel.showCountdown(payload);
      }
    },
    onRoomFinished: (payload: RoomFinished) => {
      if (activeMode !== 'friends') {
        return;
      }

      gameplayEnabled = false;
      activeFriendsEndsAt = null;
      gameOverActions.setVisible(false);
      gameOverActions.setScreenshotSrc(null);
      ffaPresence.clear();
      sessionPanel.showFriendsFinished(activeFriendsRoomId ?? payload.roomId, payload);
    },
    onRoomKicked: ({ message }: RoomKicked) => {
      gameplayEnabled = false;
      activeMode = 'offline';
      activeFriendsRoomId = null;
      activeFriendsEndsAt = null;
      activeFriendsDurationSeconds = 0;
      snapshotAccumulatorMs = 0;
      finishReported = false;
      ffaPresence.clear();
      sessionPanel.hide();
      gameOverActions.setVisible(false);
      gameOverActions.setScreenshotSrc(null);
      runtime.restart();
      mainMenu.open();
      mainMenu.setStatus(message);
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
    multiplayer.startFriendsRoom(activeFriendsRoomId ?? roomId);
  });

  sessionPanel.setDurationHandler((roomId, durationSeconds) => {
    multiplayer.updateFriendsRoomConfig({
      roomId: activeFriendsRoomId ?? roomId,
      durationSeconds,
    });
  });

  sessionPanel.setKickHandler((roomId, targetPlayerId) => {
    multiplayer.kickFriendsPlayer(activeFriendsRoomId ?? roomId, targetPlayerId);
  });

  const resetToMenu = (): void => {
    gameplayEnabled = false;
    activeFriendsRoomId = null;
    activeFriendsEndsAt = null;
    activeFriendsDurationSeconds = 0;
    snapshotAccumulatorMs = 0;
    finishReported = false;
    runtime.restart();
    gameOverActions.setVisible(false);
    gameOverActions.setScreenshotSrc(null);
    ffaPresence.clear();
    sessionPanel.hide();
  };

  mainMenu = createMainMenu({
    parent: gameRoot,
    diceTexture,
    onOpen: resetToMenu,
    onStart: async ({ mode, displayName, roomId, durationSeconds }) => {
      activeMode = mode;
      currentDisplayName = displayName.trim() || 'Player';
      latestFfaState = null;
      latestLeaderboard = null;
      activeFriendsRoomId = mode === 'friends' ? roomId || null : null;
      activeFriendsEndsAt = null;
      activeFriendsDurationSeconds = mode === 'friends' ? durationSeconds : 0;
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

    const showPartyHud = activeMode === 'friends' && gameplayEnabled && !mainMenu.isOpen();
    scene.partyHudText.visible = showPartyHud;
    scene.pointsText.visible = !showPartyHud;
    if (showPartyHud) {
      const remainingSeconds = activeFriendsEndsAt === null
        ? activeFriendsDurationSeconds
        : Math.max(0, Math.ceil((activeFriendsEndsAt - Date.now()) / 1000));
      scene.partyHudText.text = `PARTY\n${remainingSeconds}`;
    }

    if (mainMenu.isOpen()) {
      scene.pointsText.visible = false;
      scene.partyHudText.visible = false;
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

    if ((activeMode === 'free-for-all' || activeMode === 'friends') && gameplayEnabled && !mainMenu.isOpen()) {
      snapshotAccumulatorMs += app.ticker.deltaMS;

      if (snapshotAccumulatorMs >= FFA_SNAPSHOT_INTERVAL_MS) {
        snapshotAccumulatorMs %= FFA_SNAPSHOT_INTERVAL_MS;
        const snapshotState = runtime.getSnapshotState();
        const roomId = activeMode === 'free-for-all' ? FFA_ROOM_ID : activeFriendsRoomId;
        if (!roomId) {
          return;
        }

        multiplayer.sendPlayerUpdate({
          roomId,
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
        const roomId = activeMode === 'free-for-all' ? FFA_ROOM_ID : activeFriendsRoomId;
        if (!roomId) {
          return;
        }

        multiplayer.finishRun({
          roomId,
          progress: snapshotState.progress,
          score: snapshotState.score,
        });
      }

      if (phase !== GamePhase.GameOver) {
        finishReported = false;
      }
    }

    if (runtime.consumeScreenshotRequest() && !mainMenu.isOpen()) {
      void captureShareImage().then((imageSrc) => {
        gameOverActions.setScreenshotSrc(imageSrc);
      });
    }
  });
})();
