import type { GameMode } from '@flappy/shared';
import { Container, Graphics, Sprite, Text } from 'pixi.js';
import type { Texture } from 'pixi.js';

import { GAME_HEIGHT, GAME_WIDTH } from '../config/constants';
import { DISPLAY_RESOLUTION } from '../config/display';
import { UI_FONT_FAMILY } from '../config/font';
import {
  RANDOM_PLAYER_FIRST_NAMES,
  RANDOM_PLAYER_LAST_NAMES,
} from '../config/player-names';
import {
  CONTROL_WIDTH,
  dialogTitleStyle,
  INPUT_HEIGHT,
  MENU_BUTTON_HEIGHT,
  MENU_BUTTON_WIDTH,
  MODE_BUTTON_HEIGHT,
  MODE_BUTTON_SPACING,
  MODE_BUTTON_THEMES,
  MODE_BUTTON_WIDTH,
  MODE_CONFIGS,
  MODE_INACTIVE_THEME,
  PANEL_RADIUS,
  PANEL_WIDTH,
  PRIMARY_BUTTON_HEIGHT,
  bodyTextStyle,
  createMenuInput,
  createSectionLabel,
  createUiButton,
  drawRoundedRect,
  hintTextStyle,
  neutralButtonTheme,
  primaryButtonTheme,
  sanitizeDisplayName,
  sanitizeRoomId,
  statusTextStyle,
  type MainMenuState,
  type UiButtonController,
} from '../ui/main-menu-ui';

const PLAYER_NAME_STORAGE_KEY = 'flappy-party-player-name';
const PLAYER_NAME_MAX_LENGTH = 20;

const clampDisplayName = (value: string): string => value.trim().slice(0, PLAYER_NAME_MAX_LENGTH);

const loadStoredDisplayName = (): string => {
  if (typeof window === 'undefined') {
    return '';
  }

  return clampDisplayName(window.localStorage.getItem(PLAYER_NAME_STORAGE_KEY) ?? '');
};

const storeDisplayName = (value: string): void => {
  if (typeof window === 'undefined') {
    return;
  }

  const trimmedValue = clampDisplayName(value);
  if (!trimmedValue) {
    window.localStorage.removeItem(PLAYER_NAME_STORAGE_KEY);
    return;
  }

  window.localStorage.setItem(PLAYER_NAME_STORAGE_KEY, trimmedValue);
};

const pickRandomDisplayName = (currentValue: string): string => {
  const currentName = currentValue.trim().toLowerCase();

  for (let attempt = 0; attempt < 24; attempt += 1) {
    const firstName = RANDOM_PLAYER_FIRST_NAMES[
      Math.floor(Math.random() * RANDOM_PLAYER_FIRST_NAMES.length)
    ];
    const lastName = RANDOM_PLAYER_LAST_NAMES[
      Math.floor(Math.random() * RANDOM_PLAYER_LAST_NAMES.length)
    ];
    const candidate = clampDisplayName(`${firstName} ${lastName}`);
    if (candidate && candidate.toLowerCase() !== currentName) {
      return candidate;
    }
  }

  return 'Player';
};

export type MainMenuStartRequest = {
  mode: GameMode;
  displayName: string;
  roomId: string;
  durationSeconds: number;
};

type CreateMainMenuParams = {
  parent: Container;
  diceTexture: Texture;
  onStart: (request: MainMenuStartRequest) => void;
  onOpen: () => void;
};

export type MainMenuController = {
  open: () => void;
  close: () => void;
  setStatus: (message: string | null) => void;
  isOpen: () => boolean;
};

export const createMainMenu = ({
  parent,
  diceTexture,
  onStart,
  onOpen,
}: CreateMainMenuParams): MainMenuController => {
  const controlOffsetX = (PANEL_WIDTH - CONTROL_WIDTH) / 2;
  const compactButtonGap = 8;
  const actionButtonGap = 10;
  const actionButtonWidth = Math.floor((CONTROL_WIDTH - actionButtonGap) / 2);
  const randomButtonSize = 32;
  const randomButtonGap = 8;
  const playerNameInputWidth = CONTROL_WIDTH - randomButtonSize - randomButtonGap;
  const playMenuWidth = GAME_WIDTH - 28;
  const playMenuHeight = GAME_HEIGHT - 110;
  const playMenuPaddingTop = 18;
  const playMenuContentX = (playMenuWidth - CONTROL_WIDTH) / 2;

  const state: MainMenuState = {
    mode: 'offline',
    displayName: loadStoredDisplayName(),
    roomId: '',
    durationSeconds: 60,
  };

  const overlay = new Container();
  overlay.label = 'main-menu';
  parent.addChild(overlay);

  const title = new Text({
    text: 'FLAPPY PARTY!',
    resolution: DISPLAY_RESOLUTION,
    style: {
      fontFamily: UI_FONT_FAMILY,
      fontSize: 32,
      fontWeight: '900',
      fill: '#ffe08a',
      letterSpacing: 1.4,
      padding: 8,
      stroke: { color: 0x1c2b38, width: 2 },
      dropShadow: {
        alpha: 0.46,
        angle: 1.5708,
        blur: 0,
        color: 0x6b4e16,
        distance: 5,
      },
    },
  });
  title.anchor.set(0.5, 0);
  title.position.set(GAME_WIDTH / 2, 38);
  overlay.addChild(title);

  const subtitle = new Text({
    text: 'Bring friends. Flap hard. Own the room.',
    resolution: DISPLAY_RESOLUTION,
    style: {
      ...hintTextStyle,
      fontFamily: UI_FONT_FAMILY,
      fontSize: 10,
      fontWeight: '800',
      fill: 0xfff3cf,
      letterSpacing: 0.6,
      stroke: { color: 0x1c2b38, width: 1 },
    },
  });
  subtitle.anchor.set(0.5, 0);
  subtitle.position.set(GAME_WIDTH / 2, 84);
  overlay.addChild(subtitle);

  const panel = new Container();
  panel.position.set((GAME_WIDTH - PANEL_WIDTH) / 2, 180);
  overlay.addChild(panel);

  const nameLabel = createSectionLabel('PLAYER NAME');
  nameLabel.anchor.set(0.5, 0);
  nameLabel.position.set(PANEL_WIDTH / 2, 0);
  panel.addChild(nameLabel);

  const playerNameInput = createMenuInput(state.displayName, 'Player', PLAYER_NAME_MAX_LENGTH, {
    align: 'center',
    withBackground: false,
    width: playerNameInputWidth,
  });
  playerNameInput.position.set(controlOffsetX, 24);
  panel.addChild(playerNameInput);

  const playerNameUnderline = new Graphics();
  drawRoundedRect(playerNameUnderline, playerNameInputWidth - 20, 3, 999, 0xffe08a, 0.9, {
    color: 0x1c2b38,
    width: 1,
    alpha: 0.2,
  });
  playerNameUnderline.position.set(controlOffsetX + 10, 24 + INPUT_HEIGHT - 4);
  panel.addChild(playerNameUnderline);

  const randomNameButton = createUiButton('', randomButtonSize, randomButtonSize, 8, neutralButtonTheme);
  randomNameButton.view.position.set(controlOffsetX + playerNameInputWidth + randomButtonGap, 27);
  const randomNameIcon = new Sprite(diceTexture);
  randomNameIcon.anchor.set(0.5);
  randomNameIcon.width = 16;
  randomNameIcon.height = 16;
  randomNameIcon.position.set(randomButtonSize / 2, randomButtonSize / 2);
  randomNameButton.view.addChild(randomNameIcon);
  panel.addChild(randomNameButton.view);

  const menuButtons = new Container();
  menuButtons.position.set(controlOffsetX, 74);
  panel.addChild(menuButtons);

  const playButton = createUiButton('Play', CONTROL_WIDTH, PRIMARY_BUTTON_HEIGHT, 12, primaryButtonTheme);
  menuButtons.addChild(playButton.view);

  const optionsButton = createUiButton('Options', CONTROL_WIDTH, PRIMARY_BUTTON_HEIGHT, 10, neutralButtonTheme);
  optionsButton.view.position.set(0, PRIMARY_BUTTON_HEIGHT + compactButtonGap);
  menuButtons.addChild(optionsButton.view);

  const creditsButton = createUiButton('Credits', CONTROL_WIDTH, PRIMARY_BUTTON_HEIGHT, 10, neutralButtonTheme);
  creditsButton.view.position.set(0, (PRIMARY_BUTTON_HEIGHT + compactButtonGap) * 2);
  menuButtons.addChild(creditsButton.view);

  const status = new Text({
    text: '',
    resolution: DISPLAY_RESOLUTION,
    style: statusTextStyle,
  });
  status.anchor.set(0.5, 0);
  status.visible = false;
  overlay.addChild(status);

  const menuButton = createUiButton('Menu', MENU_BUTTON_WIDTH, MENU_BUTTON_HEIGHT, 14, neutralButtonTheme);
  menuButton.view.position.set(GAME_WIDTH - MENU_BUTTON_WIDTH - 12, 14);
  menuButton.view.visible = false;
  parent.addChild(menuButton.view);

  const playMenu = new Container();
  playMenu.visible = false;
  playMenu.position.set((GAME_WIDTH - playMenuWidth) / 2, 86);
  overlay.addChild(playMenu);

  const playMenuBackground = new Graphics();
  playMenu.addChild(playMenuBackground);

  const playMenuContent = new Container();
  playMenuContent.position.set(playMenuContentX, playMenuPaddingTop);
  playMenu.addChild(playMenuContent);

  const dialogDescription = new Text({
    text: 'Pick how you want to play. Party can create a room or join one with a room code.',
    resolution: DISPLAY_RESOLUTION,
    style: {
      ...bodyTextStyle,
      wordWrap: true,
      wordWrapWidth: CONTROL_WIDTH - 8,
    },
  });
  dialogDescription.position.set(0, 0);
  playMenuContent.addChild(dialogDescription);

  const modeLabel = new Text({
    text: 'GAME MODE',
    resolution: DISPLAY_RESOLUTION,
    style: dialogTitleStyle,
  });
  modeLabel.position.set(0, 64);
  playMenuContent.addChild(modeLabel);

  const modeRow = new Container();
  modeRow.position.set(0, 92);
  playMenuContent.addChild(modeRow);

  const roomLabel = createSectionLabel('ROOM CODE');
  roomLabel.position.set(0, 154);
  playMenuContent.addChild(roomLabel);

  const roomCodeInput = createMenuInput('', 'Leave blank to create', 12);
  roomCodeInput.position.set(0, 178);
  playMenuContent.addChild(roomCodeInput);

  const roomHint = new Text({
    text: 'Enter a code to join a party room. Leave it empty to create one, then set duration in the waiting room.',
    resolution: DISPLAY_RESOLUTION,
    style: {
      ...hintTextStyle,
      wordWrap: true,
      wordWrapWidth: CONTROL_WIDTH - 8,
    },
  });
  roomHint.position.set(0, 232);
  playMenuContent.addChild(roomHint);

  const playCancelButton = createUiButton('Cancel', actionButtonWidth, 36, 9, neutralButtonTheme);
  playCancelButton.view.position.set(0, 314);
  const playConfirmButton = createUiButton('Continue', actionButtonWidth, 36, 9, primaryButtonTheme);
  playConfirmButton.view.position.set(actionButtonWidth + actionButtonGap, 314);
  playMenuContent.addChild(playCancelButton.view, playConfirmButton.view);

  const modeButtons: Array<{ mode: GameMode; controller: UiButtonController }> = [];
  for (const [index, config] of MODE_CONFIGS.entries()) {
    const controller = createUiButton(
      config.label,
      MODE_BUTTON_WIDTH,
      MODE_BUTTON_HEIGHT,
      config.fontSize,
      MODE_INACTIVE_THEME,
    );
    controller.view.position.set(index * (MODE_BUTTON_WIDTH + MODE_BUTTON_SPACING), 0);
    modeRow.addChild(controller.view);
    modeButtons.push({ mode: config.mode, controller });
  }

  const setStatus = (message: string | null): void => {
    status.visible = message !== null;
    status.text = message ?? '';
  };

  const syncMenu = (): void => {
    state.roomId = roomCodeInput.value;
    drawRoundedRect(playMenuBackground, playMenuWidth, playMenuHeight, PANEL_RADIUS, 0x10293a, 0.96, {
      color: 0xffffff,
      width: 2,
      alpha: 0.14,
    });
    roomLabel.visible = state.mode === 'friends';
    roomCodeInput.visible = state.mode === 'friends';
    roomHint.visible = state.mode === 'friends';
    if (state.mode === 'offline') {
      playConfirmButton.setLabel('Start Solo');
    } else if (state.mode === 'free-for-all') {
      playConfirmButton.setLabel('Enter Arena');
    } else {
      playConfirmButton.setLabel(sanitizeRoomId(state.roomId) ? 'Join Party' : 'Open Room');
    }
    status.position.set(GAME_WIDTH / 2, playMenu.visible ? playMenu.y + playMenuHeight - 14 : panel.y + 208);

    for (const entry of modeButtons) {
      entry.controller.setTheme(entry.mode === state.mode ? MODE_BUTTON_THEMES[entry.mode] : MODE_INACTIVE_THEME);
    }
  };

  const closePlayMenu = (): void => {
    playMenu.visible = false;
    panel.visible = true;
    syncMenu();
  };

  const openPlayMenu = (): void => {
    playMenu.visible = true;
    panel.visible = false;
    syncMenu();
  };

  const open = (): void => {
    overlay.visible = true;
    menuButton.view.visible = false;
    closePlayMenu();
    setStatus(null);
    syncMenu();
    onOpen();
  };

  const close = (): void => {
    overlay.visible = false;
    menuButton.view.visible = true;
    closePlayMenu();
    setStatus(null);
  };

  playerNameInput.onChange.connect((value: string) => {
    state.displayName = clampDisplayName(value);
    if (state.displayName !== value) {
      playerNameInput.value = state.displayName;
    }
    storeDisplayName(state.displayName);
  });

  playerNameInput.onEnter.connect((value: string) => {
    state.displayName = clampDisplayName(sanitizeDisplayName(value));
    playerNameInput.value = state.displayName;
    storeDisplayName(state.displayName);
  });

  randomNameButton.button.onPress.connect(() => {
    state.displayName = pickRandomDisplayName(state.displayName);
    playerNameInput.value = state.displayName;
    storeDisplayName(state.displayName);
  });

  roomCodeInput.onChange.connect((value: string) => {
    state.roomId = value;
    syncMenu();
  });

  roomCodeInput.onEnter.connect((value: string) => {
    state.roomId = sanitizeRoomId(value);
    roomCodeInput.value = state.roomId;
    syncMenu();
  });

  for (const entry of modeButtons) {
    entry.controller.button.onPress.connect(() => {
      state.mode = entry.mode;
      syncMenu();
    });
  }

  playButton.button.onPress.connect(() => {
    state.displayName = clampDisplayName(sanitizeDisplayName(state.displayName));
    playerNameInput.value = state.displayName;
    storeDisplayName(state.displayName);
    openPlayMenu();
  });

  optionsButton.button.onPress.connect(() => {
    setStatus('Options belum dibuat.');
  });

  creditsButton.button.onPress.connect(() => {
    setStatus('Credits belum dibuat.');
  });

  playCancelButton.button.onPress.connect(() => {
    closePlayMenu();
  });

  playConfirmButton.button.onPress.connect(() => {
    state.displayName = clampDisplayName(sanitizeDisplayName(state.displayName));
    state.roomId = sanitizeRoomId(roomCodeInput.value);
    playerNameInput.value = state.displayName;
    roomCodeInput.value = state.roomId;
    storeDisplayName(state.displayName);
    closePlayMenu();

    onStart({
      mode: state.mode,
      displayName: state.displayName,
      roomId: state.mode === 'friends' ? state.roomId : '',
      durationSeconds: state.durationSeconds,
    });
  });

  menuButton.button.onPress.connect(open);

  syncMenu();

  return {
    open,
    close,
    setStatus,
    isOpen: () => overlay.visible,
  };
};