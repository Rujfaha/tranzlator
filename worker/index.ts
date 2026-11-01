import type { AskModel, Env } from "./env";
import { validateAi, validateTranslate } from "./validate";

const json = (body: unknown, status = 200) => Response.json(body, { status });
const fail = (error: string, status: number) => json({ error }, status);

export function createHandler(_ask: AskModel): ExportedHandler<Env> {
  return {
    async fetch(request, env) {
      const { pathname } = new URL(request.url);
      if (!pathname.startsWith("/api/")) return env.ASSETS.fetch(request);
      if (request.method !== "POST" || pathname !== "/api/translate") return fail("ไม่พบหน้านี้", 404);

      const body = await request.json().catch(() => null);
      const ai = validateAi(request.headers);
      if (typeof ai === "string") return fail(ai, 400);
      const input = validateTranslate(body);
      if (typeof input === "string") return fail(input, 400);
      return fail("ยังไม่พร้อมใช้งาน", 501);
    },
  };
}

// AI wiring lands with the translate route (Task 3).
export default createHandler(async () => {
  throw new Error("AI not wired");
});
