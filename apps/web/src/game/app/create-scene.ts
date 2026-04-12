import { Container, Sprite, Text } from 'pixi.js';
import type { Spritesheet } from 'pixi.js';

import { GAME_HEIGHT, GAME_WIDTH, GROUND_Y } from '../config/constants';
import { DISPLAY_RESOLUTION } from '../config/display';
import { UI_FONT_FAMILY } from '../config/font';
import {
  createBackground,
  type BackgroundController,
} from '../ui/background';

export type GameScene = {
  container: Container;
  background: BackgroundController;
  pipesLayer: Container;
  remoteBirdLayer: Container;
  birdLayer: Container;
  groundA: Sprite;
  groundB: Sprite;
  pointsText: Text;
  partyHudText: Text;
  countdownSplashLabelText: Text;
  countdownSplashNumberText: Text;
  hintText: Text;
  gameOverSprite: Sprite;
};

export const createGameScene = (sheet: Spritesheet): GameScene => {
  const container = new Container();

  const background = createBackground(sheet, GAME_WIDTH, GAME_HEIGHT);
  container.addChild(background.container);

  const pipesLayer = new Container();
  const remoteBirdLayer = new Container();
  const birdLayer = new Container();
  container.addChild(pipesLayer, remoteBirdLayer, birdLayer);

  const groundA = new Sprite(sheet.textures.base);
  const groundB = new Sprite(sheet.textures.base);
  groundA.anchor.set(0, 0);
  groundB.anchor.set(0, 0);
  groundA.position.set(0, GROUND_Y);
  groundB.position.set(groundA.width, GROUND_Y);
  container.addChild(groundA, groundB);

  const pointsText = new Text({
    text: '0',
    resolution: DISPLAY_RESOLUTION,
    style: {
      fontFamily: UI_FONT_FAMILY,
      fontSize: 22,
      padding: 10,
      fill: 0xf6efc2,
      stroke: { color: 0x1b2530, width: 1 },
    },
  });
  pointsText.anchor.set(0.5, 0);
  pointsText.position.set(GAME_WIDTH / 2, 16);
  container.addChild(pointsText);

  const partyHudText = new Text({
    text: 'PARTY TIME!\n0',
    resolution: DISPLAY_RESOLUTION,
    style: {
      fontFamily: UI_FONT_FAMILY,
      fontSize: 12,
      fontWeight: '700',
      align: 'center',
      padding: 6,
      fill: 0xf6efc2,
      stroke: { color: 0x1b2530, width: 1 },
    },
  });
  partyHudText.anchor.set(0.5, 0);
  partyHudText.position.set(GAME_WIDTH / 2, 16);
  partyHudText.visible = false;
  container.addChild(partyHudText);

  const countdownSplashLabelText = new Text({
    text: 'STARTING',
    resolution: DISPLAY_RESOLUTION,
    style: {
      fontFamily: UI_FONT_FAMILY,
      fontSize: 14,
      fontWeight: '900',
      align: 'center',
      letterSpacing: 2,
      padding: 6,
      fill: 0xffcf57,
      stroke: { color: 0x472400, width: 3 },
    },
  });
  countdownSplashLabelText.anchor.set(0.5);
  countdownSplashLabelText.position.set(GAME_WIDTH / 2, GAME_HEIGHT * 0.28);
  countdownSplashLabelText.visible = false;
  container.addChild(countdownSplashLabelText);

  const countdownSplashNumberText = new Text({
    text: '3',
    resolution: DISPLAY_RESOLUTION,
    style: {
      fontFamily: UI_FONT_FAMILY,
      fontSize: 74,
      fontWeight: '900',
      align: 'center',
      padding: 12,
      fill: 0xfff8dc,
      stroke: { color: 0x1b2530, width: 7 },
      dropShadow: {
        alpha: 0.45,
        angle: Math.PI / 2,
        blur: 0,
        color: 0xff7a00,
        distance: 8,
      },
    },
  });
  countdownSplashNumberText.anchor.set(0.5);
  countdownSplashNumberText.position.set(GAME_WIDTH / 2, GAME_HEIGHT * 0.38);
  countdownSplashNumberText.visible = false;
  container.addChild(countdownSplashNumberText);

  const hintText = new Text({
    text: 'Click or press Space\nto flap',
    resolution: DISPLAY_RESOLUTION,
    style: {
      fontFamily: UI_FONT_FAMILY,
      fontSize: 9,
      align: 'center',
      fill: 0xf0e7bc,
      stroke: { color: 0x1b2530, width: 3 },
    },
  });
  hintText.anchor.set(0.5, 0.5);
  hintText.position.set(GAME_WIDTH / 2, GAME_HEIGHT * 0.2);
  container.addChild(hintText);

  const gameOverSprite = new Sprite(sheet.textures.gameover);
  gameOverSprite.anchor.set(0.5);
  gameOverSprite.position.set(GAME_WIDTH / 2, GAME_HEIGHT * 0.32);
  gameOverSprite.visible = false;
  container.addChild(gameOverSprite);

  return {
    container,
    background,
    pipesLayer,
    remoteBirdLayer,
    birdLayer,
    groundA,
    groundB,
    pointsText,
    partyHudText,
    countdownSplashLabelText,
    countdownSplashNumberText,
    hintText,
    gameOverSprite,
  };
};
