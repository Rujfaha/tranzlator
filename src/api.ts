import type { Lang } from "../shared/languages";
import type { AiSettings } from "./providers";

export type { Lang };
// Copied from worker/db.ts on purpose: the app never imports worker code.
export type Result = { context: string; text: string; note: string; custom: boolean };
export type TranslateResponse = { id: string; sourceLang: string; results: Result[] };

const BASE = process.env.EXPO_PUBLIC_API_URL ?? ""; // empty on web: same-origin relative path
const NETWORK_ERROR = "เชื่อมต่อไม่ได้ ตรวจอินเทอร์เน็ตแล้วลองใหม่";
const FAILED = "แปลไม่สำเร็จ กดแปลอีกครั้ง";

// A non-2xx response. `status` lets the UI offer "open settings" on 401; network errors are plain Errors without it.
export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

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
  if (!res.ok) throw new ApiError(typeof data?.error === "string" ? data.error : FAILED, res.status);
  return data as T;
}

export const translate = (ai: AiSettings, text: string, target: Lang) =>
  post<TranslateResponse>("/api/translate", ai, { text, target });

export const addContext = (ai: AiSettings, id: string, context: string) =>
  post<Result>(`/api/translate/${id}/contexts`, ai, { context });
