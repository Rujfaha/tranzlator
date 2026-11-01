import { isLang, type Lang } from "../shared/languages";
import type { AiConfig } from "./env";

export type { Lang };
export const PROVIDERS = ["anthropic", "gemini", "openai", "openrouter"] as const;
export type Provider = (typeof PROVIDERS)[number];

const BAD_BODY = "รูปแบบคำขอไม่ถูกต้อง";
const field = (body: unknown, name: string) =>
  typeof body === "object" && body !== null ? (body as Record<string, unknown>)[name] : undefined;

export function validateAi(headers: Headers): AiConfig | string {
  const provider = headers.get("X-AI-Provider")?.trim() ?? "";
  const key = headers.get("X-AI-Key")?.trim() ?? "";
  const model = headers.get("X-AI-Model")?.trim() ?? "";
  if (!(PROVIDERS as readonly string[]).includes(provider)) return "เลือกผู้ให้บริการ AI ในหน้าตั้งค่า";
  if (!key) return "ใส่ API key ในหน้าตั้งค่า";
  if (!model || model.length > 100) return "ใส่ชื่อโมเดลในหน้าตั้งค่า (ไม่เกิน 100 ตัวอักษร)";
  return { provider: provider as Provider, key, model };
}

export function validateTranslate(body: unknown): { text: string; target: Lang } | string {
  const text = field(body, "text");
  const target = field(body, "target");
  if (typeof text !== "string" || typeof target !== "string") return BAD_BODY;
  const trimmed = text.trim();
  if (trimmed.length < 1 || trimmed.length > 2000) return "ข้อความต้องยาว 1–2000 ตัวอักษร";
  if (!isLang(target)) return "ภาษาปลายทางไม่ถูกต้อง";
  return { text: trimmed, target };
}

export function validateContext(body: unknown): { context: string } | string {
  const context = field(body, "context");
  if (typeof context !== "string") return BAD_BODY;
  const trimmed = context.trim();
  if (trimmed.length < 1 || trimmed.length > 200) return "บริบทต้องยาว 1–200 ตัวอักษร";
  return { context: trimmed };
}
