import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clampPaste, pushRecent, sourceSize, toastDuration } from "../src/ui/text";
import { createToastStore } from "../src/ui/toastStore";

it("sourceSize thresholds", () => {
  expect(sourceSize(40)).toBe("source-lg");
  expect(sourceSize(41)).toBe("source-md");
  expect(sourceSize(160)).toBe("source-md");
  expect(sourceSize(161)).toBe("source-sm");
});
it("clampPaste cuts to 2000", () => expect(clampPaste("ก".repeat(2500))).toHaveLength(2000));
it("pushRecent keeps existing order", () => expect(pushRecent(["en", "th", "ja"], "th")).toEqual(["en", "th", "ja"]));
it("pushRecent prepends and drops last", () => expect(pushRecent(["en", "th", "ja"], "ko")).toEqual(["ko", "en", "th"]));
it("toastDuration", () => {
  expect(toastDuration("success", false)).toBe(4000);
  expect(toastDuration("success", true)).toBe(6000);
  expect(toastDuration("error", false)).toBe(6000);
});

describe("toast store", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("shows one toast at a time; the newest replaces the older", () => {
    const s = createToastStore();
    s.show({ kind: "success", message: "a" });
    s.show({ kind: "success", message: "b" });
    expect(s.get()?.message).toBe("b");
  });
  it("a stale timer never closes a newer toast", () => {
    const s = createToastStore();
    s.show({ kind: "success", message: "a" });
    vi.advanceTimersByTime(3000);
    s.show({ kind: "success", message: "b" });
    vi.advanceTimersByTime(3000); // 6000 since "a", only 3000 since "b"
    expect(s.get()?.message).toBe("b");
    vi.advanceTimersByTime(1000);
    expect(s.get()).toBeNull();
  });
  it("pause stops the countdown and resume restarts it", () => {
    const s = createToastStore();
    s.show({ kind: "error", message: "e" });
    s.pause();
    vi.advanceTimersByTime(60_000);
    expect(s.get()?.message).toBe("e");
    s.resume();
    vi.advanceTimersByTime(6000);
    expect(s.get()).toBeNull();
  });
  it("hide clears the toast and notifies subscribers", () => {
    const s = createToastStore();
    const seen: (string | undefined)[] = [];
    s.subscribe(() => seen.push(s.get()?.message));
    s.show({ kind: "info", message: "i" });
    s.hide();
    expect(seen).toEqual(["i", undefined]);
  });
});
