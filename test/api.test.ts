import { afterEach, expect, it, vi } from "vitest";
import { addContext, translate } from "../src/api";

const ai = { provider: "openai", key: "sk-test", model: "m" } as const;
afterEach(() => vi.restoreAllMocks());

it("sends AI settings as headers and returns the parsed body", async () => {
  const spy = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ id: "x", sourceLang: "th", results: [] }));
  const res = await translate(ai, "สวัสดี", "en");
  const [url, init] = spy.mock.calls[0] as [string, RequestInit];
  const headers = new Headers(init.headers);
  expect(url).toBe("/api/translate");
  expect(headers.get("X-AI-Provider")).toBe("openai");
  expect(headers.get("X-AI-Key")).toBe("sk-test");
  expect(headers.get("X-AI-Model")).toBe("m");
  expect(JSON.parse(init.body as string)).toEqual({ text: "สวัสดี", target: "en" });
  expect(res.id).toBe("x");
});
it("throws the Thai error message from the server body", async () => {
  vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ error: "API key ไม่ถูกต้อง ตรวจ key ในหน้าตั้งค่า" }, { status: 401 }));
  await expect(addContext(ai, "id1", "ทางการ")).rejects.toThrow("API key ไม่ถูกต้อง ตรวจ key ในหน้าตั้งค่า");
});
it("throws the network message when fetch fails", async () => {
  vi.spyOn(globalThis, "fetch").mockRejectedValue(new TypeError("Failed to fetch"));
  await expect(translate(ai, "x", "en")).rejects.toThrow("เชื่อมต่อไม่ได้ ตรวจอินเทอร์เน็ตแล้วลองใหม่");
});
it("throws the 502 message when the error response has no JSON body", async () => {
  vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("<html>oops</html>", { status: 500 }));
  await expect(translate(ai, "x", "en")).rejects.toThrow("แปลไม่สำเร็จ กดแปลอีกครั้ง");
});
