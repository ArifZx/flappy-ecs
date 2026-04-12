export const UI_FONT_FAMILY = '"Nunito"';

export const ensureUiFontLoaded = async (): Promise<void> => {
  if (typeof document === 'undefined' || !('fonts' in document)) {
    return;
  }

  await Promise.all([
    document.fonts.load(`400 16px ${UI_FONT_FAMILY}`),
    document.fonts.load(`700 24px ${UI_FONT_FAMILY}`),
    document.fonts.load(`900 36px ${UI_FONT_FAMILY}`),
  ]);
};