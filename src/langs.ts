import { isLang, type Lang } from "../shared/languages";

export type SavedLangs = { target: Lang; recents: Lang[] }; // recents: the target tabs, most recent first (max 3)

export const DEFAULT_LANGS: SavedLangs = { target: "en", recents: ["en", "th", "ja"] };

// A saved value that is not exactly what the app writes (bad JSON, a code we no longer know) is dropped, not repaired.
export function parseLangs(raw: string | null): SavedLangs {
  try {
    const s = JSON.parse(raw ?? "");
    const r = s.recents;
    if (
      isLang(s.target) && Array.isArray(r) && r.length >= 1 && r.length <= 3 &&
      r.every((c: unknown) => typeof c === "string" && isLang(c)) && new Set(r).size === r.length && r.includes(s.target)
    ) {
      return { target: s.target, recents: [...r] };
    }
  } catch {}
  return { target: DEFAULT_LANGS.target, recents: [...DEFAULT_LANGS.recents] };
}
