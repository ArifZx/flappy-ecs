import 'dotenv/config';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import type {
  BirdVariant,
  ClientToServerEvents,
  LeaderboardEntry,
  NearbyPlayersSnapshot,
  PlayerId,
  PlayerSnapshot,
  PongPayload,
  RoomId,
  RoomLobbyState,
  RoomSummary,
  ServerToClientEvents,
} from '@flappy/shared';

const port = Number.parseInt(process.env.PORT ?? '3001', 10);
const FFA_ROOM_ID = 'ffa-main';
const FFA_IDLE_TIMEOUT_MS = 30_000;
const FFA_DURATION_SECONDS = 90;
const MAX_VISIBLE_PLAYERS = 20;
const FFA_DEFAULT_BIRD_X = 78;
const FFA_DEFAULT_BIRD_Y = 220;
const MULTIPLAYER_DEBUG = process.env.MULTIPLAYER_DEBUG !== '0';

type SessionAssignment = {
  mode: 'free-for-all' | 'friends';
  roomId: RoomId;
};

type ConnectedPlayer = {
  playerId: PlayerId;
  displayName: string;
  variant: BirdVariant;
  joinedAt: number;
  score: number;
  progress: number;
  x: number;
  y: number;
  rotation: number;
  updatedAt: number;
  alive: boolean;
  finished: boolean;
  finishedAt?: number;
};

type FriendsRoomRecord = {
  roomId: RoomId;
  hostPlayerId: PlayerId;
  players: Map<PlayerId, ConnectedPlayer>;
  summary: RoomSummary;
  countdownTimer: ReturnType<typeof setTimeout> | null;
};

type FfaRoomRecord = {
  summary: RoomSummary;
  players: Map<PlayerId, ConnectedPlayer>;
  idleTimer: ReturnType<typeof setTimeout> | null;
};

const httpServer = createServer((_request, response) => {
  response.writeHead(200, { 'content-type': 'application/json' });
  response.end(JSON.stringify({
    service: 'flappy-server',
    status: 'ok',
    message: 'Multiplayer scaffold is ready for incremental implementation.',
  }));
});

const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: {
    origin: '*',
  },
});

const friendsRooms = new Map<RoomId, FriendsRoomRecord>();

const randomSeed = (): number => Math.floor(Math.random() * 0x7fffffff);

const createRoomCode = (): RoomId => Math.random().toString(36).slice(2, 8).toUpperCase();

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
  idleTimer: null,
});

let ffaRoom = createEmptyFfaRoom();

const debugLog = (message: string, details?: Record<string, unknown>): void => {
  if (!MULTIPLAYER_DEBUG) {
    return;
  }

  if (details) {
    console.log(`[multiplayer] ${message}`, details);
    return;
  }

  console.log(`[multiplayer] ${message}`);
};

const emitServerError = (playerId: PlayerId, message: string): void => {
  io.to(playerId).emit('server:error', { message });
};

const toLeaderboardEntry = (player: ConnectedPlayer): LeaderboardEntry => ({
  playerId: player.playerId,
  displayName: player.displayName,
  score: player.score,
  progress: player.progress,
  alive: player.alive,
  finishedAt: player.finishedAt,
});

const toPlayerSnapshot = (player: ConnectedPlayer): PlayerSnapshot => ({
  playerId: player.playerId,
  displayName: player.displayName,
  variant: player.variant,
  x: player.x,
  y: player.y,
  rotation: player.rotation,
  progress: player.progress,
  score: player.score,
  alive: player.alive,
  finished: player.finished,
  updatedAt: player.updatedAt,
});

const buildFfaLeaderboard = (): LeaderboardEntry[] =>
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

const emitFfaState = (): void => {
  const leaderboard = buildFfaLeaderboard();
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

const clearFfaIdleTimer = (): void => {
  if (ffaRoom.idleTimer === null) {
    return;
  }

  clearTimeout(ffaRoom.idleTimer);
  ffaRoom.idleTimer = null;
};

const scheduleFfaIdleShutdown = (): void => {
  clearFfaIdleTimer();
  if (ffaRoom.players.size > 0) {
    return;
  }

  ffaRoom.idleTimer = setTimeout(() => {
    if (ffaRoom.players.size > 0) {
      ffaRoom.idleTimer = null;
      return;
    }

    ffaRoom = createEmptyFfaRoom();
  }, FFA_IDLE_TIMEOUT_MS);
};

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

const disposeRoomIfEmpty = (roomId: RoomId): void => {
  const room = friendsRooms.get(roomId);
  if (!room || room.players.size > 0) {
    return;
  }

  if (room.countdownTimer !== null) {
    clearTimeout(room.countdownTimer);
  }

  friendsRooms.delete(roomId);
};

const assignSocketSession = (playerId: PlayerId, assignment: SessionAssignment | null): void => {
  const socket = io.sockets.sockets.get(playerId);
  if (!socket) {
    return;
  }

  socket.data.assignment = assignment;
};

const getSocketSession = (playerId: PlayerId): SessionAssignment | null => {
  const socket = io.sockets.sockets.get(playerId);
  const assignment = socket?.data.assignment;
  return assignment ? (assignment as SessionAssignment) : null;
};

io.on('connection', (socket) => {
  const playerId = socket.id;

  debugLog('socket connected', {
    playerId,
    transport: socket.conn.transport.name,
  });

  socket.on('system:ping', ({ sentAt, label }) => {
    const payload: PongPayload = {
      sentAt,
      serverTime: Date.now(),
      label,
    };
    socket.emit('system:pong', payload);
  });

  socket.on('ffa:join', ({ displayName }) => {
    clearFfaIdleTimer();

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
    socket.join(FFA_ROOM_ID);
    assignSocketSession(playerId, { mode: 'free-for-all', roomId: FFA_ROOM_ID });
    debugLog('player joined ffa', {
      playerId,
      displayName: player.displayName,
      roomId: FFA_ROOM_ID,
      connectedCount: ffaRoom.players.size,
    });
    emitFfaState();
  });

  socket.on('room:create', ({ displayName, durationSeconds }) => {
    let roomId = createRoomCode();
    while (friendsRooms.has(roomId)) {
      roomId = createRoomCode();
    }

    const player: ConnectedPlayer = {
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
    };

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
      countdownTimer: null,
    };

    friendsRooms.set(roomId, room);
    socket.join(roomId);
    assignSocketSession(playerId, { mode: 'friends', roomId });

    debugLog('friends room created', {
      playerId,
      displayName: player.displayName,
      roomId,
      durationSeconds,
    });

    socket.emit('room:created', room.summary);
    emitLobbyState(room);
  });

  socket.on('room:join', ({ roomId, displayName }) => {
    const normalizedRoomId = roomId.trim().toUpperCase();
    const room = friendsRooms.get(normalizedRoomId);
    if (!room) {
      emitServerError(playerId, `Room ${normalizedRoomId} was not found.`);
      return;
    }

    if (room.summary.status !== 'waiting') {
      emitServerError(playerId, `Room ${normalizedRoomId} is already in progress.`);
      return;
    }

    const player: ConnectedPlayer = {
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
    };

    room.players.set(playerId, player);
    room.summary.connectedCount = room.players.size;

    socket.join(normalizedRoomId);
    assignSocketSession(playerId, { mode: 'friends', roomId: normalizedRoomId });

    debugLog('player joined friends room', {
      playerId,
      displayName: player.displayName,
      roomId: normalizedRoomId,
      connectedCount: room.players.size,
    });

    socket.emit('room:joined', room.summary);
    emitLobbyState(room);
  });

  socket.on('room:start', ({ roomId }) => {
    const normalizedRoomId = roomId.trim().toUpperCase();
    const room = friendsRooms.get(normalizedRoomId);
    if (!room) {
      emitServerError(playerId, `Room ${normalizedRoomId} was not found.`);
      return;
    }

    if (room.hostPlayerId !== playerId) {
      emitServerError(playerId, 'Only the host can start this room.');
      return;
    }

    if (room.summary.status !== 'waiting') {
      emitServerError(playerId, 'This room has already started.');
      return;
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
      emitLobbyState(liveRoom);
    }, room.summary.config.countdownSeconds * 1000);
  });

  socket.on('player:update', ({ roomId, snapshot }) => {
    if (roomId !== FFA_ROOM_ID) {
      emitServerError(playerId, 'Player snapshot handling for friends mode is not implemented yet.');
      return;
    }

    const player = ffaRoom.players.get(playerId);
    if (!player) {
      emitServerError(playerId, 'Join the FFA room before sending player updates.');
      return;
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

    emitFfaState();
  });

  socket.on('player:finish', ({ roomId, progress, score }) => {
    if (roomId !== FFA_ROOM_ID) {
      emitServerError(playerId, 'Finish handling for friends mode is not implemented yet.');
      return;
    }

    const player = ffaRoom.players.get(playerId);
    if (!player) {
      emitServerError(playerId, 'Join the FFA room before finishing a run.');
      return;
    }

    player.progress = Math.max(player.progress, progress);
    player.score = Math.max(player.score, score);
    player.updatedAt = Date.now();
    player.alive = false;
    player.finished = true;
    player.finishedAt = Date.now();

    emitFfaState();
  });

  socket.on('disconnect', () => {
    const assignment = getSocketSession(playerId);
    debugLog('socket disconnected', {
      playerId,
      mode: assignment?.mode ?? null,
      roomId: assignment?.roomId ?? null,
    });
    if (!assignment) {
      return;
    }

    if (assignment.mode === 'free-for-all') {
      ffaRoom.players.delete(playerId);
      debugLog('player left ffa', {
        playerId,
        roomId: FFA_ROOM_ID,
        connectedCount: ffaRoom.players.size,
      });
      emitFfaState();
      scheduleFfaIdleShutdown();
      return;
    }

    const room = friendsRooms.get(assignment.roomId);
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
    debugLog('player left friends room', {
      playerId,
      roomId: room.roomId,
      connectedCount: room.players.size,
      nextHostPlayerId: room.hostPlayerId,
    });
    disposeRoomIfEmpty(room.roomId);
  });
});

httpServer.listen(port, () => {
  console.log(`@flappy/server listening on http://localhost:${port}`);
});
