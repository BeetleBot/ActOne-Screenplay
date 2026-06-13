import { describe, it, expect, beforeEach } from "vitest";
import { EditorState } from "@codemirror/state";
import { fountainCompletionSource } from "./autocomplete";

function createContext(text: string, pos: number, explicit = false) {
  const state = EditorState.create({ doc: text });
  return {
    state,
    pos,
    explicit,
    matchBefore: (re: RegExp) => {
      const line = state.doc.lineAt(pos);
      const before = line.text.substring(0, pos - line.from);
      const m = before.match(re);
      return m ? { from: pos - m[0].length, to: pos, text: m[0] } : null;
    },
  } as any;
}

describe("fountainCompletionSource", () => {
  beforeEach(() => {
    localStorage.setItem("actone-autocomplete-enabled", "true");
  });

  it("returns null when autocomplete is disabled", () => {
    localStorage.setItem("actone-autocomplete-enabled", "false");
    const ctx = createContext("\n\nJOH", 5, true);
    expect(fountainCompletionSource(ctx)).toBeNull();
  });

  it("completes character names on character lines", () => {
    const ctx = createContext("JOHN\n\nJOH", 9, true);
    const result = fountainCompletionSource(ctx);
    expect(result).not.toBeNull();
    expect(result!.options.length).toBeGreaterThanOrEqual(1);
    expect(result!.options.some(o => o.label === "JOHN")).toBe(true);
  });

  it("returns null on non-character non-empty lines", () => {
    const ctx = createContext("\nEXT. HOUSE - DAY", 5, true);
    expect(fountainCompletionSource(ctx)).toBeNull();
  });
});
