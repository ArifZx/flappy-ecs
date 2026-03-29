type CreateShareButtonParams = {
  parent: HTMLElement;
};

export type ShareButtonController = {
  setVisible: (visible: boolean) => void;
  setScreenshotSrc: (src: string | null) => void;
};

const downloadImageSrc = (src: string): void => {
  const link = document.createElement('a');
  link.href = src;
  link.download = `flappy-death-${Date.now()}.png`;
  link.click();
};

export const createShareButton = ({ parent }: CreateShareButtonParams): ShareButtonController => {
  const screenshotImage = document.createElement('img');
  screenshotImage.className = 'share-buffer-image';
  screenshotImage.alt = '';
  screenshotImage.hidden = true;
  parent.appendChild(screenshotImage);

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'share-button';
  button.textContent = 'Share Screenshot';
  button.hidden = true;
  button.disabled = true;
  parent.appendChild(button);

  button.addEventListener('click', () => {
    const screenshotSrc = screenshotImage.currentSrc || screenshotImage.src;
    if (!screenshotSrc) return;
    downloadImageSrc(screenshotSrc);
  });

  return {
    setVisible: (visible: boolean) => {
      button.hidden = !visible;
    },
    setScreenshotSrc: (src: string | null) => {
      screenshotImage.src = src ?? '';
      button.disabled = src === null;
    },
  };
};