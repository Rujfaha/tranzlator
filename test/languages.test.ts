import { describe, expect, it } from "vitest";
import { isLang, langEnglish, langName, LANGUAGES, searchLanguages } from "../shared/languages";

const all = LANGUAGES.map((l) => l.code);

it("has at least 100 languages incl. th, en, ja, zh-CN, zh-TW", () => {
  expect(LANGUAGES.length).toBeGreaterThanOrEqual(100);
  for (const c of ["th", "en", "ja", "zh-CN", "zh-TW"]) expect(all).toContain(c);
});
it("codes are unique and every entry has th and en names", () => {
  expect(new Set(all).size).toBe(all.length);
  for (const l of LANGUAGES) {
    expect(l.th.trim()).not.toBe("");
    expect(l.en.trim()).not.toBe("");
    expect(l.th).not.toBe(l.code); // a bare code means Intl had no name and the generator was not fixed by hand
  }
});
it("isLang", () => {
  expect(isLang("th")).toBe(true);
  expect(isLang("zh-CN")).toBe(true);
  expect(isLang("xx-invalid")).toBe(false);
  expect(isLang("constructor")).toBe(false);
  expect(isLang("")).toBe(false);
});
it("langName falls back to the code", () => {
  expect(langName("th")).toBe("ไทย");
  expect(langName("und")).toBe("und");
  expect(langEnglish("und")).toBe("und");
  expect(langEnglish("ht")).toBe("Haitian Creole");
});
it("an odd sourceLang from the model never crashes the lookup", () => {
  for (const odd of ["constructor", "__proto__", "toString", "hasOwnProperty", " ", "zh-"]) {
    expect(langName(odd)).toBe(odd);
    expect(langEnglish(odd)).toBe(odd);
    expect(isLang(odd)).toBe(false);
  }
});
it("langName understands the alias and case a model may answer with", () => {
  expect(langName("zh")).toBe(langName("zh-CN"));
  expect(langName("ZH-tw")).toBe(langName("zh-TW"));
  expect(langName("iw")).toBe(langName("he"));
  expect(langName("TL")).toBe(langName("fil"));
  expect(langEnglish("jw")).toBe(langEnglish("jv"));
});

describe("searchLanguages", () => {
  it("search จีน returns both zh-CN and zh-TW", () => {
    const r = searchLanguages("จีน");
    expect(r).toContain("zh-CN");
    expect(r).toContain("zh-TW");
  });
  it("search 'zh' and 'chinese' give the same result, incl. zh-CN", () => {
    const zh = searchLanguages("zh");
    expect(zh).toContain("zh-CN");
    expect(searchLanguages("chinese")).toEqual(zh);
  });
  it("ignores case and surrounding spaces", () => {
    expect(searchLanguages("  CHINESE ")).toEqual(searchLanguages("chinese"));
  });
  it("finds a language by its Thai name", () => {
    expect(searchLanguages("ญี่")).toEqual(["ja"]);
  });
  it("prefix matches rank before substring matches", () => {
    const r = searchLanguages("ma");
    const isPrefix = (c: string) => {
      const l = LANGUAGES.find((x) => x.code === c)!;
      return [l.th, l.en, l.code].some((s) => s.toLowerCase().startsWith("ma"));
    };
    const firstSub = r.findIndex((c) => !isPrefix(c));
    expect(firstSub).toBeGreaterThan(0); // both groups exist (e.g. Malay is a prefix, Romanian a substring)
    expect(r.slice(0, firstSub).every(isPrefix)).toBe(true);
    expect(r.slice(firstSub).some(isPrefix)).toBe(false);
  });
  it("empty query returns all, sorted by Thai name", () => {
    expect(searchLanguages("")).toEqual(all);
    expect(searchLanguages("   ")).toEqual(all);
    const names = LANGUAGES.map((l) => l.th);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, "th")));
  });
  it("no match returns an empty list", () => {
    expect(searchLanguages("zzzzqqq")).toEqual([]);
  });
});
