export const DISPLAY_RESOLUTION =
  typeof window === 'undefined' ? 2 : Math.max(2, Math.ceil(window.devicePixelRatio || 1));