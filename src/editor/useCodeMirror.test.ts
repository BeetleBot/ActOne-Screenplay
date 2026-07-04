import { describe, it, expect, vi } from "vitest";
import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";

describe("parsedDoc effect early-return guard", () => {
  it("skips dispatch when screenplayText matches last dispatched text (simulating guard)", () => {
    const state = EditorState.create({ doc: "EXT. HOUSE - DAY\n\nJOHN\nHello." });
    const parent = document.createElement("div");
    const view = new EditorView({ state, parent });

    const dispatchSpy = vi.spyOn(view, "dispatch");

    let lastDispatchedText = "";
    const screenplayText = "EXT. HOUSE - DAY\n\nJOHN\nHello.";
    const pendingScroll: number | null = null;

    const runEffect = (screenText: string) => {
      if (screenText === lastDispatchedText && pendingScroll === null) return;
      if (screenText !== lastDispatchedText) {
        lastDispatchedText = screenText;
        view.dispatch({ effects: [] });
      }
    };

    runEffect(screenplayText);
    expect(dispatchSpy).toHaveBeenCalledTimes(1);

    dispatchSpy.mockClear();

    runEffect(screenplayText);
    expect(dispatchSpy).not.toHaveBeenCalled();

    view.destroy();
  });

  it("enters effect but skips dispatch when pendingScroll is non-null", () => {
    const state = EditorState.create({ doc: "Hello." });
    const parent = document.createElement("div");
    const view = new EditorView({ state, parent });

    const dispatchSpy = vi.spyOn(view, "dispatch");

    let lastDispatchedText = "Hello.";
    const screenplayText = "Hello.";
    const pendingScroll: number | null = 5;

    const runEffect = (screenText: string) => {
      if (screenText === lastDispatchedText && pendingScroll === null) return;
      if (screenText !== lastDispatchedText) {
        lastDispatchedText = screenText;
        view.dispatch({ effects: [] });
      }
    };

    runEffect(screenplayText);

    expect(dispatchSpy).not.toHaveBeenCalled();

    view.destroy();
  });
});
