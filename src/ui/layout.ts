export const WIDE_MIN = 768; // keep in sync with `screens.wide` in tailwind.config.js

export const isWide = (width: number) => width >= WIDE_MIN;
