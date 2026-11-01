import {
  AiAuthError, AiQuotaError, askModel, contextPrompt, parseContext, parseTranslate, translatePrompt,
} from "./ai";
import { getSource, getTranslation, saveTranslation, translationId } from "./db";
import type { AiConfig, AskModel, Env } from "./env";
import { validateAi, validateContext, validateTranslate } from "./validate";

const json = (body: unknown, status = 200) => Response.json(body, { status });
const fail = (error: string, status: number) => json({ error }, status);

function aiFailure(e: unknown) {
  if (e instanceof AiAuthError) return fail("API key ไม่ถูกต้อง ตรวจ key ในหน้าตั้งค่า", 401);
  if (e instanceof AiQuotaError) return fail("โควตาของ API key นี้หมด ตรวจที่ผู้ให้บริการของคุณ", 429);
  return fail("แปลไม่สำเร็จ กดแปลอีกครั้ง", 502); // never echo e: it may carry provider text
}

// Rate limit, AI headers and JSON body, in the order the spec fixes.
async function guard(request: Request, env: Env): Promise<{ ai: AiConfig; body: unknown } | Response> {
  const { success } = await env.RATE_LIMITER.limit({ key: request.headers.get("CF-Connecting-IP") ?? "unknown" });
  if (!success) return fail("ส่งคำขอถี่เกินไป ลองใหม่ในอีก 1 นาที", 429);
  const ai = validateAi(request.headers);
  if (typeof ai === "string") return fail(ai, 400);
  return { ai, body: await request.json().catch(() => null) };
}

export function createHandler(ask: AskModel): ExportedHandler<Env> {
  async function translate(request: Request, env: Env) {
    const g = await guard(request, env);
    if (g instanceof Response) return g;
    const input = validateTranslate(g.body);
    if (typeof input === "string") return fail(input, 400);

    const id = await translationId(g.ai.model, input.text, input.target);
    const cached = await getTranslation(env.DB, id);
    if (cached) return json(cached);

    let parsed: ReturnType<typeof parseTranslate>;
    try {
      const prompt = translatePrompt(input.text, input.target);
      parsed = parseTranslate(await ask(g.ai, prompt.system, prompt.user));
    } catch (e) {
      return aiFailure(e);
    }
    const results = parsed.results.map((r) => ({ ...r, custom: false }));
    await saveTranslation(env.DB, id, input.text, parsed.sourceLang, input.target, results);
    return json({ id, sourceLang: parsed.sourceLang, results });
  }

  async function addContext(request: Request, env: Env, id: string) {
    const g = await guard(request, env);
    if (g instanceof Response) return g;
    const input = validateContext(g.body);
    if (typeof input === "string") return fail(input, 400);
    const source = await getSource(env.DB, id);
    if (!source) return fail("ไม่พบคำแปลนี้ กดแปลใหม่อีกครั้ง", 404);

    let parsed: ReturnType<typeof parseContext>;
    try {
      const prompt = contextPrompt(source.text, source.target, input.context);
      parsed = parseContext(await ask(g.ai, prompt.system, prompt.user));
    } catch (e) {
      return aiFailure(e);
    }
    // Not stored: the cache is shared, so a custom card must reach only its requester.
    return json({ context: input.context, ...parsed, custom: true });
  }

  return {
    async fetch(request, env) {
      const { pathname } = new URL(request.url);
      if (!pathname.startsWith("/api/")) return env.ASSETS.fetch(request);
      if (request.method === "POST") {
        if (pathname === "/api/translate") return translate(request, env);
        const id = pathname.match(/^\/api\/translate\/([^/]+)\/contexts$/)?.[1];
        if (id) return addContext(request, env, id);
      }
      return fail("ไม่พบหน้านี้", 404);
    },
  };
}

export default createHandler(askModel);
