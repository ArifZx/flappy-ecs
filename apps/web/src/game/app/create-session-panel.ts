import { ScrollBox } from '@pixi/ui';
import { Container, Graphics, Text } from 'pixi.js';
import type {
  LeaderboardEntry,
  LeaderboardUpdate,
  RoomCountdown,
  RoomFinished,
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
} from '../ui/main-menu-ui';

export type SessionPanelController = {
  hide: () => void;
  showOffline: () => void;
  showFfa: (summary: RoomSummary, payload: LeaderboardUpdate | null) => void;
  showFriendsLobby: (state: RoomLobbyState) => void;
  showCountdown: (payload: RoomCountdown) => void;
  showFriendsRunning: (summary: RoomSummary) => void;
  showFriendsFinished: (roomId: string, payload: RoomFinished) => void;
  setStartHandler: (handler: ((roomId: string) => void) | null) => void;
  setDurationHandler: (handler: ((roomId: string, durationSeconds: number) => void) | null) => void;
  setKickHandler: (handler: ((roomId: string, targetPlayerId: string) => void) | null) => void;
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
const FRIENDS_ROW_GAP = 4;
const FRIENDS_LIST_TITLE_Y = 270;
const FRIENDS_LIST_START_Y = 292;
const FRIENDS_LIST_HEIGHT = 96;
const FRIENDS_ACTION_BUTTON_Y = 396;
const ROOM_CODE_BUTTON_WIDTH = 64;
const ROOM_CODE_BUTTON_GAP = 8;
const ROOM_CODE_PILL_HEIGHT = 34;
const KICK_BUTTON_WIDTH = 56;
const MAX_FFA_ROWS = 10;

const floatingLabelStyle = {
  fontFamily: UI_FONT_FAMILY,
  fontSize: 8,
  fontWeight: '700',
  fill: 0x90ddf6,
  letterSpacing: 0,
  padding: 2,
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

const createStaticListItem = (width: number, height: number, nameText: string, valueText: string): Container => {
  const row = createListRow(width, height);
  row.container.visible = true;
  row.name.text = nameText;
  row.value.text = valueText;
  return row.container;
};

const createLobbyListItem = (
  width: number,
  height: number,
  nameText: string,
  valueText: string,
  onKick?: () => void,
): Container => {
  const row = createListRow(width, height);
  row.container.visible = true;
  row.name.text = nameText;

  if (!onKick) {
    row.value.text = valueText;
    return row.container;
  }

  row.value.visible = false;
  const kickButton = createUiButton('Kick', KICK_BUTTON_WIDTH, height - 4, 8, neutralButtonTheme);
  kickButton.view.position.set(width - KICK_BUTTON_WIDTH - 4, 2);
  kickButton.button.onPress.connect(onKick);
  row.container.addChild(kickButton.view);
  return row.container;
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

const copyTextToClipboard = async (value: string): Promise<boolean> => {
  if (typeof navigator !== 'undefined' && 'clipboard' in navigator && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(value);
      return true;
    } catch {
      // Fall through to the textarea-based fallback below.
    }
  }

  if (typeof document === 'undefined') {
    return false;
  }

  const textArea = document.createElement('textarea');
  textArea.value = value;
  textArea.setAttribute('readonly', 'true');
  textArea.style.position = 'fixed';
  textArea.style.left = '-9999px';
  document.body.appendChild(textArea);
  textArea.select();

  try {
    return document.execCommand('copy');
  } catch {
    return false;
  } finally {
    document.body.removeChild(textArea);
  }
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
  dialogContent.position.set(14, 14);

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

  const copyRoomCodeButton = createUiButton('Copy', ROOM_CODE_BUTTON_WIDTH, ROOM_CODE_PILL_HEIGHT, 8, neutralButtonTheme);
  copyRoomCodeButton.view.position.set(
    FRIENDS_CONTENT_WIDTH - ROOM_CODE_BUTTON_WIDTH,
    98,
  );
  dialogContent.addChild(copyRoomCodeButton.view);

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
  listTitle.position.set(0, FRIENDS_LIST_TITLE_Y);
  dialogContent.addChild(listTitle);

  const friendsList = new ScrollBox({
    width: FRIENDS_ROW_WIDTH,
    height: FRIENDS_LIST_HEIGHT,
    radius: 0,
    items: [],
    elementsMargin: FRIENDS_ROW_GAP,
    globalScroll: false,
  });
  friendsList.position.set(0, FRIENDS_LIST_START_Y);
  dialogContent.addChild(friendsList);

  const actionButton = createUiButton('Start Party Game', 176, 40, 9, primaryButtonTheme);
  actionButton.view.position.set((FRIENDS_CONTENT_WIDTH - 176) / 2, FRIENDS_ACTION_BUTTON_Y);
  dialogContent.addChild(actionButton.view);

  const dialogBackground = new Graphics();
  drawRoundedRect(dialogBackground, FRIENDS_DIALOG_WIDTH, FRIENDS_DIALOG_HEIGHT, 28, 0x112738, 0.98, {
    color: 0xffffff,
    width: 2,
    alpha: 0.16,
  });

  const dialogBackdrop = new Graphics();
  dialogBackdrop.visible = false;
  dialogBackdrop.rect(0, 0, GAME_WIDTH, GAME_HEIGHT);
  dialogBackdrop.fill({ color: 0x000000, alpha: 0.42 });
  root.addChild(dialogBackdrop);

  const friendsDialog = new Container();
  friendsDialog.visible = false;
  friendsDialog.position.set((GAME_WIDTH - FRIENDS_DIALOG_WIDTH) / 2, 28);
  friendsDialog.addChild(dialogBackground, dialogContent);
  root.addChild(friendsDialog);

  let startHandler: ((roomId: string) => void) | null = null;
  let startRoomId = '';
  let durationHandler: ((roomId: string, durationSeconds: number) => void) | null = null;
  let durationRoomId = '';
  let kickHandler: ((roomId: string, targetPlayerId: string) => void) | null = null;
  let copyRoomCode = '';
  let copyResetTimer: number | null = null;

  const resetCopyButton = (): void => {
    copyRoomCodeButton.setLabel('Copy');
  };

  const scheduleCopyButtonReset = (): void => {
    if (copyResetTimer !== null) {
      window.clearTimeout(copyResetTimer);
    }

    copyResetTimer = window.setTimeout(() => {
      resetCopyButton();
      copyResetTimer = null;
    }, 1500);
  };

  const openDialog = (): void => {
    root.visible = true;
    floatingPanel.visible = false;
    dialogBackdrop.visible = true;
    friendsDialog.visible = true;
  };

  const hide = (): void => {
    if (copyResetTimer !== null) {
      window.clearTimeout(copyResetTimer);
      copyResetTimer = null;
    }

    resetCopyButton();
    root.visible = false;
    floatingPanel.visible = false;
    dialogBackdrop.visible = false;
    friendsDialog.visible = false;
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
    friendsList.removeItems();
    if (entries.length > 0) {
      friendsList.addItems(entries.map((entry) =>
        createStaticListItem(FRIENDS_ROW_WIDTH, FRIENDS_ROW_HEIGHT, entry.name, entry.value)));
    }
    friendsList.resize(true);
    friendsList.scrollTop();
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

  copyRoomCodeButton.button.onPress.connect(() => {
    if (!copyRoomCode) {
      return;
    }

    void copyTextToClipboard(copyRoomCode).then((didCopy) => {
      copyRoomCodeButton.setLabel(didCopy ? 'Copied' : 'Retry');
      scheduleCopyButtonReset();
    });
  });

  return {
    hide,
    showOffline: () => {
      hide();
    },
    showFfa: (summary, payload) => {
      dialogBackdrop.visible = false;
      friendsDialog.visible = false;

      root.visible = true;
      floatingPanel.visible = true;
      drawRoundedRect(floatingBackground, FFA_PANEL_WIDTH, 348, 22, 0x0c1822, 0, {
        color: 0xffffff,
        width: 2,
        alpha: 0,
      });
      floatingSubtitle.text = formatRoomMeta(summary);
      floatingScoreTitle.text = `MAX SCORE ${payload?.maxScore ?? 0}`;
      for (const [index, row] of floatingRows.entries()) {
        const entry = toLeaderboardRows(payload?.leaderboard ?? []).slice(0, MAX_FFA_ROWS)[index];
        row.container.visible = entry !== undefined;
        if (!entry) {
          continue;
        }

        row.name.text = entry.name;
        row.value.text = entry.value;
      }
    },
    showFriendsLobby: (state) => {
      openDialog();
      drawRoundedRect(
        roomCodeBackground,
        FRIENDS_CONTENT_WIDTH - ROOM_CODE_BUTTON_WIDTH - ROOM_CODE_BUTTON_GAP,
        ROOM_CODE_PILL_HEIGHT,
        16,
        0xffc443,
        0.14,
      );
      drawRoundedRect(durationBackground, FRIENDS_CONTENT_WIDTH, 116, 22, 0xffffff, 0.05);
      dialogBadge.text = 'Party';
      dialogTitle.text = 'Waiting Room';
      dialogSubtitle.text = state.canStart
        ? `${formatRoomMeta(state.room)}. Host can set the duration, then start the room.`
        : `${formatRoomMeta(state.room)}. Waiting for host to start.`;
      roomCodeText.text = `ROOM CODE ${state.room.roomId}`;
      copyRoomCode = state.room.roomId;
      resetCopyButton();
      copyRoomCodeButton.view.visible = true;
      durationSection.visible = true;
      durationSummary.text = state.canStart
        ? 'Pick the timer for this round before everyone launches.'
        : `Round timer is locked to ${state.room.config.durationSeconds} seconds.`;
      durationRoomId = state.room.roomId;
      syncDurationButtons(state.room.config.durationSeconds, state.canStart);
      listTitle.text = 'PLAYERS IN ROOM';
      friendsList.removeItems();
      friendsList.addItems(state.members.map((member) => {
        const canKickMember = state.selfPlayerId === state.hostPlayerId
          && !member.isHost
          && member.playerId !== state.selfPlayerId
          && kickHandler !== null;

        return createLobbyListItem(
          FRIENDS_ROW_WIDTH,
          FRIENDS_ROW_HEIGHT,
          member.isHost ? `${member.displayName} (host)` : member.displayName,
          member.isHost ? 'HOST' : 'READY',
          canKickMember
            ? () => {
                kickHandler?.(state.room.roomId, member.playerId);
              }
            : undefined,
        );
      }));
      friendsList.resize(true);
      friendsList.scrollTop();
      actionButton.view.visible = state.canStart;
      startRoomId = state.room.roomId;
    },
    showCountdown: (payload) => {
      openDialog();
      drawRoundedRect(
        roomCodeBackground,
        FRIENDS_CONTENT_WIDTH - ROOM_CODE_BUTTON_WIDTH - ROOM_CODE_BUTTON_GAP,
        ROOM_CODE_PILL_HEIGHT,
        16,
        0xffc443,
        0.14,
      );
      dialogBadge.text = 'Party';
      dialogTitle.text = 'Countdown';
      dialogSubtitle.text = `Room ${payload.roomId} is locked in. Match starts at ${new Date(payload.startsAt).toLocaleTimeString()}.`;
      roomCodeText.text = `ROOM CODE ${payload.roomId}`;
      copyRoomCode = payload.roomId;
      resetCopyButton();
      copyRoomCodeButton.view.visible = true;
      durationSection.visible = false;
      listTitle.text = `STARTING IN ${payload.countdownSeconds} SECONDS`;
      showFriendsRows([{ name: 'Get ready to flap', value: '...' }]);
      actionButton.view.visible = false;
      startRoomId = '';
      durationRoomId = '';
    },
    showFriendsRunning: (summary) => {
      openDialog();
      drawRoundedRect(
        roomCodeBackground,
        FRIENDS_CONTENT_WIDTH - ROOM_CODE_BUTTON_WIDTH - ROOM_CODE_BUTTON_GAP,
        ROOM_CODE_PILL_HEIGHT,
        16,
        0x7fe5ff,
        0.12,
      );
      dialogBadge.text = 'Party';
      dialogTitle.text = 'Match Running';
      dialogSubtitle.text = `${formatRoomMeta(summary)}. The room is live now.`;
      roomCodeText.text = `ROOM CODE ${summary.roomId}`;
      copyRoomCode = summary.roomId;
      resetCopyButton();
      copyRoomCodeButton.view.visible = true;
      durationSection.visible = false;
      listTitle.text = `DURATION ${summary.config.durationSeconds} SECONDS`;
      showFriendsRows([{ name: 'Room in progress', value: 'LIVE' }]);
      actionButton.view.visible = false;
      startRoomId = '';
      durationRoomId = '';
    },
    showFriendsFinished: (roomId, payload) => {
      openDialog();
      drawRoundedRect(
        roomCodeBackground,
        FRIENDS_CONTENT_WIDTH - ROOM_CODE_BUTTON_WIDTH - ROOM_CODE_BUTTON_GAP,
        ROOM_CODE_PILL_HEIGHT,
        16,
        0xffc443,
        0.14,
      );
      dialogBadge.text = 'Party';
      dialogTitle.text = 'Times Up';
      dialogSubtitle.text = `Room ${roomId} has ended. Final standings are locked in.`;
      roomCodeText.text = `ROOM CODE ${roomId}`;
      copyRoomCode = roomId;
      resetCopyButton();
      copyRoomCodeButton.view.visible = true;
      durationSection.visible = false;
      listTitle.text = 'FINAL LEADERBOARD';
      showFriendsRows(payload.leaderboard.length > 0
        ? payload.leaderboard.map((entry, index) => ({
            name: `${index + 1}. ${entry.displayName}`,
            value: String(entry.score),
          }))
        : [{ name: 'No scores recorded', value: '-' }]);
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
    setKickHandler: (handler) => {
      kickHandler = handler;
    },
  };
};
