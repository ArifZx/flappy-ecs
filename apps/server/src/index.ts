import 'dotenv/config';
import { createServer } from 'node:http';
import type { ServerResponse } from 'node:http';
import { Server } from 'socket.io';
import type {
  ClientToServerEvents,
  PlayerId,
  PongPayload,
  ServerToClientEvents,
} from '@flappy/shared';

import { FFA_ROOM_ID, ALLOWED_ORIGINS } from './server/config.js';
import type {
  SessionAssignment,
} from './server/types.js';
import { createFfaRoomService, type FfaRoomService } from './rooms/ffa-room-service.js';
import { createFriendsRoomService, type FriendsRoomService } from './rooms/friends-room-service.js';

const port = Number.parseInt(process.env.PORT ?? '3001', 10);
const MULTIPLAYER_DEBUG = process.env.MULTIPLAYER_DEBUG !== '0';

const isAllowedOrigin = (origin: string | undefined): boolean => {
  console.log('Checking socket origin', { origin });
  if (!origin) {
    return true;
  }

  return ALLOWED_ORIGINS.includes(origin);
};

const applyCorsHeaders = (requestOrigin: string | undefined, response: ServerResponse): void => {
  response.setHeader('Vary', 'Origin');
  if (!requestOrigin || !isAllowedOrigin(requestOrigin)) {
    return;
  }

  response.setHeader('Access-Control-Allow-Origin', requestOrigin);
  response.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
};

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

let ffaRoomService: FfaRoomService;
let friendsRoomService: FriendsRoomService;
let io: Server<ClientToServerEvents, ServerToClientEvents>;

const buildMonitorSnapshot = () => {
  const now = Date.now();
  const ffaRoomDetails = ffaRoomService.buildMonitorDetails(now);
  const friendsRoomDetails = friendsRoomService.buildMonitorDetails(now);
  const totalFriendsPlayers = friendsRoomDetails.reduce((sum, room) => sum + room.playerCount, 0);
  const totalFfaPlayers = ffaRoomDetails.reduce((sum, room) => sum + room.playerCount, 0);

  return {
    service: 'flappy-server',
    status: 'ok',
    rooms: {
      total: ffaRoomDetails.length + friendsRoomDetails.length,
      freeForAll: ffaRoomDetails.length,
      friends: friendsRoomDetails.length,
    },
    players: {
      total: totalFfaPlayers + totalFriendsPlayers,
      freeForAll: totalFfaPlayers,
      friends: totalFriendsPlayers,
    },
    roomDetails: [
      ...ffaRoomDetails,
      ...friendsRoomDetails,
    ],
  };
};

const httpServer = createServer((request, response) => {
  const requestUrl = new URL(request.url ?? '/', `http://${request.headers.host ?? `localhost:${port}`}`);
  const requestOrigin = typeof request.headers.origin === 'string' ? request.headers.origin : undefined;

  applyCorsHeaders(requestOrigin, response);

  if (request.method === 'OPTIONS') {
    response.writeHead(204);
    response.end();
    return;
  }

  if (requestUrl.pathname === '/monitor') {
    response.writeHead(200, { 'content-type': 'application/json' });
    response.end(JSON.stringify(buildMonitorSnapshot(), null, 2));
    return;
  }

  response.writeHead(200, { 'content-type': 'application/json' });
  response.end(JSON.stringify({
    service: 'flappy-server',
    status: 'ok',
    message: 'Multiplayer scaffold is ready for incremental implementation.',
  }));
});

io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: {
    origin: (origin, callback) => {
      if (isAllowedOrigin(origin ?? undefined)) {
        callback(null, true);
        return;
      }

      callback(new Error(`Socket origin not allowed: ${origin ?? 'unknown'}`));
    },
  },
});

const assignSocketSession = (playerId: PlayerId, assignment: SessionAssignment | null): void => {
  const socket = io.sockets.sockets.get(playerId);
  if (!socket) {
    return;
  }

  socket.data.assignment = assignment;
};

const emitServerError = (playerId: PlayerId, message: string): void => {
  io.to(playerId).emit('server:error', { message });
};

ffaRoomService = createFfaRoomService({
  io,
  debugLog,
  assignSocketSession,
});

friendsRoomService = createFriendsRoomService({
  io,
  debugLog,
  assignSocketSession,
});

io.on('connection', (socket) => {
  const playerId = socket.id;

  const clearAssignedSession = (): void => {
    const assignment = socket.data.assignment
      ? (socket.data.assignment as SessionAssignment)
      : null;

    if (!assignment) {
      return;
    }

    if (assignment.mode === 'free-for-all') {
      socket.leave(FFA_ROOM_ID);
      ffaRoomService.handleDisconnect(playerId);
    } else {
      socket.leave(assignment.roomId);
      friendsRoomService.handleDisconnect(playerId, assignment.roomId);
    }

    assignSocketSession(playerId, null);
  };

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
    clearAssignedSession();
    ffaRoomService.join(playerId, displayName);
  });

  socket.on('room:create', ({ displayName, durationSeconds }) => {
    clearAssignedSession();
    friendsRoomService.createRoom(playerId, displayName, durationSeconds);
  });

  socket.on('room:join', ({ roomId, displayName }) => {
    clearAssignedSession();
    const error = friendsRoomService.joinRoom(playerId, roomId, displayName);
    if (error) {
      emitServerError(playerId, error);
    }
  });

  socket.on('room:update-config', ({ roomId, durationSeconds }) => {
    const error = friendsRoomService.updateRoomConfig(playerId, roomId, durationSeconds);
    if (error) {
      emitServerError(playerId, error);
    }
  });

  socket.on('room:start', ({ roomId }) => {
    const error = friendsRoomService.startRoom(playerId, roomId);
    if (error) {
      emitServerError(playerId, error);
    }
  });

  socket.on('room:kick', ({ roomId, targetPlayerId }) => {
    const error = friendsRoomService.kickPlayer(playerId, roomId, targetPlayerId);
    if (error) {
      emitServerError(playerId, error);
    }
  });

  socket.on('player:update', ({ roomId, snapshot }) => {
    const error = roomId === FFA_ROOM_ID
      ? ffaRoomService.handlePlayerUpdate(playerId, snapshot)
      : friendsRoomService.handlePlayerUpdate(playerId, roomId, snapshot);

    if (error) {
      emitServerError(playerId, error);
    }
  });

  socket.on('player:finish', ({ roomId, progress, score, scoreTrigger }) => {
    const error = roomId === FFA_ROOM_ID
      ? ffaRoomService.handlePlayerFinish(playerId, progress, score, scoreTrigger)
      : friendsRoomService.handlePlayerFinish(playerId, roomId, progress, score, scoreTrigger);

    if (error) {
      emitServerError(playerId, error);
    }
  });

  socket.on('disconnect', () => {
    const assignment = socket.data.assignment
      ? (socket.data.assignment as SessionAssignment)
      : null;
    debugLog('socket disconnected', {
      playerId,
      mode: assignment?.mode ?? null,
      roomId: assignment?.roomId ?? null,
    });
    if (!assignment) {
      return;
    }

    if (assignment.mode === 'free-for-all') {
      ffaRoomService.handleDisconnect(playerId);
      return;
    }

    friendsRoomService.handleDisconnect(playerId, assignment.roomId);
  });
});

httpServer.listen(port, () => {
  console.log(`@flappy/server listening on http://localhost:${port}`);
});
