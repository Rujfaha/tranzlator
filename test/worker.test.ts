import { applyD1Migrations } from "cloudflare:test";
import { env } from "cloudflare:workers";
import { beforeAll, expect, it } from "vitest";
import type { AskModel } from "../worker/env";
import { createHandler } from "../worker/index";

const AI = { "X-AI-Provider": "anthropic", "X-AI-Key": "test-key", "X-AI-Model": "m" };
const ctx = { waitUntil() {}, passThroughOnException() {} } as unknown as ExecutionContext;

let calls = 0;
const ask: AskModel = async () => {
  calls++;
  throw new Error("ask must not be called");
};
const handler = createHandler((...a) => ask(...a));
const testEnv = {
  DB: env.DB,
  RATE_LIMITER: { limit: async () => ({ success: true }) },
  ASSETS: { fetch: async () => new Response("asset") },
} as never;

function post(path: string, body: unknown, headers: Record<string, string> = AI) {
  const req = new Request(`http://tranzlator.test${path}`, {
    method: "POST",
    headers,
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
  return handler.fetch!(req as never, testEnv, ctx);
}
const errorOf = async (res: Response) => ((await res.json()) as { error: string }).error;

beforeAll(() => applyD1Migrations(env.DB, env.TEST_MIGRATIONS));

it("400 when text is whitespace", async () => {
  const res = await post("/api/translate", { text: "   ", target: "en" });
  expect(res.status).toBe(400);
  expect(await errorOf(res)).toBeTypeOf("string");
});
it("400 when text > 2000 chars", async () => {
  const res = await post("/api/translate", { text: "ก".repeat(2001), target: "en" });
  expect(res.status).toBe(400);
});
it("400 when target not in LANGS", async () => {
  const res = await post("/api/translate", { text: "hi", target: "fr" });
  expect(res.status).toBe(400);
});
it("400 when body is not JSON", async () => {
  const res = await post("/api/translate", "not json{");
  expect(res.status).toBe(400);
});
it("400 when X-AI-Provider missing or not in PROVIDERS", async () => {
  const body = { text: "hi", target: "en" };
  expect((await post("/api/translate", body, { "X-AI-Key": "k", "X-AI-Model": "m" })).status).toBe(400);
  expect((await post("/api/translate", body, { ...AI, "X-AI-Provider": "grok" })).status).toBe(400);
});
it("400 when X-AI-Key empty", async () => {
  const res = await post("/api/translate", { text: "hi", target: "en" }, { ...AI, "X-AI-Key": "" });
  expect(res.status).toBe(400);
});
it("404 for unknown /api route", async () => {
  const res = await post("/api/nope", {});
  expect(res.status).toBe(404);
});
