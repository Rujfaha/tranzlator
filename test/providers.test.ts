import { expect, it } from "vitest";
import { PROVIDER_INFO, parseSettings } from "../src/providers";
import { PROVIDERS } from "../worker/validate";

it("every provider has label, defaultModel and https keyUrl", () => {
  for (const p of PROVIDERS) {
    expect(PROVIDER_INFO[p].label).not.toBe("");
    expect(PROVIDER_INFO[p].defaultModel).not.toBe("");
    expect(PROVIDER_INFO[p].keyUrl.startsWith("https://")).toBe(true);
  }
});
it("app providers match the worker's PROVIDERS exactly", () => {
  expect(Object.keys(PROVIDER_INFO).sort()).toEqual([...PROVIDERS].sort());
});
it("anthropic defaults to claude-sonnet-5-5", () => {
  expect(PROVIDER_INFO.anthropic.defaultModel).toBe("claude-sonnet-5-5");
});
it("parseSettings accepts a saved value", () => {
  const s = { provider: "gemini", key: "k", model: "m" };
  expect(parseSettings(JSON.stringify(s))).toEqual(s);
});
it.each([
  ["null", null],
  ["not JSON", "{oops"],
  ["unknown provider", '{"provider":"grok","key":"k","model":"m"}'],
  ["empty key", '{"provider":"openai","key":"","model":"m"}'],
  ["missing model", '{"provider":"openai","key":"k"}'],
  ["inherited property as provider", '{"provider":"constructor","key":"k","model":"m"}'],
])("parseSettings returns null for %s", (_name, raw) => {
  expect(parseSettings(raw)).toBeNull();
});
