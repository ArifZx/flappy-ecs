import { Sprite } from 'pixi.js';
import type { Spritesheet } from 'pixi.js';

export const createBackground = (
  sheet: Spritesheet,
  gameWidth: number,
  gameHeight: number,
): Sprite => {
  const background = new Sprite(sheet.textures['background-day']);
  background.anchor.set(0.5);
  background.position.set(gameWidth / 2, gameHeight / 2);
  return background;
};