import { expect, it } from "vitest";
import { calculateSearchMatches, getSearchMatches } from "./searchResults";

it.each([
  ["bee", false, false, false],
  ["BEE", true, false, false],
  ["bee", false, true, false],
  ["bee.*", false, false, true],
  ["^", false, false, true],
] as const)("preserves search semantics for %s", (query, matchCase, wholeWord, regex) => {
  const text = "A bee\r\nBEE and bees.\n🐝 bee";
  const options = JSON.stringify([query, matchCase, wholeWord, regex]);
  const matches = getSearchMatches(text, options);
  expect(matches).toEqual(calculateSearchMatches(text, query, matchCase, wholeWord, regex));
  expect(getSearchMatches(text, options)).toBe(matches);
  expect(getSearchMatches(text + " bee", options)).not.toBe(matches);
});

it("does not retain invalid regex failures", () => {
  expect(() => getSearchMatches("bees", JSON.stringify(["[", false, false, true]))).toThrow();
  expect(getSearchMatches("bees", JSON.stringify(["bee", false, false, false]))).toHaveLength(1);
});
