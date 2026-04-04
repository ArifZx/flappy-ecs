import { io, type Socket } from 'socket.io-client';
import type {
  ClientToServerEvents,
  FfaJoinRequest,
  LeaderboardUpdate,
  NearbyPlayersSnapshot,
  PlayerFinishRequest,
  PlayerUpdateRequest,
  PingRequest,
  PongPayload,
  RoomCountdown,
  RoomConfigUpdateRequest,
  RoomCreateRequest,
  RoomLobbyState,
  RoomJoinRequest,
  RoomSummary,
  ServerErrorPayload,
  ServerToClientEvents,
} from '@flappy/shared';

export type MultiplayerClientCallbacks = {
  onFfaState: (summary: RoomSummary) => void;
  onFriendsSummary: (summary: RoomSummary) => void;
  onLobbyState: (state: RoomLobbyState) => void;
  onNearbyPlayers: (payload: NearbyPlayersSnapshot) => void;
  onCountdown: (payload: RoomCountdown) => void;
  onLeaderboard: (payload: LeaderboardUpdate) => void;
  onError: (payload: ServerErrorPayload) => void;
};

export type MultiplayerClient = {
  joinFfa: (payload: FfaJoinRequest) => void;
  createFriendsRoom: (payload: RoomCreateRequest) => void;
  joinFriendsRoom: (payload: RoomJoinRequest) => void;
  updateFriendsRoomConfig: (payload: RoomConfigUpdateRequest) => void;
  startFriendsRoom: (roomId: string) => void;
  sendPlayerUpdate: (payload: PlayerUpdateRequest) => void;
  finishRun: (payload: PlayerFinishRequest) => void;
  measureRtt: (label?: string) => Promise<number | null>;
  disconnect: () => void;
};

const SERVER_URL = import.meta.env.VITE_SERVER_URL ?? 'http://localhost:3001';

export const createMultiplayerClient = ({
  onFfaState,
  onFriendsSummary,
  onLobbyState,
  onNearbyPlayers,
  onCountdown,
  onLeaderboard,
  onError,
}: MultiplayerClientCallbacks): MultiplayerClient => {
  let socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;
  let nextPingId = 0;

  const getSocket = (): Socket<ServerToClientEvents, ClientToServerEvents> => {
    if (socket) {
      return socket;
    }

    socket = io(SERVER_URL, {
      transports: ['websocket'],
    });

    socket.on('ffa:state', onFfaState);
    socket.on('room:created', onFriendsSummary);
    socket.on('room:joined', onFriendsSummary);
    socket.on('room:state', onFriendsSummary);
    socket.on('room:lobby', onLobbyState);
    socket.on('room:countdown', onCountdown);
    socket.on('players:nearby', onNearbyPlayers);
    socket.on('leaderboard:update', onLeaderboard);
    socket.on('server:error', onError);

    return socket;
  };

  return {
    joinFfa: (payload) => {
      getSocket().emit('ffa:join', payload);
    },
    createFriendsRoom: (payload) => {
      getSocket().emit('room:create', payload);
    },
    joinFriendsRoom: (payload) => {
      getSocket().emit('room:join', payload);
    },
    updateFriendsRoomConfig: (payload) => {
      getSocket().emit('room:update-config', payload);
    },
    startFriendsRoom: (roomId) => {
      getSocket().emit('room:start', { roomId });
    },
    sendPlayerUpdate: (payload) => {
      getSocket().emit('player:update', payload);
    },
    finishRun: (payload) => {
      getSocket().emit('player:finish', payload);
    },
    measureRtt: async (label) => {
      const liveSocket = getSocket();

      return await new Promise<number | null>((resolve) => {
        const sentAt = Date.now();
        const pingLabel = label ?? `ping-${nextPingId}`;
        nextPingId += 1;
        let settled = false;

        const finish = (value: number | null): void => {
          if (settled) {
            return;
          }

          settled = true;
          liveSocket.off('system:pong', handlePong);
          resolve(value);
        };

        const timeout = window.setTimeout(() => {
          finish(null);
        }, 3000);

        const handlePong = (payload: PongPayload): void => {
          if (payload.sentAt !== sentAt || payload.label !== pingLabel) {
            return;
          }

          window.clearTimeout(timeout);
          finish(Date.now() - sentAt);
        };

        liveSocket.on('system:pong', handlePong);
        const payload: PingRequest = { sentAt, label: pingLabel };
        liveSocket.emit('system:ping', payload);
      });
    },
    disconnect: () => {
      if (!socket) {
        return;
      }

      socket.disconnect();
      socket = null;
    },
  };
};
