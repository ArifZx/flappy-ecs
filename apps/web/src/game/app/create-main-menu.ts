import type { GameMode } from '@flappy/shared';
import { Button } from '@pixi/ui';
import { Container, Graphics, Text } from 'pixi.js';

import { GAME_HEIGHT, GAME_WIDTH } from '../config/constants';

export type MainMenuStartRequest = {
  mode: GameMode;
  displayName: string;
  roomId: string;
  durationSeconds: number;
};

type CreateMainMenuParams = {
  parent: Container;
  onStart: (request: MainMenuStartRequest) => void;
  onOpen: () => void;
};

export type MainMenuController = {
  open: () => void;
  close: () => void;
  setStatus: (message: string | null) => void;
  isOpen: () => boolean;
};

const PLAY_BUTTON_WIDTH = 196;
const PLAY_BUTTON_HEIGHT = 56;
const SMALL_BUTTON_WIDTH = 72;
const SMALL_BUTTON_HEIGHT = 34;
const BUTTON_RADIUS = 22;
const DIALOG_WIDTH = 228;
const DIALOG_BUTTON_GAP = 12;

const drawRoundedRect = (
  graphics: Graphics,
  width: number,
  height: number,
  radius: number,
  fill: number,
  alpha: number,
  stroke?: { color: number; width: number; alpha?: number },
): void => {
  graphics.clear();
  graphics.roundRect(0, 0, width, height, radius);
  graphics.fill({ color: fill, alpha });
  if (stroke) {
    graphics.stroke({
      color: stroke.color,
      width: stroke.width,
      alpha: stroke.alpha ?? 1,
    });
  }
};

const promptValue = (label: string, fallback: string): string => {
  const value = window.prompt(label, fallback);
  if (value === null) {
    return fallback;
  }

  return value.trim() || fallback;
};

const promptDuration = (fallback: number): number => {
  const value = window.prompt('Room duration in seconds (45, 60, 90, 120)', String(fallback));
  if (value === null) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  if ([45, 60, 90, 120].includes(parsed)) {
    return parsed;
  }

  return fallback;
};

const createButton = (
  label: string,
  width: number,
  height: number,
  fill: number,
  textColor: number,
  fontSize = 18,
): { view: Container; button: Button; labelText: Text } => {
  const view = new Container();

  const background = new Graphics();
  drawRoundedRect(background, width, height, BUTTON_RADIUS, fill, 0.94, {
    color: 0xffffff,
    width: 2,
    alpha: 0.2,
  });
  view.addChild(background);

  const labelText = new Text({
    text: label,
    style: {
      fontFamily: 'Arial',
      fontSize,
      fontWeight: '700',
      fill: textColor,
      stroke: { color: 0xffffff, width: 1 },
    },
  });
  labelText.anchor.set(0.5);
  labelText.position.set(width / 2, height / 2);
  view.addChild(labelText);

  const button = new Button(view);
  view.cursor = 'pointer';

  const paintIdle = (): void => {
    drawRoundedRect(background, width, height, BUTTON_RADIUS, fill, 0.94, {
      color: 0xffffff,
      width: 2,
      alpha: 0.2,
    });
  };

  const paintHover = (): void => {
    drawRoundedRect(background, width, height, BUTTON_RADIUS, fill, 1, {
      color: 0xffffff,
      width: 2,
      alpha: 0.38,
    });
  };

  button.onHover.connect(paintHover);
  button.onOut.connect(() => {
    paintIdle();
    view.scale.set(1);
  });
  button.onDown.connect(() => {
    view.scale.set(0.98);
  });
  button.onUp.connect(() => {
    view.scale.set(1);
  });
  button.onUpOut.connect(() => {
    view.scale.set(1);
  });

  return {
    view,
    button,
    labelText,
  };
};

export const createMainMenu = ({
  parent,
  onStart,
  onOpen,
}: CreateMainMenuParams): MainMenuController => {
  let displayName = 'Player';
  let durationSeconds = 60;

  const overlay = new Container();
  overlay.label = 'main-menu';
  parent.addChild(overlay);

  const title = new Text({
    text: 'Flappy ECS',
    style: {
      fontFamily: 'Arial',
      fontSize: 34,
      fontWeight: '700',
      fill: 0xffffff,
      stroke: { color: 0x000000, width: 5 },
    },
  });
  title.anchor.set(0.5, 0);
  title.position.set(GAME_WIDTH / 2, 76);
  overlay.addChild(title);

  const playerRow = new Container();
  playerRow.position.set(GAME_WIDTH / 2, 122);
  overlay.addChild(playerRow);

  const playerNameText = new Text({
    text: '',
    style: {
      fontFamily: 'Arial',
      fontSize: 16,
      fontWeight: '700',
      fill: 0xffffff,
      stroke: { color: 0x000000, width: 4 },
    },
  });
  playerNameText.anchor.set(1, 0.5);
  playerRow.addChild(playerNameText);

  const editButtonView = createButton('Edit', SMALL_BUTTON_WIDTH, SMALL_BUTTON_HEIGHT, 0x173447, 0xf7fbff, 14);
  editButtonView.view.position.set(12, -SMALL_BUTTON_HEIGHT / 2);
  playerRow.addChild(editButtonView.view);

  const helperText = new Text({
    text: 'Press Play to choose mode',
    style: {
      fontFamily: 'Arial',
      fontSize: 11,
      fill: 0xffffff,
      stroke: { color: 0x000000, width: 3 },
    },
  });
  helperText.anchor.set(0.5, 0);
  helperText.position.set(GAME_WIDTH / 2, 152);
  overlay.addChild(helperText);

  const playButtonView = createButton('Play', PLAY_BUTTON_WIDTH, PLAY_BUTTON_HEIGHT, 0xffc443, 0x4a2600, 22);
  playButtonView.view.position.set((GAME_WIDTH - PLAY_BUTTON_WIDTH) / 2, 214);
  overlay.addChild(playButtonView.view);

  const status = new Text({
    text: '',
    style: {
      fontFamily: 'Arial',
      fontSize: 12,
      fill: 0xffffff,
      align: 'center',
      wordWrap: true,
      wordWrapWidth: GAME_WIDTH - 40,
      stroke: { color: 0x000000, width: 4 },
    },
  });
  status.anchor.set(0.5, 0);
  status.position.set(GAME_WIDTH / 2, GAME_HEIGHT - 82);
  status.visible = false;
  overlay.addChild(status);

  const menuButtonView = createButton('Menu', 80, 34, 0x7fe5ff, 0x08202d, 14);
  menuButtonView.view.position.set(GAME_WIDTH - 96, 14);
  menuButtonView.view.visible = false;
  parent.addChild(menuButtonView.view);

  const dialogScrim = new Graphics();
  dialogScrim.visible = false;
  dialogScrim.rect(0, 0, GAME_WIDTH, GAME_HEIGHT);
  dialogScrim.fill({ color: 0x000000, alpha: 0.38 });
  overlay.addChild(dialogScrim);

  const modeDialog = new Container();
  modeDialog.visible = false;
  modeDialog.position.set((GAME_WIDTH - DIALOG_WIDTH) / 2, 188);
  overlay.addChild(modeDialog);

  const dialogBackground = new Graphics();
  drawRoundedRect(dialogBackground, DIALOG_WIDTH, 222, 24, 0x173447, 0.96, {
    color: 0xffffff,
    width: 2,
    alpha: 0.22,
  });
  modeDialog.addChild(dialogBackground);

  const dialogTitle = new Text({
    text: 'Select Mode',
    style: {
      fontFamily: 'Arial',
      fontSize: 20,
      fontWeight: '700',
      fill: 0xffffff,
    },
  });
  dialogTitle.anchor.set(0.5, 0);
  dialogTitle.position.set(DIALOG_WIDTH / 2, 16);
  modeDialog.addChild(dialogTitle);

  const offlineButton = createButton('Offline', DIALOG_WIDTH - 28, 42, 0x6ccf68, 0x0a1d0a, 18);
  offlineButton.view.position.set(14, 54);
  modeDialog.addChild(offlineButton.view);

  const ffaButton = createButton('Free For All', DIALOG_WIDTH - 28, 42, 0x7fe5ff, 0x08202d, 18);
  ffaButton.view.position.set(14, 54 + 42 + DIALOG_BUTTON_GAP);
  modeDialog.addChild(ffaButton.view);

  const friendsButton = createButton('Friends', DIALOG_WIDTH - 28, 42, 0xffd86b, 0x2b2000, 18);
  friendsButton.view.position.set(14, 54 + (42 + DIALOG_BUTTON_GAP) * 2);
  modeDialog.addChild(friendsButton.view);

  const closeDialogButton = createButton('Close', 80, 30, 0x29485d, 0xf7fbff, 13);
  closeDialogButton.view.position.set((DIALOG_WIDTH - 80) / 2, 176);
  modeDialog.addChild(closeDialogButton.view);

  const syncPlayerName = (): void => {
    playerNameText.text = displayName;
  };

  const setStatus = (message: string | null): void => {
    status.visible = message !== null;
    status.text = message ?? '';
  };

  const openModeDialog = (): void => {
    dialogScrim.visible = true;
    modeDialog.visible = true;
  };

  const closeModeDialog = (): void => {
    dialogScrim.visible = false;
    modeDialog.visible = false;
  };

  const open = (): void => {
    overlay.visible = true;
    menuButtonView.view.visible = false;
    closeModeDialog();
    setStatus(null);
    onOpen();
  };

  const close = (): void => {
    overlay.visible = false;
    menuButtonView.view.visible = true;
    closeModeDialog();
  };

  editButtonView.button.onPress.connect(() => {
    displayName = promptValue('Player name', displayName);
    syncPlayerName();
  });

  playButtonView.button.onPress.connect(openModeDialog);
  closeDialogButton.button.onPress.connect(closeModeDialog);
  dialogScrim.eventMode = 'static';
  dialogScrim.on('pointertap', closeModeDialog);

  offlineButton.button.onPress.connect(() => {
    closeModeDialog();
    onStart({
      mode: 'offline',
      displayName,
      roomId: '',
      durationSeconds,
    });
  });

  ffaButton.button.onPress.connect(() => {
    closeModeDialog();
    onStart({
      mode: 'free-for-all',
      displayName,
      roomId: '',
      durationSeconds,
    });
  });

  friendsButton.button.onPress.connect(() => {
    const roomId = promptValue('Room code. Leave empty to create a new room', '').toUpperCase();
    const nextDuration = roomId ? durationSeconds : promptDuration(durationSeconds);
    durationSeconds = nextDuration;
    closeModeDialog();
    onStart({
      mode: 'friends',
      displayName,
      roomId,
      durationSeconds: nextDuration,
    });
  });

  menuButtonView.button.onPress.connect(open);

  syncPlayerName();

  return {
    open,
    close,
    setStatus,
    isOpen: () => overlay.visible,
  };
};