import { describe, it, expect } from "vitest";
import { getWordAtPosition } from "./wordUtils";

describe("wordUtils - getWordAtPosition", () => {
  it("extracts simple word at cursor", () => {
    const text = "The quick brown fox";
    const res = getWordAtPosition(text, 5); // on "quick"
    expect(res).toEqual({ word: "quick", from: 4, to: 9 });
  });

  it("handles word with apostrophe inside", () => {
    const text = "He couldn't do that";
    const res = getWordAtPosition(text, 5); // on "couldn't"
    expect(res).toEqual({ word: "couldn't", from: 3, to: 11 });
  });

  it("trims leading/trailing apostrophes", () => {
    const text = "She said 'hello' to him";
    const res = getWordAtPosition(text, 11); // on "hello"
    expect(res).toEqual({ word: "hello", from: 10, to: 15 });
  });

  it("returns null on whitespace or empty text", () => {
    const text = "Hello    world";
    const res = getWordAtPosition(text, 7); // whitespace
    expect(res).toBeNull();
  });

  it("handles word with curly apostrophe inside", () => {
    const text = "He couldn’t do that";
    const res = getWordAtPosition(text, 5); // on "couldn’t"
    expect(res).toEqual({ word: "couldn’t", from: 3, to: 11 });
  });

  it("trims leading/trailing curly apostrophes", () => {
    const text = "She said ’hello’ to him";
    const res = getWordAtPosition(text, 11); // on "hello"
    expect(res).toEqual({ word: "hello", from: 10, to: 15 });
  });
});
