export const WIDE_MIN = 768; // keep in sync with `screens.wide` in tailwind.config.js

export const isWide = (width: number) => width >= WIDE_MIN;

// BottomDock height without the safe-area inset: 1 (border) + 12 + 48 (language pill) + 8 + 52 (translate button) + 12. Toasts sit above it.
export const DOCK_HEIGHT = 133;
