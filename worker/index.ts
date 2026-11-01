import { AiAuthError, AiQuotaError, askModel, parseTranslate, translatePrompt } from "./ai";
import { getTranslation, saveTranslation, translationId } from "./db";
import type { AskModel, Env } from "./env";
import { validateAi, validateTranslate } from "./validate";

const json = (body: unknown, status = 200) => Response.json(body, { status });
const fail = (error: string, status: number) => json({ error }, status);

function aiFailure(e: unknown) {
  if (e instanceof AiAuthError) return fail("API key ไม่ถูกต้อง ตรวจ key ในหน้าตั้งค่า", 401);
  if (e instanceof AiQuotaError) return fail("โควตาของ API key นี้หมด ตรวจที่ผู้ให้บริการของคุณ", 429);
  return fail("แปลไม่สำเร็จ กดแปลอีกครั้ง", 502); // never echo e: it may carry provider text
}

export function createHandler(ask: AskModel): ExportedHandler<Env> {
  return {
    async fetch(request, env) {
      const { pathname } = new URL(request.url);
      if (!pathname.startsWith("/api/")) return env.ASSETS.fetch(request);
      if (request.method !== "POST" || pathname !== "/api/translate") return fail("ไม่พบหน้านี้", 404);

      const { success } = await env.RATE_LIMITER.limit({ key: request.headers.get("CF-Connecting-IP") ?? "unknown" });
      if (!success) return fail("ส่งคำขอถี่เกินไป ลองใหม่ในอีก 1 นาที", 429);
      const ai = validateAi(request.headers);
      if (typeof ai === "string") return fail(ai, 400);
      const input = validateTranslate(await request.json().catch(() => null));
      if (typeof input === "string") return fail(input, 400);

      const id = await translationId(ai.model, input.text, input.target);
      const cached = await getTranslation(env.DB, id);
      if (cached) return json(cached);

      let parsed: ReturnType<typeof parseTranslate>;
      try {
        const prompt = translatePrompt(input.text, input.target);
        parsed = parseTranslate(await ask(ai, prompt.system, prompt.user));
      } catch (e) {
        return aiFailure(e);
      }
      const results = parsed.results.map((r) => ({ ...r, custom: false }));
      await saveTranslation(env.DB, id, input.text, parsed.sourceLang, input.target, results);
      return json({ id, sourceLang: parsed.sourceLang, results });
    },
  };
}

export default createHandler(askModel);
