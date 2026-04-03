import type {
  LeaderboardEntry,
  LeaderboardUpdate,
  RoomCountdown,
  RoomLobbyState,
  RoomSummary,
} from '@flappy/shared';

export type SessionPanelController = {
  hide: () => void;
  showOffline: () => void;
  showFfa: (summary: RoomSummary, payload: LeaderboardUpdate | null) => void;
  showFriendsLobby: (state: RoomLobbyState) => void;
  showCountdown: (payload: RoomCountdown) => void;
  showFriendsRunning: (summary: RoomSummary) => void;
  setStartHandler: (handler: ((roomId: string) => void) | null) => void;
};

const formatRoomMeta = (summary: RoomSummary): string => {
  const roomLabel = summary.config.mode === 'free-for-all' ? 'Global FFA' : `Room ${summary.roomId}`;
  return `${roomLabel} • ${summary.connectedCount} players`;
};

const renderLeaderboard = (listRoot: HTMLOListElement, entries: LeaderboardEntry[]): void => {
  listRoot.replaceChildren();

  if (entries.length === 0) {
    const empty = document.createElement('li');
    empty.className = 'session-panel__entry session-panel__entry--empty';
    empty.textContent = 'No scores yet';
    listRoot.appendChild(empty);
    return;
  }

  for (const entry of entries) {
    const item = document.createElement('li');
    item.className = 'session-panel__entry';

    const name = document.createElement('span');
    name.className = 'session-panel__entry-name';
    name.textContent = entry.displayName;
    item.appendChild(name);

    const score = document.createElement('span');
    score.className = 'session-panel__entry-score';
    score.textContent = String(entry.score);
    item.appendChild(score);

    listRoot.appendChild(item);
  }
};

export const createSessionPanel = (parent: HTMLElement): SessionPanelController => {
  const panel = document.createElement('aside');
  panel.className = 'session-panel';
  panel.hidden = true;
  parent.appendChild(panel);

  const badge = document.createElement('p');
  badge.className = 'session-panel__badge';
  panel.appendChild(badge);

  const title = document.createElement('h2');
  title.className = 'session-panel__title';
  panel.appendChild(title);

  const subtitle = document.createElement('p');
  subtitle.className = 'session-panel__subtitle';
  panel.appendChild(subtitle);

  const actionButton = document.createElement('button');
  actionButton.type = 'button';
  actionButton.className = 'session-panel__action';
  actionButton.hidden = true;
  panel.appendChild(actionButton);

  const listTitle = document.createElement('p');
  listTitle.className = 'session-panel__list-title';
  panel.appendChild(listTitle);

  const listRoot = document.createElement('ol');
  listRoot.className = 'session-panel__list';
  panel.appendChild(listRoot);

  let startHandler: ((roomId: string) => void) | null = null;
  let startRoomId = '';

  actionButton.addEventListener('click', () => {
    if (!startHandler || !startRoomId) {
      return;
    }

    startHandler(startRoomId);
  });

  const hide = (): void => {
    panel.hidden = true;
  };

  const show = (): void => {
    panel.hidden = false;
  };

  return {
    hide,
    showOffline: () => {
      hide();
    },
    showFfa: (summary, payload) => {
      show();
      badge.textContent = 'Free For All';
      title.textContent = 'Top 10';
      subtitle.textContent = formatRoomMeta(summary);
      listTitle.textContent = `Current max score: ${payload?.maxScore ?? 0}`;
      actionButton.hidden = true;
      renderLeaderboard(listRoot, payload?.leaderboard ?? []);
    },
    showFriendsLobby: (state) => {
      show();
      badge.textContent = 'Friends';
      title.textContent = 'Waiting Room';
      subtitle.textContent = `${formatRoomMeta(state.room)} • Seed ${state.room.config.seed}`;
      listTitle.textContent = 'Players in room';
      actionButton.hidden = !state.canStart;
      actionButton.textContent = 'Start Room';
      startRoomId = state.room.roomId;
      renderLeaderboard(listRoot, state.members.map((member) => ({
        playerId: member.playerId,
        displayName: member.isHost ? `${member.displayName} (host)` : member.displayName,
        score: 0,
        progress: 0,
        alive: true,
      })));
    },
    showCountdown: (payload) => {
      show();
      badge.textContent = 'Friends';
      title.textContent = 'Countdown';
      subtitle.textContent = `Room ${payload.roomId} starts at ${new Date(payload.startsAt).toLocaleTimeString()}`;
      listTitle.textContent = `Starting in ${payload.countdownSeconds} seconds`;
      actionButton.hidden = true;
      listRoot.replaceChildren();
    },
    showFriendsRunning: (summary) => {
      show();
      badge.textContent = 'Friends';
      title.textContent = 'Match Running';
      subtitle.textContent = formatRoomMeta(summary);
      listTitle.textContent = `Duration ${summary.config.durationSeconds} seconds`;
      actionButton.hidden = true;
      listRoot.replaceChildren();
    },
    setStartHandler: (handler) => {
      startHandler = handler;
      if (handler === null) {
        startRoomId = '';
      }
    },
  };
};
