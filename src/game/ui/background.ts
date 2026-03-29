import { Container, Sprite } from 'pixi.js';
import type { Spritesheet } from 'pixi.js';

const BACKGROUND_FADE_SPEED = 1.8;

export type BackgroundController = {
  container: Container;
  setNightTarget: (isNight: boolean) => void;
  update: (dt: number) => void;
  reset: () => void;
};

export const createBackground = (
  sheet: Spritesheet,
  gameWidth: number,
  gameHeight: number,
): BackgroundController => {
  const container = new Container();

  const daySprite = new Sprite(sheet.textures['background-day']);
  daySprite.anchor.set(0.5);
  daySprite.position.set(gameWidth / 2, gameHeight / 2);

  const nightSprite = new Sprite(sheet.textures['background-night']);
  nightSprite.anchor.set(0.5);
  nightSprite.position.set(gameWidth / 2, gameHeight / 2);
  nightSprite.alpha = 0;

  container.addChild(daySprite, nightSprite);

  let nightTargetAlpha = 0;

  const setNightTarget = (isNight: boolean): void => {
    nightTargetAlpha = isNight ? 1 : 0;
  };

  const update = (dt: number): void => {
    const step = Math.min(1, dt * BACKGROUND_FADE_SPEED);
    nightSprite.alpha += (nightTargetAlpha - nightSprite.alpha) * step;
  };

  const reset = (): void => {
    nightTargetAlpha = 0;
    nightSprite.alpha = 0;
  };

  return {
    container,
    setNightTarget,
    update,
    reset,
  };
};