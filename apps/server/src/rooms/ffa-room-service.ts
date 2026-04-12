import type {
  ClientToServerEvents,
  LeaderboardEntry,
  NearbyPlayersSnapshot,
  PlayerId,
  PlayerSnapshot,
  ServerToClientEvents,
} from '@flappy/shared';
import type { Server } from 'socket.io';

import {
  FFA_DEFAULT_BIRD_X,
  FFA_DEFAULT_BIRD_Y,
  FFA_DURATION_SECONDS,
  FFA_IDLE_TIMEOUT_MS,
  FFA_ROOM_ID,
  MAX_VISIBLE_PLAYERS,
  randomSeed,
} from '../server/config.js';
import { toLeaderboardEntry, toPlayerSnapshot, withMonitorTimes } from '../server/shared.js';
import type {
  AssignSocketSession,
  ConnectedPlayer,
  DebugLog,
  FfaRoomRecord,
  MonitorRoomDetail,
} from '../server/types.js';

type CreateFfaRoomServiceParams = {
  io: Server<ClientToServerEvents, ServerToClientEvents>;
  debugLog: DebugLog;
  assignSocketSession: AssignSocketSession;
};

export type FfaRoomService = {
  join: (playerId: PlayerId, displayName: string) => void;
  handlePlayerUpdate: (playerId: PlayerId, snapshot: PlayerSnapshot) => string | null;
  handlePlayerFinish: (playerId: PlayerId, progress: number, score: number) => string | null;
  handleDisconnect: (playerId: PlayerId) => void;
  buildMonitorDetails: (now: number) => MonitorRoomDetail[];
};

const createEmptyFfaRoom = (): FfaRoomRecord => ({
  summary: {
    roomId: FFA_ROOM_ID,
    status: 'running',
    config: {
      mode: 'free-for-all',
      seed: randomSeed(),
      countdownSeconds: 0,
      durationSeconds: FFA_DURATION_SECONDS,
      maxVisiblePlayers: MAX_VISIBLE_PLAYERS,
    },
    connectedCount: 0,
  },
  players: new Map(),
  createdAt: Date.now(),
  lastPlayerDisconnectedAt: null,
  idleShutdownAt: null,
  idleTimer: null,
});

export const createFfaRoomService = ({
  io,
  debugLog,
  assignSocketSession,
}: CreateFfaRoomServiceParams): FfaRoomService => {
  let ffaRoom = createEmptyFfaRoom();

  const buildLeaderboard = (): LeaderboardEntry[] =>
    [...ffaRoom.players.values()]
      .sort((left, right) => {
        if (right.score !== left.score) {
          return right.score - left.score;
        }
        if (right.progress !== left.progress) {
          return right.progress - left.progress;
        }
        return left.joinedAt - right.joinedAt;
      })
      .slice(0, 10)
      .map(toLeaderboardEntry);

  const buildNearbyPlayersSnapshot = (selfPlayerId: PlayerId): NearbyPlayersSnapshot => ({
    selfPlayerId,
    players: [...ffaRoom.players.values()]
      .filter((player) => player.playerId !== selfPlayerId)
      .sort((left, right) => {
        if (left.alive !== right.alive) {
          return Number(right.alive) - Number(left.alive);
        }
        if (right.progress !== left.progress) {
          return right.progress - left.progress;
        }
        if (right.updatedAt !== left.updatedAt) {
          return right.updatedAt - left.updatedAt;
        }
        return left.joinedAt - right.joinedAt;
      })
      .slice(0, ffaRoom.summary.config.maxVisiblePlayers)
      .map(toPlayerSnapshot),
  });

  const emitState = (): void => {
    const leaderboard = buildLeaderboard();
    ffaRoom.summary.connectedCount = ffaRoom.players.size;
    io.to(FFA_ROOM_ID).emit('ffa:state', { ...ffaRoom.summary });
    io.to(FFA_ROOM_ID).emit('leaderboard:update', {
      roomId: FFA_ROOM_ID,
      maxScore: leaderboard[0]?.score ?? 0,
      leaderboard,
    });

    for (const playerId of ffaRoom.players.keys()) {
      io.to(playerId).emit('players:nearby', buildNearbyPlayersSnapshot(playerId));
    }
  };

  const clearIdleTimer = (): void => {
    if (ffaRoom.idleTimer === null) {
      return;
    }

    clearTimeout(ffaRoom.idleTimer);
    ffaRoom.idleTimer = null;
    ffaRoom.idleShutdownAt = null;
  };

  const scheduleIdleShutdown = (): void => {
    clearIdleTimer();
    if (ffaRoom.players.size > 0) {
      ffaRoom.lastPlayerDisconnectedAt = null;
      return;
    }

    ffaRoom.lastPlayerDisconnectedAt = Date.now();
    ffaRoom.idleShutdownAt = ffaRoom.lastPlayerDisconnectedAt + FFA_IDLE_TIMEOUT_MS;
    ffaRoom.idleTimer = setTimeout(() => {
      if (ffaRoom.players.size > 0) {
        ffaRoom.idleTimer = null;
        ffaRoom.idleShutdownAt = null;
        ffaRoom.lastPlayerDisconnectedAt = null;
        return;
      }

      ffaRoom = createEmptyFfaRoom();
    }, FFA_IDLE_TIMEOUT_MS);
  };

  return {
    join: (playerId, displayName) => {
      clearIdleTimer();
      ffaRoom.lastPlayerDisconnectedAt = null;

      const existing = ffaRoom.players.get(playerId);
      const player: ConnectedPlayer = {
        playerId,
        displayName: displayName.trim() || existing?.displayName || 'Player',
        variant: existing?.variant ?? 'yellow',
        joinedAt: existing?.joinedAt ?? Date.now(),
        score: existing?.score ?? 0,
        progress: existing?.progress ?? 0,
        x: existing?.x ?? FFA_DEFAULT_BIRD_X,
        y: existing?.y ?? FFA_DEFAULT_BIRD_Y,
        rotation: existing?.rotation ?? 0,
        updatedAt: existing?.updatedAt ?? Date.now(),
        alive: existing?.alive ?? true,
        finished: existing?.finished ?? false,
        finishedAt: existing?.finishedAt,
      };

      ffaRoom.players.set(playerId, player);
      io.sockets.sockets.get(playerId)?.join(FFA_ROOM_ID);
      assignSocketSession(playerId, { mode: 'free-for-all', roomId: FFA_ROOM_ID });
      debugLog('player joined ffa', {
        playerId,
        displayName: player.displayName,
        roomId: FFA_ROOM_ID,
        connectedCount: ffaRoom.players.size,
      });
      emitState();
    },
    handlePlayerUpdate: (playerId, snapshot) => {
      const player = ffaRoom.players.get(playerId);
      if (!player) {
        return 'Join the FFA room before sending player updates.';
      }

      player.displayName = snapshot.displayName.trim() || player.displayName;
      player.variant = snapshot.variant;
      player.x = snapshot.x;
      player.y = snapshot.y;
      player.rotation = snapshot.rotation;
      player.updatedAt = Date.now();
      player.score = Math.max(player.score, Math.max(0, snapshot.score));
      player.progress = Math.max(player.progress, Math.max(0, snapshot.progress));
      player.alive = player.finished ? false : snapshot.alive;
      player.finished = player.finished || snapshot.finished;
      if (snapshot.finished && player.finishedAt === undefined) {
        player.finishedAt = Date.now();
      }

      emitState();
      return null;
    },
    handlePlayerFinish: (playerId, progress, score) => {
      const player = ffaRoom.players.get(playerId);
      if (!player) {
        return 'Join the FFA room before finishing a run.';
      }

      player.progress = Math.max(player.progress, progress);
      player.score = Math.max(player.score, score);
      player.updatedAt = Date.now();
      player.alive = false;
      player.finished = true;
      player.finishedAt = Date.now();

      emitState();
      return null;
    },
    handleDisconnect: (playerId) => {
      ffaRoom.players.delete(playerId);
      debugLog('player left ffa', {
        playerId,
        roomId: FFA_ROOM_ID,
        connectedCount: ffaRoom.players.size,
      });
      emitState();
      scheduleIdleShutdown();
    },
    buildMonitorDetails: (now) => {
      const includeFfaRoom = ffaRoom.players.size > 0 || ffaRoom.idleTimer !== null;
      if (!includeFfaRoom) {
        return [];
      }

      return [withMonitorTimes(now, {
        roomId: ffaRoom.summary.roomId,
        mode: ffaRoom.summary.config.mode,
        status: ffaRoom.players.size > 0 ? ffaRoom.summary.status : 'idle',
        playerCount: ffaRoom.players.size,
        createdAt: ffaRoom.createdAt,
        lastPlayerDisconnectedAt: ffaRoom.lastPlayerDisconnectedAt,
        lastPlayerDisconnectedAtIso:
          ffaRoom.lastPlayerDisconnectedAt === null
            ? null
            : new Date(ffaRoom.lastPlayerDisconnectedAt).toISOString(),
        idleShutdownAt: ffaRoom.idleShutdownAt,
        idleShutdownAtIso:
          ffaRoom.idleShutdownAt === null ? null : new Date(ffaRoom.idleShutdownAt).toISOString(),
        secondsUntilShutdown:
          ffaRoom.idleShutdownAt === null ? null : Math.max(0, Math.ceil((ffaRoom.idleShutdownAt - now) / 1000)),
        durationSeconds: ffaRoom.summary.config.durationSeconds,
        countdownSeconds: ffaRoom.summary.config.countdownSeconds,
      })];
    },
  };
};