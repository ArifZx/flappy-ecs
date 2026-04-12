export type GameMode = 'offline' | 'free-for-all' | 'friends';

export type BirdVariant = 'yellow' | 'red';

export type RoomStatus = 'waiting' | 'countdown' | 'running' | 'finished';

export type RoomId = string;
export type PlayerId = string;

export type RoomConfig = {
  mode: Extract<GameMode, 'free-for-all' | 'friends'>;
  seed: number;
  countdownSeconds: number;
  durationSeconds: number;
  maxVisiblePlayers: number;
};

export type PlayerSnapshot = {
  playerId: PlayerId;
  displayName: string;
  variant: BirdVariant;
  x: number;
  y: number;
  rotation: number;
  progress: number;
  score: number;
  alive: boolean;
  finished: boolean;
  updatedAt: number;
};

export type NearbyPlayersSnapshot = {
  selfPlayerId: PlayerId;
  players: PlayerSnapshot[];
};

export type LeaderboardEntry = {
  playerId: PlayerId;
  displayName: string;
  score: number;
  progress: number;
  alive: boolean;
  finishedAt?: number;
};

export type RoomSummary = {
  roomId: RoomId;
  status: RoomStatus;
  config: RoomConfig;
  startsAt?: number;
  endsAt?: number;
  connectedCount: number;
};

export type RoomMemberSummary = {
  playerId: PlayerId;
  displayName: string;
  isHost: boolean;
};

export type RoomLobbyState = {
  room: RoomSummary;
  selfPlayerId: PlayerId;
  hostPlayerId: PlayerId;
  members: RoomMemberSummary[];
  canStart: boolean;
};

export type RoomCreateRequest = {
  displayName: string;
  durationSeconds: number;
};

export type RoomJoinRequest = {
  roomId: RoomId;
  displayName: string;
};

export type RoomStartRequest = {
  roomId: RoomId;
};

export type RoomConfigUpdateRequest = {
  roomId: RoomId;
  durationSeconds: number;
};

export type RoomKickRequest = {
  roomId: RoomId;
  targetPlayerId: PlayerId;
};

export type FfaJoinRequest = {
  displayName: string;
};

export type PingRequest = {
  sentAt: number;
  label?: string;
};

export type PongPayload = {
  sentAt: number;
  serverTime: number;
  label?: string;
};

export type PlayerUpdateRequest = {
  roomId: RoomId;
  snapshot: PlayerSnapshot;
};

export type PlayerFinishRequest = {
  roomId: RoomId;
  progress: number;
  score: number;
};

export type RoomCountdown = {
  roomId: RoomId;
  startsAt: number;
  countdownSeconds: number;
};

export type RoomFinished = {
  roomId: RoomId;
  leaderboard: LeaderboardEntry[];
};

export type RoomKicked = {
  roomId: RoomId;
  message: string;
};

export type LeaderboardUpdate = {
  roomId: RoomId;
  maxScore: number;
  leaderboard: LeaderboardEntry[];
};

export type ServerErrorPayload = {
  message: string;
};

export type ClientToServerEvents = {
  'room:create': (payload: RoomCreateRequest) => void;
  'room:join': (payload: RoomJoinRequest) => void;
  'room:start': (payload: RoomStartRequest) => void;
  'room:update-config': (payload: RoomConfigUpdateRequest) => void;
  'room:kick': (payload: RoomKickRequest) => void;
  'ffa:join': (payload: FfaJoinRequest) => void;
  'system:ping': (payload: PingRequest) => void;
  'player:update': (payload: PlayerUpdateRequest) => void;
  'player:finish': (payload: PlayerFinishRequest) => void;
};

export type ServerToClientEvents = {
  'room:created': (payload: RoomSummary) => void;
  'room:joined': (payload: RoomSummary) => void;
  'room:lobby': (payload: RoomLobbyState) => void;
  'room:state': (payload: RoomSummary) => void;
  'room:countdown': (payload: RoomCountdown) => void;
  'room:finished': (payload: RoomFinished) => void;
  'room:kicked': (payload: RoomKicked) => void;
  'ffa:state': (payload: RoomSummary) => void;
  'system:pong': (payload: PongPayload) => void;
  'players:nearby': (payload: NearbyPlayersSnapshot) => void;
  'leaderboard:update': (payload: LeaderboardUpdate) => void;
  'server:error': (payload: ServerErrorPayload) => void;
};
