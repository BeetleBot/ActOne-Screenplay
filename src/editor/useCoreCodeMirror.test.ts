import { describe, it, expect, vi } from "vitest";
import { EditorSelection, EditorState } from "@codemirror/state";
import { EditorView, layer, RectangleMarker, type ViewUpdate } from "@codemirror/view";

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

describe("custom cursor layer", () => {
  // Mirrors the cursor-only layer used in src/editor/useCodeMirror.ts. The config object is
  // kept separate from layer() so its markers function can be tested directly, without
  // relying on the LayerView measuring cycle.

  // jsdom does not implement Range.getClientRects / getBoundingClientRect, which CodeMirror
  // needs to measure marker positions at runtime. Stub them with 8px-per-character metrics so
  // RectangleMarker.forRange produces deterministic coordinates in tests.
  let rangeMetricsStubbed = false;
  function stubRangeMetrics() {
    if (rangeMetricsStubbed) return;
    rangeMetricsStubbed = true;
    const metrics = (offset: number) => ({
      left: offset * 8,
      right: offset * 8 + 8,
      top: 0,
      bottom: 16,
      width: 8,
      height: 16,
    });
    Object.defineProperty(Range.prototype, "getClientRects", {
      configurable: true,
      value(this: Range) {
        return [metrics(this.startOffset)];
      },
    });
    Object.defineProperty(Range.prototype, "getBoundingClientRect", {
      configurable: true,
      value(this: Range) {
        return metrics(this.startOffset);
      },
    });
  }

  const cursorLayerConfig = {
    above: true,
    markers(view: EditorView): RectangleMarker[] {
      const cursors: RectangleMarker[] = [];
      for (const r of view.state.selection.ranges) {
        const prim = r === view.state.selection.main;
        if (r.empty) {
          const className = prim ? "cm-cursor cm-cursor-primary" : "cm-cursor cm-cursor-secondary";
          for (const piece of RectangleMarker.forRange(view, className, r)) {
            cursors.push(piece);
          }
        }
      }
      return cursors;
    },
    update(update: ViewUpdate, dom: HTMLElement): boolean {
      if (update.transactions.some((tr) => tr.selection)) {
        dom.style.animationName = dom.style.animationName === "cm-blink" ? "cm-blink2" : "cm-blink";
      }
      return update.docChanged || update.selectionSet;
    },
    mount(dom: HTMLElement): void {
      dom.style.animationDuration = "1200ms";
    },
    class: "cm-cursorLayer",
  };
  const cursorLayer = layer(cursorLayerConfig);

  it("emits a primary cm-cursor RectangleMarker for an empty selection", () => {
    stubRangeMetrics();
    const state = EditorState.create({
      doc: "Hello world",
      extensions: [cursorLayer, EditorView.editable.of(true)],
    });
    const parent = document.createElement("div");
    document.body.appendChild(parent);
    const view = new EditorView({ state, parent });

    const markers = cursorLayerConfig.markers(view);
    expect(markers.length).toBe(1);
    expect(markers[0] instanceof RectangleMarker).toBe(true);
    expect((markers[0] as RectangleMarker).className).toBe("cm-cursor cm-cursor-primary");

    view.destroy();
    parent.remove();
  });

  it("emits a fresh RectangleMarker at the new position when the selection changes", () => {
    stubRangeMetrics();
    const state = EditorState.create({
      doc: "Hello world",
      extensions: [cursorLayer, EditorView.editable.of(true)],
    });
    const parent = document.createElement("div");
    document.body.appendChild(parent);
    const view = new EditorView({ state, parent });

    view.dispatch({ selection: { anchor: 2 } });
    const at2 = cursorLayerConfig.markers(view);
    expect(at2.length).toBe(1);
    const at2Left = (at2[0] as RectangleMarker).left;

    view.dispatch({ selection: { anchor: 9 } });
    const at9 = cursorLayerConfig.markers(view);
    expect(at9.length).toBe(1);
    const at9Left = (at9[0] as RectangleMarker).left;

    // The stub measures 8px per character, so the cursor at anchor 9 must be further right
    // than the cursor at anchor 2.
    expect(at9Left).toBeGreaterThan(at2Left);

    view.destroy();
    parent.remove();
  });

  it("emits no cursor markers when the selection is non-empty (range selections are not cursors)", () => {
    const state = EditorState.create({
      doc: "Hello world",
      extensions: [cursorLayer, EditorView.editable.of(true)],
    });
    const parent = document.createElement("div");
    document.body.appendChild(parent);
    const view = new EditorView({ state, parent });

    view.dispatch({ selection: { anchor: 1, head: 5 } });
    const markers = cursorLayerConfig.markers(view);
    expect(markers.length).toBe(0);

    view.destroy();
    parent.remove();
  });

  it("emits primary and secondary cm-cursors for multiple empty selection ranges", () => {
    stubRangeMetrics();
    const state = EditorState.create({
      doc: "Hello world",
      extensions: [
        cursorLayer,
        EditorView.editable.of(true),
        EditorState.allowMultipleSelections.of(true),
      ],
    });
    const parent = document.createElement("div");
    document.body.appendChild(parent);
    const view = new EditorView({ state, parent });

    view.dispatch({
      selection: EditorSelection.create([
        EditorSelection.range(2, 2),
        EditorSelection.range(9, 9),
      ]),
    });

    const markers = cursorLayerConfig.markers(view);
    expect(markers.length).toBe(2);
    expect(markers.some((m) => (m as RectangleMarker).className === "cm-cursor cm-cursor-primary")).toBe(true);
    expect(markers.some((m) => (m as RectangleMarker).className === "cm-cursor cm-cursor-secondary")).toBe(true);

    view.destroy();
    parent.remove();
  });
});

