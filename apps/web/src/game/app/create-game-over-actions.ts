type CreateGameOverActionsParams = {
  parent: HTMLElement;
  onRestart: () => void;
};

export type GameOverActionsController = {
  setVisible: (visible: boolean) => void;
  setScreenshotSrc: (src: string | null) => void;
};

const downloadImageSrc = (src: string): void => {
  const link = document.createElement('a');
  link.href = src;
  link.download = `flappy-death-${Date.now()}.png`;
  link.click();
};

export const createGameOverActions = ({
  parent,
  onRestart,
}: CreateGameOverActionsParams): GameOverActionsController => {
  const screenshotImage = document.createElement('img');
  screenshotImage.className = 'share-buffer-image';
  screenshotImage.alt = '';
  screenshotImage.hidden = true;
  parent.appendChild(screenshotImage);

  const actions = document.createElement('div');
  actions.className = 'game-over-actions';
  actions.hidden = true;
  parent.appendChild(actions);

  const restartButton = document.createElement('button');
  restartButton.type = 'button';
  restartButton.className = 'game-over-button restart-button';
  restartButton.textContent = 'Restart';
  actions.appendChild(restartButton);

  const shareButton = document.createElement('button');
  shareButton.type = 'button';
  shareButton.className = 'game-over-button share-button';
  shareButton.textContent = 'Share';
  shareButton.disabled = true;
  actions.appendChild(shareButton);

  restartButton.addEventListener('click', onRestart);

  shareButton.addEventListener('click', () => {
    const screenshotSrc = screenshotImage.currentSrc || screenshotImage.src;
    if (!screenshotSrc) return;
    downloadImageSrc(screenshotSrc);
  });

  return {
    setVisible: (visible: boolean) => {
      actions.hidden = !visible;
    },
    setScreenshotSrc: (src: string | null) => {
      screenshotImage.src = src ?? '';
      shareButton.disabled = src === null;
    },
  };
};