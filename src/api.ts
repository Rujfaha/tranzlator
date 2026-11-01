import type { AiSettings } from "./providers";

export const LANGS = ["th", "en", "ja", "zh", "ko", "vi", "id"] as const;
export type Lang = (typeof LANGS)[number];
// Copied from worker/db.ts on purpose: the app never imports worker code.
export type Result = { context: string; text: string; note: string; custom: boolean };
export type TranslateResponse = { id: string; sourceLang: string; results: Result[] };

const BASE = process.env.EXPO_PUBLIC_API_URL ?? ""; // empty on web: same-origin relative path
const NETWORK_ERROR = "เชื่อมต่อไม่ได้ ตรวจอินเทอร์เน็ตแล้วลองใหม่";
const FAILED = "แปลไม่สำเร็จ กดแปลอีกครั้ง";

async function post<T>(path: string, ai: AiSettings, body: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(BASE + path, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "X-AI-Provider": ai.provider,
        "X-AI-Key": ai.key,
        "X-AI-Model": ai.model,
      },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error(NETWORK_ERROR);
  }
  const data = (await res.json().catch(() => null)) as { error?: unknown } | null;
  if (!res.ok) throw new Error(typeof data?.error === "string" ? data.error : FAILED);
  return data as T;
}

export const translate = (ai: AiSettings, text: string, target: Lang) =>
  post<TranslateResponse>("/api/translate", ai, { text, target });

export const addContext = (ai: AiSettings, id: string, context: string) =>
  post<Result>(`/api/translate/${id}/contexts`, ai, { context });
