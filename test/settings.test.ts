import { expect, it } from "vitest";
import { DEFAULT_LANGS, parseLangs } from "../src/langs";

it("defaults are English with en, th, ja as the tabs", () => {
  expect(DEFAULT_LANGS).toEqual({ target: "en", recents: ["en", "th", "ja"] });
});
it("parseLangs returns a saved value as is", () => {
  const v = { target: "sw", recents: ["sw", "en", "zh-CN"] };
  expect(parseLangs(JSON.stringify(v))).toEqual(v);
});
it.each([
  ["null", null],
  ["not JSON", "{bad"],
  ["JSON but not an object", "42"],
  ["unknown target", '{"target":"xx-invalid","recents":["en"]}'],
  ["unknown code in recents", '{"target":"en","recents":["en","xx-invalid"]}'],
  ["recents not an array", '{"target":"en","recents":"en"}'],
  ["recents empty", '{"target":"en","recents":[]}'],
  ["recents too long", '{"target":"en","recents":["en","th","ja","ko"]}'],
  ["duplicate in recents", '{"target":"en","recents":["en","en"]}'],
  ["target not among recents", '{"target":"ko","recents":["en","th","ja"]}'],
  ["non-string code", '{"target":"en","recents":["en",7]}'],
  ["inherited property as target", '{"target":"constructor","recents":["constructor"]}'],
])("parseLangs falls back to the defaults for %s", (_name, raw) => {
  expect(parseLangs(raw)).toEqual(DEFAULT_LANGS);
});
it("parseLangs returns a fresh copy of the defaults", () => {
  parseLangs(null).recents.push("ko");
  expect(parseLangs(null).recents).toEqual(["en", "th", "ja"]);
});
