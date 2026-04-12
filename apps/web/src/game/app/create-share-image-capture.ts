import { Rectangle } from 'pixi.js';
import type { Application } from 'pixi.js';
import QrCreator from 'qr-creator';

import { GAME_HEIGHT, GAME_WIDTH } from '../config/constants';
import { UI_FONT_FAMILY } from '../config/font';
import type { GameScene } from './create-scene';
import type { GameRuntimeController } from './create-game-runtime';

type CreateShareImageCaptureParams = {
  app: Application;
  scene: GameScene;
  runtime: GameRuntimeController;
  shareUrl: string;
  logoSrc?: string | null;
};

type ComposeShareImageParams = {
  viewportCanvas: HTMLCanvasElement;
  scene: GameScene;
  tally: number;
  shareUrl: string;
  logoImage: CanvasImageSource | null;
};

const SHARE_WIDTH = 1080;
const SHARE_HEIGHT = 1080;
const SHARE_ASPECT_RATIO = 1 / 1;
const SHARE_ZOOM = 1.04;
const SHARE_BRAND_TITLE = 'FLAPPY PARTY!';

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const drawRoundRect = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void => {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.lineTo(x + width - radius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + radius);
  context.lineTo(x + width, y + height - radius);
  context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  context.lineTo(x + radius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - radius);
  context.lineTo(x, y + radius);
  context.quadraticCurveTo(x, y, x + radius, y);
  context.closePath();
};

const drawValueBadge = (context: CanvasRenderingContext2D, tally: number): void => {
  const badgeWidth = 420;
  const badgeHeight = 116;
  const badgeX = (SHARE_WIDTH - badgeWidth) * 0.5;
  const badgeY = 48;
  const badgeRadius = 36;
  const valueY = badgeY + badgeHeight * 0.5;

  context.save();
  context.fillStyle = 'rgba(13, 18, 28, 0.72)';
  drawRoundRect(context, badgeX, badgeY, badgeWidth, badgeHeight, badgeRadius);
  context.fill();

  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillStyle = '#ffffff';
  context.strokeStyle = 'rgba(0, 0, 0, 0.42)';
  context.lineWidth = 12;
  context.lineJoin = 'round';
  context.font = `900 64px ${UI_FONT_FAMILY}, monospace`;
  const valueText = String(tally);
  context.strokeText(valueText, SHARE_WIDTH * 0.5, valueY);
  context.fillText(valueText, SHARE_WIDTH * 0.5, valueY);
  context.restore();
};

const drawQrCard = (context: CanvasRenderingContext2D, shareUrl: string): void => {
  const cardWidth = 224;
  const cardHeight = 262;
  const cardX = SHARE_WIDTH - cardWidth - 48;
  const cardY = SHARE_HEIGHT - cardHeight - 56;
  const cardRadius = 30;
  const qrSize = 164;
  const qrX = cardX + (cardWidth - qrSize) * 0.5;
  const qrY = cardY + 22;

  const qrCanvas = document.createElement('canvas');
  qrCanvas.width = qrSize;
  qrCanvas.height = qrSize;

  QrCreator.render(
    {
      text: shareUrl,
      ecLevel: 'H',
      radius: 0.1,
      fill: '#101418',
      background: '#ffffff',
      size: qrSize,
    },
    qrCanvas,
  );

  context.save();
  context.fillStyle = 'rgba(255, 255, 255, 0.7)';
  drawRoundRect(context, cardX, cardY, cardWidth, cardHeight, cardRadius);
  context.fill();

  context.drawImage(qrCanvas, qrX, qrY, qrSize, qrSize);

  context.textAlign = 'center';
  context.fillStyle = '#101418';
  context.font = `700 24px ${UI_FONT_FAMILY}, monospace`;
  context.fillText('Scan to play', cardX + cardWidth * 0.5, cardY + 218);
  context.restore();
};

const loadShareLogoImage = async (logoSrc?: string | null): Promise<HTMLImageElement | null> => {
  if (!logoSrc) {
    return null;
  }

  const image = new Image();
  image.decoding = 'async';
  image.src = logoSrc;

  if (typeof image.decode === 'function') {
    try {
      await image.decode();
      return image;
    } catch {
      return null;
    }
  }

  return await new Promise<HTMLImageElement | null>((resolve) => {
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
  });
};

const drawShareLogo = (context: CanvasRenderingContext2D, logoImage: CanvasImageSource): void => {
  const logoFrameSize = 112;
  const logoSize = 112;
  const logoX = 48;
  const logoY = SHARE_HEIGHT - logoFrameSize - 56;
  const logoRadius = 34;

  context.save();
  context.fillStyle = 'rgba(255, 255, 255, 0.1)';
  drawRoundRect(context, logoX, logoY, logoFrameSize, logoFrameSize, logoRadius);
  context.fill();

  context.drawImage(
    logoImage,
    logoX + (logoFrameSize - logoSize) * 0.5,
    logoY + (logoFrameSize - logoSize) * 0.5,
    logoSize,
    logoSize,
  );
  context.restore();
};

const drawShareBrand = (context: CanvasRenderingContext2D): void => {
  const brandX = 184;
  const brandY = SHARE_HEIGHT - 112;
  const subtitle = 'Tap in. Flap hard. Party louder.';

  context.save();
  context.textAlign = 'left';
  context.textBaseline = 'middle';
  context.fillStyle = '#f8efc7';
  context.strokeStyle = 'rgba(18, 25, 34, 0.92)';
  context.lineJoin = 'round';
  context.lineCap = 'round';
  context.shadowColor = 'rgba(8, 18, 29, 0.8)';
  context.shadowBlur = 0;
  context.shadowOffsetX = 0;
  context.shadowOffsetY = 4;
  context.font = `900 48px ${UI_FONT_FAMILY}, sans-serif`;
  context.lineWidth = 10;
  context.strokeText(SHARE_BRAND_TITLE, brandX, brandY);
  context.fillText(SHARE_BRAND_TITLE, brandX, brandY);

  context.shadowColor = 'transparent';
  context.fillStyle = 'rgba(248, 239, 199, 0.86)';
  context.font = `700 22px ${UI_FONT_FAMILY}, sans-serif`;
  context.lineWidth = 6;
  context.strokeText(subtitle, brandX, brandY + 50);
  context.fillText(subtitle, brandX, brandY + 50);
  context.restore();
};

const captureViewportCanvas = (app: Application, scene: GameScene): HTMLCanvasElement => {
  const previousPointsVisible = scene.pointsText.visible;
  const previousHintVisible = scene.hintText.visible;
  const previousGameOverVisible = scene.gameOverSprite.visible;

  scene.pointsText.visible = false;
  scene.hintText.visible = false;
  scene.gameOverSprite.visible = false;

  try {
    const extractedCanvas = app.renderer.extract.canvas({
      target: scene.container,
      frame: new Rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT),
      resolution: 1,
    });

    if (!(extractedCanvas instanceof HTMLCanvasElement)) {
      throw new Error('Share image capture requires an HTMLCanvasElement renderer target.');
    }

    return extractedCanvas;
  } finally {
    scene.pointsText.visible = previousPointsVisible;
    scene.hintText.visible = previousHintVisible;
    scene.gameOverSprite.visible = previousGameOverVisible;
  }
};

const composeShareImage = ({
  viewportCanvas,
  scene,
  tally,
  shareUrl,
  logoImage,
}: ComposeShareImageParams): string | null => {
  const outputCanvas = document.createElement('canvas');
  outputCanvas.width = SHARE_WIDTH;
  outputCanvas.height = SHARE_HEIGHT;

  const outputContext = outputCanvas.getContext('2d');
  if (!outputContext) {
    return null;
  }

  const birdSprite = scene.birdLayer.children[0];
  const birdCenterY = birdSprite ? birdSprite.y : GAME_HEIGHT * 0.5;
  const sourceWidth = GAME_WIDTH / SHARE_ZOOM;
  const sourceHeight = sourceWidth / SHARE_ASPECT_RATIO;
  const sourceX = clamp((GAME_WIDTH - sourceWidth) * 0.5, 0, GAME_WIDTH - sourceWidth);
  const sourceY = clamp(birdCenterY - sourceHeight * 0.5, 0, GAME_HEIGHT - sourceHeight);

  outputContext.imageSmoothingEnabled = true;
  outputContext.fillStyle = '#000000';
  outputContext.fillRect(0, 0, SHARE_WIDTH, SHARE_HEIGHT);
  outputContext.drawImage(
    viewportCanvas,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    0,
    0,
    SHARE_WIDTH,
    SHARE_HEIGHT,
  );

  drawValueBadge(outputContext, tally);
  drawQrCard(outputContext, shareUrl);
  if (logoImage) {
    drawShareLogo(outputContext, logoImage);
  }
  drawShareBrand(outputContext);

  return outputCanvas.toDataURL('image/png');
};

export const createShareImageCapture = ({
  app,
  scene,
  runtime,
  shareUrl,
  logoSrc,
}: CreateShareImageCaptureParams) => async (): Promise<string | null> => {
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => resolve());
  });

  const viewportCanvas = captureViewportCanvas(app, scene);
  const logoImage = await loadShareLogoImage(logoSrc);

  return composeShareImage({
    viewportCanvas,
    scene,
    tally: runtime.peek(),
    shareUrl,
    logoImage,
  });
};