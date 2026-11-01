import type { Lang } from "../api";

export const MAX_SOURCE = 2000;
// Pure (no Reanimated) so the Workers test pool can import them; motion.ts re-exports these as durations.
export const TOAST_MS = 4000;
export const TOAST_LONG_MS = 6000;

// Source text shrinks as it grows, like the Google Translate input.
export const sourceSize = (length: number) => (length <= 40 ? "source-lg" : length <= 160 ? "source-md" : "source-sm");

export const clampPaste = (s: string) => s.slice(0, MAX_SOURCE);

// Most-recent-first list of target languages shown as tabs: an existing one keeps its place.
export const pushRecent = (recents: Lang[], lang: Lang): Lang[] =>
  recents.includes(lang) ? recents : [lang, ...recents].slice(0, 3);

export const toastDuration = (kind: "success" | "error" | "info", hasAction: boolean) =>
  kind === "success" && !hasAction ? TOAST_MS : TOAST_LONG_MS;
