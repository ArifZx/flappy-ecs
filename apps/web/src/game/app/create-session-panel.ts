import { Dialog } from '@pixi/ui';
import { Container, Graphics, Text } from 'pixi.js';
import type {
  LeaderboardEntry,
  LeaderboardUpdate,
  RoomCountdown,
  RoomLobbyState,
  RoomSummary,
} from '@flappy/shared';

import { GAME_HEIGHT, GAME_WIDTH } from '../config/constants';
import { DISPLAY_RESOLUTION } from '../config/display';
import { UI_FONT_FAMILY } from '../config/font';
import {
  DURATION_OPTIONS,
  bodyTextStyle,
  createUiButton,
  dialogTitleStyle,
  drawRoundedRect,
  hintTextStyle,
  neutralButtonTheme,
  primaryButtonTheme,
  type UiButtonController,
} from '../ui/main-menu-ui.ts';

export type SessionPanelController = {
  hide: () => void;
  showOffline: () => void;
  showFfa: (summary: RoomSummary, payload: LeaderboardUpdate | null) => void;
  showFriendsLobby: (state: RoomLobbyState) => void;
  showCountdown: (payload: RoomCountdown) => void;
  showFriendsRunning: (summary: RoomSummary) => void;
  setStartHandler: (handler: ((roomId: string) => void) | null) => void;
  setDurationHandler: (handler: ((roomId: string, durationSeconds: number) => void) | null) => void;
};

type ListRowController = {
  container: Container;
  name: Text;
  value: Text;
};

type ListRowOptions = {
  fillAlpha?: number;
  strokeAlpha?: number;
  backgroundAlpha?: number;
};

const FFA_PANEL_WIDTH = 136;
const FFA_PANEL_ROW_HEIGHT = 22;
const FRIENDS_DIALOG_WIDTH = GAME_WIDTH - 20;
const FRIENDS_DIALOG_HEIGHT = GAME_HEIGHT - 56;
const FRIENDS_CONTENT_WIDTH = FRIENDS_DIALOG_WIDTH - 28;
const FRIENDS_ROW_WIDTH = FRIENDS_CONTENT_WIDTH;
const FRIENDS_ROW_HEIGHT = 28;
const MAX_FFA_ROWS = 10;
const MAX_FRIENDS_ROWS = 6;

const floatingLabelStyle = {
  fontFamily: UI_FONT_FAMILY,
  fontSize: 8,
  fontWeight: '700',
  fill: 0x90ddf6,
  letterSpacing: 0,
} as const;

const floatingTitleStyle = {
  fontFamily: UI_FONT_FAMILY,
  fontSize: 12,
  fontWeight: '700',
  fill: 0xf8fcff,
  stroke: { color: 0x09131b, width: 2 },
} as const;

const floatingSubtitleStyle = {
  ...hintTextStyle,
  fontSize: 10,
  wordWrap: true,
  wordWrapWidth: FFA_PANEL_WIDTH - 24,
} as const;

const rowNameStyle = {
  ...bodyTextStyle,
  fontSize: 8,
  fontWeight: '700',
} as const;

const rowValueStyle = {
  ...bodyTextStyle,
  fontSize: 8,
  fontWeight: '700',
  fill: 0x9ae7ff,
} as const;

const roomCodeStyle = {
  ...dialogTitleStyle,
  fontSize: 9,
  letterSpacing: 0,
} as const;

const formatRoomMeta = (summary: RoomSummary): string => {
  const roomLabel = summary.config.mode === 'free-for-all' ? 'Global FFA' : `Room ${summary.roomId}`;
  return `${roomLabel} • ${summary.connectedCount} players`;
};

const createText = (text: string, style: object): Text =>
  new Text({ text, style, resolution: DISPLAY_RESOLUTION });

const createListRow = (width: number, height: number, options: ListRowOptions = {}): ListRowController => {
  const { fillAlpha = 0.05, strokeAlpha = 0.04, backgroundAlpha = 0.45 } = options;
  const container = new Container();
  const background = new Graphics();
  drawRoundedRect(background, width, height, 14, 0xffffff, fillAlpha, {
    color: 0xffffff,
    width: 1,
    alpha: strokeAlpha,
  });
  background.alpha = backgroundAlpha;
  container.addChild(background);

  const name = createText('', rowNameStyle);
  name.anchor.set(0, 0.5);
  name.position.set(10, height / 2);
  container.addChild(name);

  const value = createText('', rowValueStyle);
  value.anchor.set(1, 0.5);
  value.position.set(width - 10, height / 2);
  container.addChild(value);

  container.visible = false;

  return {
    container,
    name,
    value,
  };
};

const setListRows = (rows: ListRowController[], entries: Array<{ name: string; value: string }>): void => {
  for (const [index, row] of rows.entries()) {
    const entry = entries[index];
    row.container.visible = entry !== undefined;
    if (!entry) {
      continue;
    }

    row.name.text = entry.name;
    row.value.text = entry.value;
  }
};

const toLeaderboardRows = (entries: LeaderboardEntry[]): Array<{ name: string; value: string }> => {
  if (entries.length === 0) {
    return [{ name: 'No scores yet', value: '-' }];
  }

  return entries.map((entry, index) => ({
    name: `${index + 1}. ${entry.displayName}`,
    value: String(entry.score),
  }));
};

export const createSessionPanel = (parent: Container): SessionPanelController => {
  const root = new Container();
  root.label = 'session-panel';
  root.visible = false;
  parent.addChild(root);

  const floatingPanel = new Container();
  floatingPanel.visible = false;
  floatingPanel.position.set(GAME_WIDTH - FFA_PANEL_WIDTH - 8, 58);
  root.addChild(floatingPanel);

  const floatingBackground = new Graphics();
  floatingPanel.addChild(floatingBackground);

  const floatingBadge = createText('Free For All', floatingLabelStyle);
  floatingBadge.position.set(10, 10);
  floatingPanel.addChild(floatingBadge);

  const floatingTitle = createText('Top 10', floatingTitleStyle);
  floatingTitle.position.set(10, 24);
  floatingPanel.addChild(floatingTitle);

  const floatingSubtitle = createText('', floatingSubtitleStyle);
  floatingSubtitle.position.set(10, 50);
  floatingPanel.addChild(floatingSubtitle);

  const floatingScoreTitle = createText('', floatingLabelStyle);
  floatingScoreTitle.position.set(10, 84);
  floatingPanel.addChild(floatingScoreTitle);

  const floatingRows: ListRowController[] = [];
  for (let index = 0; index < MAX_FFA_ROWS; index += 1) {
    const row = createListRow(FFA_PANEL_WIDTH - 16, FFA_PANEL_ROW_HEIGHT, {
      fillAlpha: 0,
      strokeAlpha: 0,
      backgroundAlpha: 0,
    });
    row.container.position.set(8, 102 + index * (FFA_PANEL_ROW_HEIGHT + 4));
    floatingPanel.addChild(row.container);
    floatingRows.push(row);
  }

  const dialogContent = new Container();

  const dialogBadge = createText('Party', floatingLabelStyle);
  dialogBadge.position.set(0, 0);
  dialogContent.addChild(dialogBadge);

  const dialogTitle = createText('Waiting Room', {
    ...dialogTitleStyle,
    fontSize: 14,
  });
  dialogTitle.position.set(0, 16);
  dialogContent.addChild(dialogTitle);

  const dialogSubtitle = createText('', {
    ...hintTextStyle,
    fontSize: 8,
    wordWrap: true,
    wordWrapWidth: FRIENDS_CONTENT_WIDTH - 8,
  });
  dialogSubtitle.position.set(0, 48);
  dialogContent.addChild(dialogSubtitle);

  const roomCodeBackground = new Graphics();
  roomCodeBackground.position.set(0, 98);
  dialogContent.addChild(roomCodeBackground);

  const roomCodeText = createText('', roomCodeStyle);
  roomCodeText.position.set(12, 110);
  dialogContent.addChild(roomCodeText);

  const durationSection = new Container();
  durationSection.position.set(0, 146);
  dialogContent.addChild(durationSection);

  const durationBackground = new Graphics();
  durationSection.addChild(durationBackground);

  const durationTitle = createText('ROUND DURATION', floatingLabelStyle);
  durationTitle.position.set(12, 10);
  durationSection.addChild(durationTitle);

  const durationSummary = createText('', {
    ...hintTextStyle,
    fontSize: 8,
    wordWrap: true,
    wordWrapWidth: FRIENDS_CONTENT_WIDTH - 32,
  });
  durationSummary.position.set(12, 28);
  durationSection.addChild(durationSummary);

  const durationButtons: Array<{ seconds: number; controller: UiButtonController }> = [];
  for (const [index, seconds] of DURATION_OPTIONS.entries()) {
    const controller = createUiButton(`${seconds}s`, 50, 34, 8, neutralButtonTheme);
    controller.view.position.set(12 + index * 56, 72);
    durationSection.addChild(controller.view);
    durationButtons.push({ seconds, controller });
  }

  const listTitle = createText('PLAYERS IN ROOM', floatingLabelStyle);
  listTitle.position.set(0, 266);
  dialogContent.addChild(listTitle);

  const friendsRows: ListRowController[] = [];
  for (let index = 0; index < MAX_FRIENDS_ROWS; index += 1) {
    const row = createListRow(FRIENDS_ROW_WIDTH, FRIENDS_ROW_HEIGHT);
    row.container.position.set(0, 286 + index * (FRIENDS_ROW_HEIGHT + 6));
    dialogContent.addChild(row.container);
    friendsRows.push(row);
  }

  const actionButton = createUiButton('Start Room', 176, 40, 9, primaryButtonTheme);
  actionButton.view.position.set((FRIENDS_CONTENT_WIDTH - 176) / 2, 286 + MAX_FRIENDS_ROWS * (FRIENDS_ROW_HEIGHT + 6));
  dialogContent.addChild(actionButton.view);

  const dialogBackground = new Graphics();
  drawRoundedRect(dialogBackground, FRIENDS_DIALOG_WIDTH, FRIENDS_DIALOG_HEIGHT, 28, 0x112738, 0.98, {
    color: 0xffffff,
    width: 2,
    alpha: 0.16,
  });

  const friendsDialog = new Dialog({
    background: dialogBackground,
    content: dialogContent,
    width: FRIENDS_DIALOG_WIDTH,
    height: FRIENDS_DIALOG_HEIGHT,
    padding: 14,
    backdropColor: 0x000000,
    backdropAlpha: 0.42,
    closeOnBackdropClick: false,
    animations: {
      open: {
        props: { scale: { x: 1, y: 1 }, alpha: 1 },
        duration: 120,
      },
      close: {
        props: { scale: { x: 0.96, y: 0.96 }, alpha: 0 },
        duration: 100,
      },
    },
  });
  friendsDialog.scale.set(0.96);
  friendsDialog.alpha = 0;
  root.addChild(friendsDialog);

  let startHandler: ((roomId: string) => void) | null = null;
  let startRoomId = '';
  let durationHandler: ((roomId: string, durationSeconds: number) => void) | null = null;
  let durationRoomId = '';

  const openDialog = (): void => {
    root.visible = true;
    floatingPanel.visible = false;
    if (!friendsDialog.isOpen) {
      friendsDialog.open();
    }
  };

  const hide = (): void => {
    root.visible = false;
    floatingPanel.visible = false;
    if (friendsDialog.isOpen) {
      friendsDialog.close();
    }
  };

  const syncDurationButtons = (selectedDuration: number, enabled: boolean): void => {
    for (const entry of durationButtons) {
      entry.controller.setTheme(entry.seconds === selectedDuration ? primaryButtonTheme : neutralButtonTheme);
      entry.controller.view.alpha = enabled ? 1 : 0.68;
      entry.controller.view.eventMode = enabled ? 'static' : 'none';
      entry.controller.view.cursor = enabled ? 'pointer' : 'default';
    }
  };

  const showFriendsRows = (entries: Array<{ name: string; value: string }>): void => {
    const visibleEntries = entries.slice(0, MAX_FRIENDS_ROWS);
    if (entries.length > MAX_FRIENDS_ROWS) {
      visibleEntries[MAX_FRIENDS_ROWS - 1] = {
        name: 'More players',
        value: `+${entries.length - MAX_FRIENDS_ROWS + 1}`,
      };
    }
    setListRows(friendsRows, visibleEntries);
  };

  for (const entry of durationButtons) {
    entry.controller.button.onPress.connect(() => {
      if (!durationHandler || !durationRoomId) {
        return;
      }

      durationHandler(durationRoomId, entry.seconds);
    });
  }

  actionButton.button.onPress.connect(() => {
    if (!startHandler || !startRoomId) {
      return;
    }

    startHandler(startRoomId);
  });

  return {
    hide,
    showOffline: () => {
      hide();
    },
    showFfa: (summary, payload) => {
      if (friendsDialog.isOpen) {
        friendsDialog.close();
      }

      root.visible = true;
      floatingPanel.visible = true;
      drawRoundedRect(floatingBackground, FFA_PANEL_WIDTH, 348, 22, 0x0c1822, 0, {
        color: 0xffffff,
        width: 2,
        alpha: 0,
      });
      floatingSubtitle.text = formatRoomMeta(summary);
      floatingScoreTitle.text = `MAX SCORE ${payload?.maxScore ?? 0}`;
      setListRows(floatingRows, toLeaderboardRows(payload?.leaderboard ?? []).slice(0, MAX_FFA_ROWS));
    },
    showFriendsLobby: (state) => {
      openDialog();
      drawRoundedRect(roomCodeBackground, FRIENDS_CONTENT_WIDTH, 34, 16, 0xffc443, 0.14);
      drawRoundedRect(durationBackground, FRIENDS_CONTENT_WIDTH, 116, 22, 0xffffff, 0.05);
      dialogBadge.text = 'Party';
      dialogTitle.text = 'Waiting Room';
      dialogSubtitle.text = state.canStart
        ? `${formatRoomMeta(state.room)}. Host can set the duration, then start the room.`
        : `${formatRoomMeta(state.room)}. Waiting for host to start.`;
      roomCodeText.text = `ROOM CODE ${state.room.roomId}`;
      durationSection.visible = true;
      durationSummary.text = state.canStart
        ? 'Pick the timer for this round before everyone launches.'
        : `Round timer is locked to ${state.room.config.durationSeconds} seconds.`;
      durationRoomId = state.room.roomId;
      syncDurationButtons(state.room.config.durationSeconds, state.canStart);
      listTitle.text = 'PLAYERS IN ROOM';
      showFriendsRows(state.members.map((member) => ({
        name: member.isHost ? `${member.displayName} (host)` : member.displayName,
        value: member.isHost ? 'HOST' : 'READY',
      })));
      actionButton.view.visible = state.canStart;
      startRoomId = state.room.roomId;
    },
    showCountdown: (payload) => {
      openDialog();
      drawRoundedRect(roomCodeBackground, FRIENDS_CONTENT_WIDTH, 34, 16, 0xffc443, 0.14);
      dialogBadge.text = 'Party';
      dialogTitle.text = 'Countdown';
      dialogSubtitle.text = `Room ${payload.roomId} is locked in. Match starts at ${new Date(payload.startsAt).toLocaleTimeString()}.`;
      roomCodeText.text = `ROOM CODE ${payload.roomId}`;
      durationSection.visible = false;
      listTitle.text = `STARTING IN ${payload.countdownSeconds} SECONDS`;
      showFriendsRows([{ name: 'Get ready to flap', value: '...' }]);
      actionButton.view.visible = false;
      startRoomId = '';
      durationRoomId = '';
    },
    showFriendsRunning: (summary) => {
      openDialog();
      drawRoundedRect(roomCodeBackground, FRIENDS_CONTENT_WIDTH, 34, 16, 0x7fe5ff, 0.12);
      dialogBadge.text = 'Party';
      dialogTitle.text = 'Match Running';
      dialogSubtitle.text = `${formatRoomMeta(summary)}. The room is live now.`;
      roomCodeText.text = `ROOM CODE ${summary.roomId}`;
      durationSection.visible = false;
      listTitle.text = `DURATION ${summary.config.durationSeconds} SECONDS`;
      showFriendsRows([{ name: 'Room in progress', value: 'LIVE' }]);
      actionButton.view.visible = false;
      startRoomId = '';
      durationRoomId = '';
    },
    setStartHandler: (handler) => {
      startHandler = handler;
      if (handler === null) {
        startRoomId = '';
      }
    },
    setDurationHandler: (handler) => {
      durationHandler = handler;
      if (handler === null) {
        durationRoomId = '';
      }
    },
  };
};
