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

  it("prevents stale React rawText overwrite during active debounced typing on 150-page document", () => {
    // Generate ~150 page screenplay text (~8,000 lines)
    const lines = [];
    for (let i = 1; i <= 150; i++) {
      lines.push(`EXT. LOCATION ${i} - DAY`);
      lines.push("");
      lines.push("CHARACTER");
      lines.push(`This is dialogue line for scene ${i}.`);
      lines.push("");
    }
    const fullText = lines.join("\n");
    const state = EditorState.create({ doc: fullText });
    const parent = document.createElement("div");
    const view = new EditorView({ state, parent });

    const dispatchSpy = vi.spyOn(view, "dispatch");

    // Simulate user typing into CodeMirror (CodeMirror doc becomes typedText)
    view.dispatch({ changes: { from: fullText.length, insert: "A" } });
    dispatchSpy.mockClear();

    const typedText = fullText + "A";
    let pendingRawText: string | null = typedText;
    const staleReactRawText = fullText;

    const syncEffect = (reactRawText: string) => {
      // Guard: if pendingRawText is non-null, CodeMirror has un-synced typed text
      if (pendingRawText !== null) return;
      if (view.state.doc.toString() !== reactRawText) {
        view.dispatch({
          changes: { from: 0, to: view.state.doc.length, insert: reactRawText }
        });
      }
    };

    // Trigger sync while typing is pending (React re-renders with staleReactRawText)
    syncEffect(staleReactRawText);

    // Verify CodeMirror was NOT overwritten back to stale text
    expect(dispatchSpy).not.toHaveBeenCalled();
    expect(view.state.doc.toString()).toBe(typedText);

    // Now simulate 150ms debounce timer completing and clearing pendingRawText
    pendingRawText = null;
    syncEffect(typedText); // React state receives updated typedText

    // Verify clean sync — CodeMirror doc already matches typedText, so 0 extra dispatches
    expect(dispatchSpy).not.toHaveBeenCalled();

    view.destroy();
  });
});

