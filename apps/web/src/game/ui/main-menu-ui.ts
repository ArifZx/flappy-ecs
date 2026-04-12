import type { GameMode } from '@flappy/shared';
import { FancyButton, Input } from '@pixi/ui';
import { Graphics, Text } from 'pixi.js';

import { GAME_WIDTH } from '../config/constants';
import { DISPLAY_RESOLUTION } from '../config/display';
import { UI_FONT_FAMILY } from '../config/font';

export type ButtonTheme = {
  fill: number;
  textColor: number;
  borderAlpha: number;
  alpha: number;
};

export type ButtonThemeSet = {
  idle: ButtonTheme;
  hover: ButtonTheme;
  pressed: ButtonTheme;
};

export type UiButtonController = {
  button: FancyButton;
  view: FancyButton;
  setLabel: (label: string) => void;
  setTheme: (theme: ButtonThemeSet) => void;
};

export type MainMenuState = {
  mode: GameMode;
  displayName: string;
  roomId: string;
  durationSeconds: number;
};

type MenuInputAlign = 'left' | 'center' | 'right';

type MenuInputOptions = {
  align?: MenuInputAlign;
  withBackground?: boolean;
};

export const PANEL_WIDTH = 220;
export const PANEL_RADIUS = 28;
export const CONTROL_WIDTH = PANEL_WIDTH - 28;
export const INPUT_HEIGHT = 38;
export const PRIMARY_BUTTON_HEIGHT = 42;
export const MODE_BUTTON_SPACING = 6;
export const MODE_BUTTON_WIDTH = Math.floor((CONTROL_WIDTH - MODE_BUTTON_SPACING * 2) / 3);
export const MODE_BUTTON_HEIGHT = 40;
export const DIALOG_HEIGHT = 276;
export const MENU_BUTTON_WIDTH = 84;
export const MENU_BUTTON_HEIGHT = 34;
export const DURATION_OPTIONS = [45, 60, 90, 120] as const;

export const MODE_CONFIGS: Array<{ mode: GameMode; label: string; fontSize: number }> = [
  { mode: 'offline', label: 'Solo', fontSize: 9 },
  { mode: 'free-for-all', label: 'Arena', fontSize: 8 },
  { mode: 'friends', label: 'Party', fontSize: 8 },
];

const sectionTextStyle = {
  fontFamily: UI_FONT_FAMILY,
  fontSize: 9,
  fontWeight: '700',
  fill: 0xf2e8b6,
  letterSpacing: 0,
  padding: 2,
  stroke: { color: 0x163447, width: 1 },
} as const;

const inputTextStyle = {
  fontFamily: UI_FONT_FAMILY,
  fontSize: 10,
  fontWeight: '700',
  fill: 0xf4efcf,
  align: 'center',
} as const;

export const bodyTextStyle = {
  fontFamily: UI_FONT_FAMILY,
  fontSize: 8,
  fill: 0xece7c9,
  stroke: { color: 0x10202b, width: 1 },
} as const;

export const hintTextStyle = {
  fontFamily: UI_FONT_FAMILY,
  fontSize: 8,
  fill: 0xb8d4d8,
  align: 'center',
  stroke: { color: 0x10202b, width: 1 },
} as const;

export const dialogTitleStyle = {
  fontFamily: UI_FONT_FAMILY,
  fontSize: 10,
  fontWeight: '700',
  fill: 0xf7ecae,
  stroke: { color: 0x10202b, width: 1 },
} as const;

export const statusTextStyle = {
  fontFamily: UI_FONT_FAMILY,
  fontSize: 9,
  fill: 0xffefb3,
  align: 'center',
  wordWrap: true,
  wordWrapWidth: GAME_WIDTH - 36,
  stroke: { color: 0x1a1f22, width: 2 },
} as const;

export const neutralButtonTheme: ButtonThemeSet = {
  idle: { fill: 0x1a3a4f, textColor: 0xefe8c8, borderAlpha: 0.2, alpha: 0.94 },
  hover: { fill: 0x24506d, textColor: 0xf7f0cd, borderAlpha: 0.34, alpha: 1 },
  pressed: { fill: 0x10273a, textColor: 0xe6ddb7, borderAlpha: 0.4, alpha: 1 },
};

export const primaryButtonTheme: ButtonThemeSet = {
  idle: { fill: 0xffc443, textColor: 0x4a2600, borderAlpha: 0.16, alpha: 0.98 },
  hover: { fill: 0xffd46f, textColor: 0x412100, borderAlpha: 0.26, alpha: 1 },
  pressed: { fill: 0xe6ac25, textColor: 0x351a00, borderAlpha: 0.3, alpha: 1 },
};

export const modeButtonInactiveTheme: ButtonThemeSet = {
  idle: { fill: 0x173447, textColor: 0xe8e0bc, borderAlpha: 0.18, alpha: 0.92 },
  hover: { fill: 0x214d69, textColor: 0xf3ebc6, borderAlpha: 0.3, alpha: 1 },
  pressed: { fill: 0x0f2736, textColor: 0xdfd5ac, borderAlpha: 0.34, alpha: 1 },
};

export const modeButtonThemes: Record<GameMode, ButtonThemeSet> = {
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

export const drawRoundedRect = (
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

const createButtonLabel = (text: string, fontSize: number, fill: number, wrapWidth: number): Text => {
  const label = new Text({
    text,
    resolution: DISPLAY_RESOLUTION,
    style: {
      fontFamily: UI_FONT_FAMILY,
      fontSize,
      fontWeight: '700',
      fill,
      align: 'center',
      wordWrap: true,
      wordWrapWidth: wrapWidth,
      breakWords: true,
      stroke: { color: 0x1a2f3e, width: 2 },
    },
  });
  label.anchor.set(0.5);
  return label;
};

export const createUiButton = (
  label: string,
  width: number,
  height: number,
  fontSize: number,
  themeSet: ButtonThemeSet,
): UiButtonController => {
  const textView = createButtonLabel(label, fontSize, themeSet.idle.textColor, Math.max(24, width - 18));
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

const createInputBackground = (
  width: number,
  height: number,
  strokeAlpha = 0.16,
  fillAlpha = 0.94,
): Graphics => {
  const background = new Graphics();
  drawRoundedRect(background, width, height, 18, 0x10293a, fillAlpha, {
    color: 0xffffff,
    width: 2,
    alpha: strokeAlpha,
  });
  return background;
};

export const createSectionLabel = (text: string): Text =>
  new Text({
    text,
    resolution: DISPLAY_RESOLUTION,
    style: sectionTextStyle,
  });

export const createMenuInput = (
  value: string,
  placeholder: string,
  maxLength: number,
  options: MenuInputOptions = {},
): Input => {
  const {
    align = 'left',
    withBackground = true,
  } = options;

  const input = new Input({
    bg: createInputBackground(
      CONTROL_WIDTH,
      INPUT_HEIGHT,
      withBackground ? 0.16 : 0,
      withBackground ? 0.94 : 0,
    ),
    value,
    placeholder,
    maxLength,
    align,
    addMask: true,
    padding: align === 'center'
      ? { top: 10, right: 0, bottom: 10, left: 0 }
      : { top: 10, right: 12, bottom: 10, left: 12 },
    textStyle: inputTextStyle,
  });
  input.width = CONTROL_WIDTH;
  input.height = INPUT_HEIGHT;
  return input;
};

export const sanitizeDisplayName = (value: string): string => value.trim() || 'Player';

export const sanitizeRoomId = (value: string): string => value.trim().toUpperCase();

export const MODE_INACTIVE_THEME = modeButtonInactiveTheme;

export const MODE_BUTTON_THEMES = modeButtonThemes;
