import { applyD1Migrations } from "cloudflare:test";
import { env } from "cloudflare:workers";
import { afterAll, beforeAll, beforeEach, expect, it } from "vitest";
import { AiAuthError, AiError, AiQuotaError } from "../worker/ai";
import { getTranslation, saveTranslation } from "../worker/db";
import type { AskModel } from "../worker/env";
import { createHandler } from "../worker/index";

const AI = { "X-AI-Provider": "anthropic", "X-AI-Key": "test-key", "X-AI-Model": "m" };
const ctx = { waitUntil() {}, passThroughOnException() {} } as unknown as ExecutionContext;

const refuse: AskModel = async () => {
  throw new Error("ask must not be called");
};
let calls = 0;
let ask: AskModel = refuse;
let rateOk = true;
const handler = createHandler((...a) => {
  calls++;
  return ask(...a);
});
const testEnv = {
  DB: env.DB,
  RATE_LIMITER: { limit: async () => ({ success: rateOk }) },
  ASSETS: { fetch: async () => new Response("asset") },
} as never;
const bodies: string[] = [];

beforeEach(() => {
  calls = 0;
  ask = refuse;
  rateOk = true;
});
// Review Focus 6: no response in this file may contain the API key.
afterAll(() => expect(bodies.filter((b) => b.includes(AI["X-AI-Key"]))).toEqual([]));

async function post(path: string, body: unknown, headers: Record<string, string> = AI) {
  const req = new Request(`http://tranzlator.test${path}`, {
    method: "POST",
    headers,
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
  const res = await handler.fetch!(req as never, testEnv, ctx);
  bodies.push(await res.clone().text());
  return res;
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

// --- Task 3: POST /api/translate ---
const reply = (n = 3) =>
  JSON.stringify({
    sourceLang: "th",
    results: Array.from({ length: n }, (_, i) => ({ context: `บริบท ${i + 1}`, text: `Text ${i + 1}`, note: "ใช้ได้ทั่วไป" })),
  });
const good: AskModel = async () => reply();
const json = async <T = any>(res: Response) => (await res.json()) as T;
const rows = async (sql: string) => (await env.DB.prepare(sql).first<{ n: number }>())!.n;

it("returns results from AI and stores them", async () => {
  ask = good;
  const res = await post("/api/translate", { text: "ส่งไฟล์ให้หน่อย", target: "en" });
  expect(res.status).toBe(200);
  const body = await json(res);
  expect(body.sourceLang).toBe("th");
  expect(body.results).toHaveLength(3);
  expect(body.results.every((r: { custom: boolean }) => r.custom === false)).toBe(true);
  expect(calls).toBe(1);
  expect(await rows(`SELECT count(*) n FROM results WHERE translation_id = '${body.id}'`)).toBe(3);
});
it("second identical request (extra whitespace) is a cache hit", async () => {
  ask = good;
  const first = await json(await post("/api/translate", { text: "ขอบคุณมาก", target: "en" }));
  const second = await json(await post("/api/translate", { text: "  ขอบคุณมาก ", target: "en" }));
  expect(calls).toBe(1);
  expect(second).toEqual(first);
});
it("same text, different target calls AI again", async () => {
  ask = good;
  await post("/api/translate", { text: "สวัสดีครับ", target: "en" });
  await post("/api/translate", { text: "สวัสดีครับ", target: "ja" });
  expect(calls).toBe(2);
});
it("same text, different X-AI-Model calls AI again", async () => {
  ask = good;
  await post("/api/translate", { text: "ราตรีสวัสดิ์", target: "en" });
  await post("/api/translate", { text: "ราตรีสวัสดิ์", target: "en" }, { ...AI, "X-AI-Model": "other" });
  expect(calls).toBe(2);
});
it("cache hit still requires the AI headers", async () => {
  ask = good;
  await post("/api/translate", { text: "แล้วพบกัน", target: "en" });
  const res = await post("/api/translate", { text: "แล้วพบกัน", target: "en" }, {});
  expect(res.status).toBe(400);
});
it("502 with Thai error when AI returns garbage, nothing stored", async () => {
  ask = async () => "sorry, I cannot do that";
  const before = await rows("SELECT count(*) n FROM translations");
  const res = await post("/api/translate", { text: "ข้อความที่ล้มเหลว", target: "en" });
  expect(res.status).toBe(502);
  expect(await errorOf(res)).toBe("แปลไม่สำเร็จ กดแปลอีกครั้ง");
  expect(await rows("SELECT count(*) n FROM translations")).toBe(before);
});
it("502 when ask throws, even if the error text contains the key", async () => {
  ask = async () => {
    throw new AiError("provider said: bad request test-key");
  };
  const res = await post("/api/translate", { text: "ข้อความที่ล้มเหลว 2", target: "en" });
  expect(res.status).toBe(502);
  ask = async () => {
    throw new Error("network test-key");
  };
  expect((await post("/api/translate", { text: "ข้อความที่ล้มเหลว 3", target: "en" })).status).toBe(502);
});
it("429 when RATE_LIMITER.limit returns success:false", async () => {
  ask = good;
  rateOk = false;
  const res = await post("/api/translate", { text: "ถี่เกินไป", target: "en" });
  expect(res.status).toBe(429);
  expect(await errorOf(res)).toBe("ส่งคำขอถี่เกินไป ลองใหม่ในอีก 1 นาที");
  expect(calls).toBe(0);
});
it("401 with Thai message when ask throws AiAuthError", async () => {
  ask = async () => {
    throw new AiAuthError("rejected test-key");
  };
  const res = await post("/api/translate", { text: "key ผิด", target: "en" });
  expect(res.status).toBe(401);
  expect(await errorOf(res)).toBe("API key ไม่ถูกต้อง ตรวจ key ในหน้าตั้งค่า");
});
it("429 with quota message when ask throws AiQuotaError", async () => {
  ask = async () => {
    throw new AiQuotaError("quota");
  };
  const res = await post("/api/translate", { text: "โควตาหมด", target: "en" });
  expect(res.status).toBe(429);
  expect(await errorOf(res)).toBe("โควตาของ API key นี้หมด ตรวจที่ผู้ให้บริการของคุณ");
});
it("saving the same translation twice does not duplicate results", async () => {
  const results = [{ context: "c", text: "t", note: "n", custom: false }];
  await saveTranslation(env.DB, "dup-id", "x", "th", "en", results);
  await saveTranslation(env.DB, "dup-id", "x", "th", "en", results);
  expect((await getTranslation(env.DB, "dup-id"))!.results).toHaveLength(1);
});

// --- Task 4: POST /api/translate/:id/contexts ---
const customReply: AskModel = async () => '{"text":"ありがとうございます","note":"ใช้กับหัวหน้า"}';
const translated = async (text: string, target = "ja") =>
  (await json<{ id: string }>(await post("/api/translate", { text, target }))).id;

it("404 for unknown id", async () => {
  ask = customReply;
  const res = await post("/api/translate/nope/contexts", { context: "ทางการ" });
  expect(res.status).toBe(404);
  expect(calls).toBe(0);
});
it("400 for empty context / > 200 chars", async () => {
  ask = good;
  const id = await translated("ขอบคุณครับ");
  expect((await post(`/api/translate/${id}/contexts`, { context: "   " })).status).toBe(400);
  expect((await post(`/api/translate/${id}/contexts`, { context: "ก".repeat(201) })).status).toBe(400);
});
it("returns the custom result to the requester only", async () => {
  ask = good;
  const id = await translated("ขอบคุณ");
  ask = customReply;
  const r = await post(`/api/translate/${id}/contexts`, { context: "  ขอบคุณหัวหน้าคนญี่ปุ่น " });
  expect(r.status).toBe(200);
  expect(await json(r)).toEqual({
    context: "ขอบคุณหัวหน้าคนญี่ปุ่น", text: "ありがとうございます", note: "ใช้กับหัวหน้า", custom: true,
  });
});
it("custom result is not returned by a later translate cache hit", async () => {
  ask = good;
  const id = await translated("ขอบคุณมากครับ");
  ask = customReply;
  await post(`/api/translate/${id}/contexts`, { context: "ขอบคุณหัวหน้าคนญี่ปุ่น" });
  ask = refuse;
  const again = await json(await post("/api/translate", { text: "ขอบคุณมากครับ", target: "ja" }));
  expect(again.results).toHaveLength(3);
  expect(again.results.every((r: { custom: boolean }) => r.custom === false)).toBe(true);
  expect(await rows(`SELECT count(*) n FROM results WHERE translation_id = '${id}'`)).toBe(3);
});
it("getTranslation ignores custom rows and returns at most 6 results", async () => {
  const many = Array.from({ length: 8 }, (_, i) => ({ context: `c${i}`, text: "t", note: "n", custom: false }));
  await saveTranslation(env.DB, "many-id", "x", "th", "en", many);
  await env.DB.prepare("INSERT INTO results (translation_id, context, text, note, is_custom, created_at) VALUES ('many-id','x','t','n',1,0)").run();
  const got = (await getTranslation(env.DB, "many-id"))!.results;
  expect(got).toHaveLength(6);
  expect(got.every((r) => !r.custom)).toBe(true);
});
it("contexts endpoint maps AI errors like translate and needs AI headers", async () => {
  ask = good;
  const id = await translated("ลาก่อน");
  ask = async () => {
    throw new AiAuthError("rejected test-key");
  };
  expect((await post(`/api/translate/${id}/contexts`, { context: "ทางการ" })).status).toBe(401);
  ask = async () => "not json";
  expect((await post(`/api/translate/${id}/contexts`, { context: "ทางการ" })).status).toBe(502);
  expect((await post(`/api/translate/${id}/contexts`, { context: "ทางการ" }, {})).status).toBe(400);
  rateOk = false;
  expect((await post(`/api/translate/${id}/contexts`, { context: "ทางการ" })).status).toBe(429);
});
