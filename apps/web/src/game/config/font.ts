export const UI_FONT_FAMILY = '"Press Start 2P"';

export const ensureUiFontLoaded = async (): Promise<void> => {
  if (typeof document === 'undefined' || !('fonts' in document)) {
    return;
  }

  await Promise.all([
    document.fonts.load(`16px ${UI_FONT_FAMILY}`),
    document.fonts.load(`24px ${UI_FONT_FAMILY}`),
    document.fonts.load(`36px ${UI_FONT_FAMILY}`),
  ]);
};