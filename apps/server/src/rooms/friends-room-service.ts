import type {
  ClientToServerEvents,
  LeaderboardEntry,
  NearbyPlayersSnapshot,
  PlayerId,
  PlayerSnapshot,
  RoomLobbyState,
  ScoreTrigger,
  ServerToClientEvents,
} from '@flappy/shared';
import type { Server } from 'socket.io';

import {
  createRoomCode,
  FFA_DEFAULT_BIRD_X,
  FFA_DEFAULT_BIRD_Y,
  MAX_VISIBLE_PLAYERS,
  randomSeed,
} from '../server/config.js';
import { createScoreValidationState } from '../server/score-validation.js';
import { toLeaderboardEntry, toPlayerSnapshot, withMonitorTimes } from '../server/shared.js';
import type {
  AssignSocketSession,
  ConnectedPlayer,
  DebugLog,
  FriendsRoomRecord,
  MonitorRoomDetail,
} from '../server/types.js';

type CreateFriendsRoomServiceParams = {
  io: Server<ClientToServerEvents, ServerToClientEvents>;
  debugLog: DebugLog;
  assignSocketSession: AssignSocketSession;
};

export type FriendsRoomService = {
  createRoom: (playerId: PlayerId, displayName: string, durationSeconds: number) => void;
  joinRoom: (playerId: PlayerId, roomId: string, displayName: string) => string | null;
  updateRoomConfig: (playerId: PlayerId, roomId: string, durationSeconds: number) => string | null;
  startRoom: (playerId: PlayerId, roomId: string) => string | null;
  kickPlayer: (playerId: PlayerId, roomId: string, targetPlayerId: PlayerId) => string | null;
  handlePlayerUpdate: (playerId: PlayerId, roomId: string, snapshot: PlayerSnapshot) => string | null;
  handlePlayerFinish: (
    playerId: PlayerId,
    roomId: string,
    progress: number,
    score: number,
    scoreTrigger?: ScoreTrigger,
  ) => string | null;
  handleDisconnect: (playerId: PlayerId, roomId: string) => void;
  buildMonitorDetails: (now: number) => MonitorRoomDetail[];
};

const FRIENDS_NEARBY_PLAYERS_INTERVAL_MS = 50;

export const createFriendsRoomService = ({
  io,
  debugLog,
  assignSocketSession,
}: CreateFriendsRoomServiceParams): FriendsRoomService => {
  const friendsRooms = new Map<string, FriendsRoomRecord>();

  const buildLobbyState = (room: FriendsRoomRecord, selfPlayerId: PlayerId): RoomLobbyState => ({
    room: {
      ...room.summary,
      connectedCount: room.players.size,
    },
    selfPlayerId,
    hostPlayerId: room.hostPlayerId,
    members: [...room.players.values()]
      .sort((left, right) => left.joinedAt - right.joinedAt)
      .map((player) => ({
        playerId: player.playerId,
        displayName: player.displayName,
        isHost: player.playerId === room.hostPlayerId,
      })),
    canStart: room.summary.status === 'waiting' && selfPlayerId === room.hostPlayerId && room.players.size > 0,
  });

  const emitLobbyState = (room: FriendsRoomRecord): void => {
    room.summary.connectedCount = room.players.size;
    for (const playerId of room.players.keys()) {
      io.to(playerId).emit('room:lobby', buildLobbyState(room, playerId));
    }
  };

  const buildNearbyPlayersSnapshot = (
    room: FriendsRoomRecord,
    selfPlayerId: PlayerId,
  ): NearbyPlayersSnapshot => ({
    selfPlayerId,
    players: [...room.players.values()]
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
      .slice(0, room.summary.config.maxVisiblePlayers)
      .map(toPlayerSnapshot),
  });

  const emitNearbyPlayers = (room: FriendsRoomRecord): void => {
    room.lastNearbyPlayersBroadcastAt = Date.now();
    for (const playerId of room.players.keys()) {
      io.to(playerId).emit('players:nearby', buildNearbyPlayersSnapshot(room, playerId));
    }
  };

  const clearNearbyPlayersTimer = (room: FriendsRoomRecord): void => {
    if (room.nearbyPlayersTimer === null) {
      return;
    }

    clearTimeout(room.nearbyPlayersTimer);
    room.nearbyPlayersTimer = null;
  };

  const emitNearbyPlayersThrottled = (room: FriendsRoomRecord): void => {
    const elapsedMs = Date.now() - room.lastNearbyPlayersBroadcastAt;
    if (elapsedMs >= FRIENDS_NEARBY_PLAYERS_INTERVAL_MS) {
      clearNearbyPlayersTimer(room);
      emitNearbyPlayers(room);
      return;
    }

    if (room.nearbyPlayersTimer !== null) {
      return;
    }

    room.nearbyPlayersTimer = setTimeout(() => {
      room.nearbyPlayersTimer = null;
      emitNearbyPlayers(room);
    }, FRIENDS_NEARBY_PLAYERS_INTERVAL_MS - elapsedMs);
  };

  const buildLeaderboard = (room: FriendsRoomRecord): LeaderboardEntry[] =>
    [...room.players.values()]
      .sort((left, right) => {
        if (right.score !== left.score) {
          return right.score - left.score;
        }
        if (right.progress !== left.progress) {
          return right.progress - left.progress;
        }
        return left.joinedAt - right.joinedAt;
      })
      .map(toLeaderboardEntry);

  const disposeRoomIfEmpty = (roomId: string): void => {
    const room = friendsRooms.get(roomId);
    if (!room || room.players.size > 0) {
      return;
    }

    if (room.countdownTimer !== null) {
      clearTimeout(room.countdownTimer);
    }

    if (room.finishTimer !== null) {
      clearTimeout(room.finishTimer);
    }

    clearNearbyPlayersTimer(room);

    friendsRooms.delete(roomId);
  };

  const createPlayer = (playerId: PlayerId, displayName: string): ConnectedPlayer => ({
    playerId,
    displayName: displayName.trim() || 'Player',
    variant: 'yellow',
    joinedAt: Date.now(),
    score: 0,
    progress: 0,
    x: FFA_DEFAULT_BIRD_X,
    y: FFA_DEFAULT_BIRD_Y,
    rotation: 0,
    updatedAt: Date.now(),
    alive: true,
    finished: false,
    scoreValidation: createScoreValidationState(0, (event) => {
      debugLog('friends score validation', {
        playerId,
        ...event,
      });
    }),
  });

  return {
    createRoom: (playerId, displayName, durationSeconds) => {
      let roomId = createRoomCode();
      while (friendsRooms.has(roomId)) {
        roomId = createRoomCode();
      }

      const player = createPlayer(playerId, displayName);
      const room: FriendsRoomRecord = {
        roomId,
        hostPlayerId: playerId,
        players: new Map([[playerId, player]]),
        summary: {
          roomId,
          status: 'waiting',
          config: {
            mode: 'friends',
            seed: randomSeed(),
            countdownSeconds: 5,
            durationSeconds,
            maxVisiblePlayers: MAX_VISIBLE_PLAYERS,
          },
          connectedCount: 1,
        },
        createdAt: Date.now(),
        countdownTimer: null,
        finishTimer: null,
        nearbyPlayersTimer: null,
        lastNearbyPlayersBroadcastAt: 0,
      };

      friendsRooms.set(roomId, room);
      player.scoreValidation.reset(room.summary.config.seed);
      io.sockets.sockets.get(playerId)?.join(roomId);
      assignSocketSession(playerId, { mode: 'friends', roomId });
      debugLog('friends room created', {
        playerId,
        displayName: player.displayName,
        roomId,
        durationSeconds,
      });
      io.to(playerId).emit('room:created', room.summary);
      emitLobbyState(room);
    },
    joinRoom: (playerId, roomId, displayName) => {
      const normalizedRoomId = roomId.trim().toUpperCase();
      const room = friendsRooms.get(normalizedRoomId);
      if (!room) {
        return `Room ${normalizedRoomId} was not found.`;
      }

      if (room.summary.status !== 'waiting') {
        return `Room ${normalizedRoomId} is already in progress.`;
      }

      const player = createPlayer(playerId, displayName);
      player.scoreValidation.reset(room.summary.config.seed);
      room.players.set(playerId, player);
      room.summary.connectedCount = room.players.size;
      io.sockets.sockets.get(playerId)?.join(normalizedRoomId);
      assignSocketSession(playerId, { mode: 'friends', roomId: normalizedRoomId });
      debugLog('player joined friends room', {
        playerId,
        displayName: player.displayName,
        roomId: normalizedRoomId,
        connectedCount: room.players.size,
      });
      io.to(playerId).emit('room:joined', room.summary);
      emitLobbyState(room);
      return null;
    },
    updateRoomConfig: (playerId, roomId, durationSeconds) => {
      const normalizedRoomId = roomId.trim().toUpperCase();
      const room = friendsRooms.get(normalizedRoomId);
      if (!room) {
        return `Room ${normalizedRoomId} was not found.`;
      }

      if (room.hostPlayerId !== playerId) {
        return 'Only the host can update this room.';
      }

      if (room.summary.status !== 'waiting') {
        return 'Room settings can only be changed before the match starts.';
      }

      room.summary.config.durationSeconds = durationSeconds;
      debugLog('friends room updated', {
        playerId,
        roomId: normalizedRoomId,
        durationSeconds,
      });
      io.to(normalizedRoomId).emit('room:state', room.summary);
      emitLobbyState(room);
      return null;
    },
    startRoom: (playerId, roomId) => {
      const normalizedRoomId = roomId.trim().toUpperCase();
      const room = friendsRooms.get(normalizedRoomId);
      if (!room) {
        return `Room ${normalizedRoomId} was not found.`;
      }

      if (room.hostPlayerId !== playerId) {
        return 'Only the host can start this room.';
      }

      if (room.summary.status !== 'waiting') {
        return 'This room has already started.';
      }

      const startsAt = Date.now() + room.summary.config.countdownSeconds * 1000;
      room.summary.status = 'countdown';
      room.summary.startsAt = startsAt;
      room.summary.endsAt = startsAt + room.summary.config.durationSeconds * 1000;
      io.to(normalizedRoomId).emit('room:countdown', {
        roomId: normalizedRoomId,
        startsAt,
        countdownSeconds: room.summary.config.countdownSeconds,
      });
      debugLog('friends room countdown started', {
        playerId,
        roomId: normalizedRoomId,
        startsAt,
        durationSeconds: room.summary.config.durationSeconds,
      });
      emitLobbyState(room);

      room.countdownTimer = setTimeout(() => {
        const liveRoom = friendsRooms.get(normalizedRoomId);
        if (!liveRoom) {
          return;
        }

        liveRoom.countdownTimer = null;
        liveRoom.summary.status = 'running';
        io.to(normalizedRoomId).emit('room:state', liveRoom.summary);
        clearNearbyPlayersTimer(liveRoom);
        emitNearbyPlayers(liveRoom);
        emitLobbyState(liveRoom);

        liveRoom.finishTimer = setTimeout(() => {
          const finishedRoom = friendsRooms.get(normalizedRoomId);
          if (!finishedRoom) {
            return;
          }

          finishedRoom.finishTimer = null;
          finishedRoom.summary.status = 'finished';
          const leaderboard = buildLeaderboard(finishedRoom);
          io.to(normalizedRoomId).emit('room:state', finishedRoom.summary);
          io.to(normalizedRoomId).emit('room:finished', {
            roomId: normalizedRoomId,
            leaderboard,
          });
          emitLobbyState(finishedRoom);
        }, liveRoom.summary.config.durationSeconds * 1000);
      }, room.summary.config.countdownSeconds * 1000);

      return null;
    },
    kickPlayer: (playerId, roomId, targetPlayerId) => {
      const normalizedRoomId = roomId.trim().toUpperCase();
      const room = friendsRooms.get(normalizedRoomId);
      if (!room) {
        return `Room ${normalizedRoomId} was not found.`;
      }

      if (room.hostPlayerId !== playerId) {
        return 'Only the host can kick players from this room.';
      }

      if (room.summary.status !== 'waiting') {
        return 'Players can only be kicked before the match starts.';
      }

      if (targetPlayerId === playerId) {
        return 'The host cannot kick themselves.';
      }

      const targetPlayer = room.players.get(targetPlayerId);
      if (!targetPlayer) {
        return 'That player is no longer in the room.';
      }

      room.players.delete(targetPlayerId);
      io.sockets.sockets.get(targetPlayerId)?.leave(normalizedRoomId);
      assignSocketSession(targetPlayerId, null);
      io.to(targetPlayerId).emit('room:kicked', {
        roomId: normalizedRoomId,
        message: `You were removed from room ${normalizedRoomId} by the host.`,
      });

      emitLobbyState(room);
      clearNearbyPlayersTimer(room);
      emitNearbyPlayers(room);
      debugLog('player kicked from friends room', {
        playerId,
        roomId: normalizedRoomId,
        targetPlayerId,
        targetDisplayName: targetPlayer.displayName,
        connectedCount: room.players.size,
      });
      disposeRoomIfEmpty(normalizedRoomId);
      return null;
    },
    handlePlayerUpdate: (playerId, roomId, snapshot) => {
      const room = friendsRooms.get(roomId);
      if (!room) {
        return `Room ${roomId} was not found.`;
      }

      if (room.summary.status !== 'running') {
        return null;
      }

      const player = room.players.get(playerId);
      if (!player) {
        return `Join room ${roomId} before sending player updates.`;
      }

      player.displayName = snapshot.displayName.trim() || player.displayName;
      player.variant = snapshot.variant;
      player.x = snapshot.x;
      player.y = snapshot.y;
      player.rotation = snapshot.rotation;
      player.updatedAt = Date.now();
      const validatedScore = player.scoreValidation.validateScoreTrigger(snapshot.scoreTrigger);
      player.scoreValidation.notePosition(snapshot.x);
      player.score = validatedScore;
      player.progress = validatedScore;
      player.alive = player.finished ? false : snapshot.alive;
      player.finished = player.finished || snapshot.finished;
      if (snapshot.finished && player.finishedAt === undefined) {
        player.finishedAt = Date.now();
      }

      emitNearbyPlayersThrottled(room);
      return null;
    },
    handlePlayerFinish: (playerId, roomId, progress, score, scoreTrigger) => {
      const room = friendsRooms.get(roomId);
      if (!room) {
        return `Room ${roomId} was not found.`;
      }

      if (room.summary.status !== 'running') {
        return null;
      }

      const player = room.players.get(playerId);
      if (!player) {
        return `Join room ${roomId} before finishing a run.`;
      }

      const acceptedScore = player.scoreValidation.validateScoreTrigger(scoreTrigger);
      const reportedProgress = Math.max(0, Math.floor(progress));
      const reportedScore = Math.max(0, Math.floor(score));

      if (reportedProgress !== acceptedScore || reportedScore !== acceptedScore) {
        debugLog('friends finish score mismatch rejected', {
          playerId,
          roomId,
          acceptedScore,
          reportedProgress,
          reportedScore,
        });
      }

      player.score = acceptedScore;
      player.progress = acceptedScore;
      player.updatedAt = Date.now();
      player.alive = false;
      player.finished = true;
      player.finishedAt = Date.now();
      clearNearbyPlayersTimer(room);
      emitNearbyPlayers(room);
      return null;
    },
    handleDisconnect: (playerId, roomId) => {
      const room = friendsRooms.get(roomId);
      if (!room) {
        return;
      }

      room.players.delete(playerId);
      if (room.hostPlayerId === playerId) {
        const nextHost = room.players.values().next().value as ConnectedPlayer | undefined;
        if (nextHost) {
          room.hostPlayerId = nextHost.playerId;
        }
      }

      emitLobbyState(room);
      clearNearbyPlayersTimer(room);
      emitNearbyPlayers(room);
      debugLog('player left friends room', {
        playerId,
        roomId: room.roomId,
        connectedCount: room.players.size,
        nextHostPlayerId: room.hostPlayerId,
      });
      disposeRoomIfEmpty(room.roomId);
    },
    buildMonitorDetails: (now) =>
      [...friendsRooms.values()]
        .sort((left, right) => left.roomId.localeCompare(right.roomId))
        .map((room) => withMonitorTimes(now, {
          roomId: room.roomId,
          mode: room.summary.config.mode,
          status: room.summary.status,
          playerCount: room.players.size,
          hostPlayerId: room.hostPlayerId,
          createdAt: room.createdAt,
          durationSeconds: room.summary.config.durationSeconds,
          countdownSeconds: room.summary.config.countdownSeconds,
        })),
  };
};