import type {
  BirdVariant,
  PlayerId,
  RoomId,
  RoomSummary,
} from '@flappy/shared';

export type SessionAssignment = {
  mode: 'free-for-all' | 'friends';
  roomId: RoomId;
};

export type ConnectedPlayer = {
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

export type FriendsRoomRecord = {
  roomId: RoomId;
  hostPlayerId: PlayerId;
  players: Map<PlayerId, ConnectedPlayer>;
  summary: RoomSummary;
  createdAt: number;
  countdownTimer: ReturnType<typeof setTimeout> | null;
  finishTimer: ReturnType<typeof setTimeout> | null;
};

export type FfaRoomRecord = {
  summary: RoomSummary;
  players: Map<PlayerId, ConnectedPlayer>;
  createdAt: number;
  lastPlayerDisconnectedAt: number | null;
  idleShutdownAt: number | null;
  idleTimer: ReturnType<typeof setTimeout> | null;
};

export type MonitorRoomDetail = {
  roomId: string;
  mode: string;
  status: string;
  playerCount: number;
  createdAt: number;
  createdAtIso: string;
  uptimeMs: number;
  uptimeSeconds: number;
  durationSeconds: number;
  countdownSeconds: number;
  hostPlayerId?: string;
  lastPlayerDisconnectedAt?: number | null;
  lastPlayerDisconnectedAtIso?: string | null;
  idleShutdownAt?: number | null;
  idleShutdownAtIso?: string | null;
  secondsUntilShutdown?: number | null;
};

export type DebugLog = (message: string, details?: Record<string, unknown>) => void;

export type AssignSocketSession = (playerId: PlayerId, assignment: SessionAssignment | null) => void;