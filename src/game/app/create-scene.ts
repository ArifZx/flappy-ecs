import { Container, Sprite, Text } from 'pixi.js';
import type { Spritesheet } from 'pixi.js';

import { GAME_HEIGHT, GAME_WIDTH, GROUND_Y } from '../config/constants';
import {
  createBackground,
  type BackgroundController,
} from '../ui/background';

export type GameScene = {
  container: Container;
  background: BackgroundController;
  pipesLayer: Container;
  birdLayer: Container;
  groundA: Sprite;
  groundB: Sprite;
  pointsText: Text;
  hintText: Text;
  gameOverSprite: Sprite;
};

export const createGameScene = (sheet: Spritesheet): GameScene => {
  const container = new Container();

  const background = createBackground(sheet, GAME_WIDTH, GAME_HEIGHT);
  container.addChild(background.container);

  const pipesLayer = new Container();
  const birdLayer = new Container();
  container.addChild(pipesLayer, birdLayer);

  const groundA = new Sprite(sheet.textures.base);
  const groundB = new Sprite(sheet.textures.base);
  groundA.anchor.set(0, 0);
  groundB.anchor.set(0, 0);
  groundA.position.set(0, GROUND_Y);
  groundB.position.set(groundA.width, GROUND_Y);
  container.addChild(groundA, groundB);

  const pointsText = new Text({
    text: '0',
    style: {
      fontFamily: 'Arial',
      fontSize: 36,
      fill: 0xffffff,
      stroke: { color: 0x000000, width: 4 },
    },
  });
  pointsText.anchor.set(0.5, 0);
  pointsText.position.set(GAME_WIDTH / 2, 16);
  container.addChild(pointsText);

  const hintText = new Text({
    text: 'Click or press Space to flap',
    style: {
      fontFamily: 'Arial',
      fontSize: 16,
      fill: 0xffffff,
      stroke: { color: 0x000000, width: 3 },
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
    birdLayer,
    groundA,
    groundB,
    pointsText,
    hintText,
    gameOverSprite,
  };
};
