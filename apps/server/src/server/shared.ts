import type {
  LeaderboardEntry,
  PlayerSnapshot,
} from '@flappy/shared';

import type { ConnectedPlayer, MonitorRoomDetail } from './types.js';

export const toLeaderboardEntry = (player: ConnectedPlayer): LeaderboardEntry => ({
  playerId: player.playerId,
  displayName: player.displayName,
  score: player.score,
  progress: player.progress,
  alive: player.alive,
  finishedAt: player.finishedAt,
});

export const toPlayerSnapshot = (player: ConnectedPlayer): PlayerSnapshot => ({
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

export const withMonitorTimes = (
  now: number,
  detail: Omit<MonitorRoomDetail, 'createdAtIso' | 'uptimeMs' | 'uptimeSeconds'>,
): MonitorRoomDetail => ({
  ...detail,
  createdAtIso: new Date(detail.createdAt).toISOString(),
  uptimeMs: now - detail.createdAt,
  uptimeSeconds: Math.floor((now - detail.createdAt) / 1000),
});