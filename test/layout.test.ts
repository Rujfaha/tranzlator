import { expect, it } from "vitest";
import { isWide } from "../src/ui/layout";

it("isWide breakpoint", () => {
  expect(isWide(767)).toBe(false);
  expect(isWide(768)).toBe(true);
});
