import type { GameMode } from '@flappy/shared';
import { FancyButton, Input } from '@pixi/ui';
import { Container, Graphics, Text } from 'pixi.js';

import { GAME_WIDTH } from '../config/constants';

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

type ButtonTheme = {
  fill: number;
  textColor: number;
  borderAlpha: number;
  alpha: number;
};

type ButtonThemeSet = {
  idle: ButtonTheme;
  hover: ButtonTheme;
  pressed: ButtonTheme;
};

type UiButtonController = {
  button: FancyButton;
  view: FancyButton;
  setLabel: (label: string) => void;
  setTheme: (theme: ButtonThemeSet) => void;
};

const PANEL_WIDTH = 248;
const PANEL_RADIUS = 28;
const CONTROL_WIDTH = PANEL_WIDTH - 28;
const INPUT_HEIGHT = 42;
const PRIMARY_BUTTON_HEIGHT = 52;
const MODE_BUTTON_WIDTH = 70;
const MODE_BUTTON_HEIGHT = 40;
const DURATION_BUTTON_WIDTH = 52;
const DURATION_BUTTON_HEIGHT = 34;
const MENU_BUTTON_WIDTH = 84;
const MENU_BUTTON_HEIGHT = 34;
const DURATION_OPTIONS = [45, 60, 90, 120] as const;

const sectionTextStyle = {
  fontFamily: 'Arial',
  fontSize: 12,
  fontWeight: '700',
  fill: 0xd9f3ff,
  letterSpacing: 0.4,
} as const;

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

const createButtonView = (
  width: number,
  height: number,
  radius: number,
  theme: ButtonTheme,
): Graphics => {
  const background = new Graphics();
  drawRoundedRect(background, width, height, radius, theme.fill, theme.alpha, {
    color: 0xffffff,
    width: 2,
    alpha: theme.borderAlpha,
  });
  return background;
};

const createButtonLabel = (text: string, fontSize: number, fill: number): Text => {
  const label = new Text({
    text,
    style: {
      fontFamily: 'Arial',
      fontSize,
      fontWeight: '700',
      fill,
      stroke: { color: 0xffffff, width: 1 },
    },
  });
  label.anchor.set(0.5);
  return label;
};

const createUiButton = (
  label: string,
  width: number,
  height: number,
  fontSize: number,
  themeSet: ButtonThemeSet,
): UiButtonController => {
  const textView = createButtonLabel(label, fontSize, themeSet.idle.textColor);
  const button = new FancyButton({
    defaultView: createButtonView(width, height, 18, themeSet.idle),
    hoverView: createButtonView(width, height, 18, themeSet.hover),
    pressedView: createButtonView(width, height, 18, themeSet.pressed),
    text: textView,
    animations: {
      hover: {
        props: {
          scale: { x: 1.02, y: 1.02 },
        },
        duration: 80,
      },
      pressed: {
        props: {
          scale: { x: 0.98, y: 0.98 },
        },
        duration: 60,
      },
    },
  });
  button.cursor = 'pointer';

  const setTheme = (theme: ButtonThemeSet): void => {
    button.defaultView = createButtonView(width, height, 18, theme.idle);
    button.hoverView = createButtonView(width, height, 18, theme.hover);
    button.pressedView = createButtonView(width, height, 18, theme.pressed);
    textView.style.fill = theme.idle.textColor;
    button.setState('default', true);
  };

  return {
    button,
    view: button,
    setLabel: (nextLabel: string) => {
      textView.text = nextLabel;
    },
    setTheme,
  };
};

const createInputBackground = (width: number, height: number): Graphics => {
  const background = new Graphics();
  drawRoundedRect(background, width, height, 18, 0x10293a, 0.94, {
    color: 0xffffff,
    width: 2,
    alpha: 0.16,
  });
  return background;
};

const createSectionLabel = (text: string): Text =>
  new Text({
    text,
    style: sectionTextStyle,
  });

const sanitizeDisplayName = (value: string): string => value.trim() || 'Player';

const sanitizeRoomId = (value: string): string => value.trim().toUpperCase();

const neutralButtonTheme: ButtonThemeSet = {
  idle: { fill: 0x1a3a4f, textColor: 0xf7fbff, borderAlpha: 0.2, alpha: 0.94 },
  hover: { fill: 0x24506d, textColor: 0xffffff, borderAlpha: 0.34, alpha: 1 },
  pressed: { fill: 0x10273a, textColor: 0xffffff, borderAlpha: 0.4, alpha: 1 },
};

const primaryButtonTheme: ButtonThemeSet = {
  idle: { fill: 0xffc443, textColor: 0x4a2600, borderAlpha: 0.16, alpha: 0.98 },
  hover: { fill: 0xffd46f, textColor: 0x412100, borderAlpha: 0.26, alpha: 1 },
  pressed: { fill: 0xe6ac25, textColor: 0x351a00, borderAlpha: 0.3, alpha: 1 },
};

const modeButtonInactiveTheme: ButtonThemeSet = {
  idle: { fill: 0x173447, textColor: 0xeaf7ff, borderAlpha: 0.18, alpha: 0.92 },
  hover: { fill: 0x214d69, textColor: 0xffffff, borderAlpha: 0.3, alpha: 1 },
  pressed: { fill: 0x0f2736, textColor: 0xffffff, borderAlpha: 0.34, alpha: 1 },
};

const modeButtonThemes: Record<GameMode, ButtonThemeSet> = {
  offline: {
    idle: { fill: 0x6ccf68, textColor: 0x0a1d0a, borderAlpha: 0.16, alpha: 0.98 },
    hover: { fill: 0x88de85, textColor: 0x071707, borderAlpha: 0.24, alpha: 1 },
    pressed: { fill: 0x52b54f, textColor: 0x071707, borderAlpha: 0.28, alpha: 1 },
  },
  'free-for-all': {
    idle: { fill: 0x7fe5ff, textColor: 0x08202d, borderAlpha: 0.16, alpha: 0.98 },
    hover: { fill: 0x9cecff, textColor: 0x061720, borderAlpha: 0.26, alpha: 1 },
    pressed: { fill: 0x5ecce8, textColor: 0x061720, borderAlpha: 0.3, alpha: 1 },
  },
  friends: {
    idle: { fill: 0xffd86b, textColor: 0x2b2000, borderAlpha: 0.16, alpha: 0.98 },
    hover: { fill: 0xffe493, textColor: 0x241b00, borderAlpha: 0.24, alpha: 1 },
    pressed: { fill: 0xe6bf4e, textColor: 0x241b00, borderAlpha: 0.3, alpha: 1 },
  },
};

const durationInactiveTheme: ButtonThemeSet = {
  idle: { fill: 0x163142, textColor: 0xe7f6ff, borderAlpha: 0.18, alpha: 0.92 },
  hover: { fill: 0x224a64, textColor: 0xffffff, borderAlpha: 0.28, alpha: 1 },
  pressed: { fill: 0x102736, textColor: 0xffffff, borderAlpha: 0.3, alpha: 1 },
};

const durationActiveTheme: ButtonThemeSet = {
  idle: { fill: 0xc0f36b, textColor: 0x182100, borderAlpha: 0.16, alpha: 0.98 },
  hover: { fill: 0xd1f88f, textColor: 0x111700, borderAlpha: 0.26, alpha: 1 },
  pressed: { fill: 0xa2d84a, textColor: 0x111700, borderAlpha: 0.28, alpha: 1 },
};

export const createMainMenu = ({
  parent,
  onStart,
  onOpen,
}: CreateMainMenuParams): MainMenuController => {
  let selectedMode: GameMode = 'offline';
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
  title.position.set(GAME_WIDTH / 2, 42);
  overlay.addChild(title);

  const panel = new Container();
  panel.position.set((GAME_WIDTH - PANEL_WIDTH) / 2, 88);
  overlay.addChild(panel);

  const panelBackground = new Graphics();
  panel.addChild(panelBackground);

  const nameLabel = createSectionLabel('PLAYER NAME');
  nameLabel.position.set(14, 18);
  panel.addChild(nameLabel);

  const playerNameInput = new Input({
    bg: createInputBackground(CONTROL_WIDTH, INPUT_HEIGHT),
    value: displayName,
    placeholder: 'Player',
    maxLength: 16,
    addMask: true,
    padding: { top: 10, right: 12, bottom: 10, left: 12 },
    textStyle: {
      fontFamily: 'Arial',
      fontSize: 16,
      fontWeight: '700',
      fill: 0xf8fcff,
    },
  });
  playerNameInput.width = CONTROL_WIDTH;
  playerNameInput.height = INPUT_HEIGHT;
  playerNameInput.position.set(14, 40);
  panel.addChild(playerNameInput);

  const modeLabel = createSectionLabel('MODE');
  modeLabel.position.set(14, 96);
  panel.addChild(modeLabel);

  const modeRow = new Container();
  modeRow.position.set(14, 120);
  panel.addChild(modeRow);

  const modeDescription = new Text({
    text: '',
    style: {
      fontFamily: 'Arial',
      fontSize: 11,
      fill: 0xf2fbff,
      stroke: { color: 0x10202b, width: 3 },
      wordWrap: true,
      wordWrapWidth: CONTROL_WIDTH,
    },
  });
  modeDescription.position.set(14, 170);
  panel.addChild(modeDescription);

  const friendsPanel = new Container();
  friendsPanel.position.set(14, 210);
  panel.addChild(friendsPanel);

  const roomLabel = createSectionLabel('ROOM CODE');
  roomLabel.position.set(0, 0);
  friendsPanel.addChild(roomLabel);

  const roomCodeInput = new Input({
    bg: createInputBackground(CONTROL_WIDTH, INPUT_HEIGHT),
    value: '',
    placeholder: 'Leave blank to create',
    maxLength: 12,
    addMask: true,
    padding: { top: 10, right: 12, bottom: 10, left: 12 },
    textStyle: {
      fontFamily: 'Arial',
      fontSize: 16,
      fontWeight: '700',
      fill: 0xf8fcff,
    },
  });
  roomCodeInput.width = CONTROL_WIDTH;
  roomCodeInput.height = INPUT_HEIGHT;
  roomCodeInput.position.set(0, 24);
  friendsPanel.addChild(roomCodeInput);

  const roomHint = new Text({
    text: 'Fill a code to join friends. Leave it empty to create a new timed room.',
    style: {
      fontFamily: 'Arial',
      fontSize: 11,
      fill: 0xc7e8f5,
      stroke: { color: 0x10202b, width: 3 },
      wordWrap: true,
      wordWrapWidth: CONTROL_WIDTH,
    },
  });
  roomHint.position.set(0, 72);
  friendsPanel.addChild(roomHint);

  const durationLabel = createSectionLabel('ROUND DURATION');
  durationLabel.position.set(0, 116);
  friendsPanel.addChild(durationLabel);

  const durationRow = new Container();
  durationRow.position.set(0, 140);
  friendsPanel.addChild(durationRow);

  const primaryButton = createUiButton('Start Solo Run', CONTROL_WIDTH, PRIMARY_BUTTON_HEIGHT, 20, primaryButtonTheme);
  panel.addChild(primaryButton.view);

  const status = new Text({
    text: '',
    style: {
      fontFamily: 'Arial',
      fontSize: 12,
      fill: 0xffffff,
      align: 'center',
      wordWrap: true,
      wordWrapWidth: GAME_WIDTH - 36,
      stroke: { color: 0x000000, width: 4 },
    },
  });
  status.anchor.set(0.5, 0);
  status.visible = false;
  overlay.addChild(status);

  const menuButton = createUiButton('Menu', MENU_BUTTON_WIDTH, MENU_BUTTON_HEIGHT, 14, neutralButtonTheme);
  menuButton.view.position.set(GAME_WIDTH - MENU_BUTTON_WIDTH - 12, 14);
  menuButton.view.visible = false;
  parent.addChild(menuButton.view);

  const modeButtons: Array<{ mode: GameMode; controller: UiButtonController }> = [];
  const modeConfigs: Array<{ mode: GameMode; label: string; x: number; fontSize: number }> = [
    { mode: 'offline', label: 'Offline', x: 0, fontSize: 12 },
    { mode: 'free-for-all', label: 'FFA', x: 75, fontSize: 12 },
    { mode: 'friends', label: 'Friends', x: 150, fontSize: 12 },
  ];

  for (const config of modeConfigs) {
    const controller = createUiButton(
      config.label,
      MODE_BUTTON_WIDTH,
      MODE_BUTTON_HEIGHT,
      config.fontSize,
      modeButtonInactiveTheme,
    );
    controller.view.position.set(config.x, 0);
    modeRow.addChild(controller.view);
    modeButtons.push({ mode: config.mode, controller });
  }

  const durationButtons: Array<{ seconds: number; controller: UiButtonController }> = [];

  for (const [index, seconds] of DURATION_OPTIONS.entries()) {
    const controller = createUiButton(
      `${seconds}s`,
      DURATION_BUTTON_WIDTH,
      DURATION_BUTTON_HEIGHT,
      12,
      durationInactiveTheme,
    );
    controller.view.position.set(index * (DURATION_BUTTON_WIDTH + 4), 0);
    durationRow.addChild(controller.view);
    durationButtons.push({ seconds, controller });
  }

  const setStatus = (message: string | null): void => {
    status.visible = message !== null;
    status.text = message ?? '';
  };

  const getModeDescription = (mode: GameMode, joiningFriendsRoom: boolean): string => {
    if (mode === 'free-for-all') {
      return 'Jump into the shared arena. Your run starts as soon as the room snapshot arrives.';
    }

    if (mode === 'friends') {
      return joiningFriendsRoom
        ? 'Join a private room with a room code.'
        : 'Create a timed room first, then share the generated room code with friends.';
    }

    return 'Practice locally with instant restart and no server round-trip.';
  };

  const syncPanelLayout = (): void => {
    const roomId = sanitizeRoomId(roomCodeInput.value);
    const isFriends = selectedMode === 'friends';
    const joiningFriendsRoom = isFriends && roomId.length > 0;
    const showDuration = isFriends && !joiningFriendsRoom;
    const panelHeight = isFriends ? (showDuration ? 390 : 334) : 284;

    drawRoundedRect(panelBackground, PANEL_WIDTH, panelHeight, PANEL_RADIUS, 0x112738, 0.96, {
      color: 0xffffff,
      width: 2,
      alpha: 0.16,
    });

    modeDescription.text = getModeDescription(selectedMode, joiningFriendsRoom);
    friendsPanel.visible = isFriends;
    durationLabel.visible = showDuration;
    durationRow.visible = showDuration;
    primaryButton.view.position.set(14, panelHeight - PRIMARY_BUTTON_HEIGHT - 16);
    status.position.set(GAME_WIDTH / 2, panel.y + panelHeight + 14);

    const primaryLabel =
      selectedMode === 'offline'
        ? 'Start Solo Run'
        : selectedMode === 'free-for-all'
          ? 'Join FFA'
          : joiningFriendsRoom
            ? 'Join Friends Room'
            : 'Create Friends Room';
    primaryButton.setLabel(primaryLabel);

    for (const entry of modeButtons) {
      entry.controller.setTheme(entry.mode === selectedMode ? modeButtonThemes[entry.mode] : modeButtonInactiveTheme);
    }

    for (const entry of durationButtons) {
      entry.controller.setTheme(entry.seconds === durationSeconds ? durationActiveTheme : durationInactiveTheme);
    }
  };

  const open = (): void => {
    overlay.visible = true;
    menuButton.view.visible = false;
    setStatus(null);
    syncPanelLayout();
    onOpen();
  };

  const close = (): void => {
    overlay.visible = false;
    menuButton.view.visible = true;
    setStatus(null);
  };

  playerNameInput.onChange.connect((value) => {
    displayName = value;
  });

  playerNameInput.onEnter.connect((value) => {
    displayName = sanitizeDisplayName(value);
    playerNameInput.value = displayName;
  });

  roomCodeInput.onChange.connect(() => {
    syncPanelLayout();
  });

  roomCodeInput.onEnter.connect((value) => {
    roomCodeInput.value = sanitizeRoomId(value);
    syncPanelLayout();
  });

  for (const entry of modeButtons) {
    entry.controller.button.onPress.connect(() => {
      selectedMode = entry.mode;
      syncPanelLayout();
    });
  }

  for (const entry of durationButtons) {
    entry.controller.button.onPress.connect(() => {
      durationSeconds = entry.seconds;
      syncPanelLayout();
    });
  }

  primaryButton.button.onPress.connect(() => {
    const safeDisplayName = sanitizeDisplayName(displayName);
    const roomId = sanitizeRoomId(roomCodeInput.value);

    displayName = safeDisplayName;
    playerNameInput.value = safeDisplayName;
    roomCodeInput.value = roomId;

    onStart({
      mode: selectedMode,
      displayName: safeDisplayName,
      roomId: selectedMode === 'friends' ? roomId : '',
      durationSeconds,
    });
  });

  menuButton.button.onPress.connect(open);

  syncPanelLayout();

  return {
    open,
    close,
    setStatus,
    isOpen: () => overlay.visible,
  };
};