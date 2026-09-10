import { describe, it, expect } from "vitest";
import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { toggleInlineMarker } from "./formatUtils";

describe("toggleInlineMarker", () => {
  it("wraps a character name in highlight markers (==)", () => {
    const state = EditorState.create({
      doc: "COOPER\nHello world.",
      selection: { anchor: 0, head: 6 }, // selects "COOPER"
    });
    const view = new EditorView({ state });

    toggleInlineMarker(view, "==");
    expect(view.state.doc.toString()).toBe("==COOPER==\nHello world.");
  });

  it("un-highlights text cleanly when toggling highlight off without adding extra equals", () => {
    const state = EditorState.create({
      doc: "==COOPER==\nHello world.",
      selection: { anchor: 0, head: 10 }, // selects "==COOPER=="
    });
    const view = new EditorView({ state });

    toggleInlineMarker(view, "==");
    expect(view.state.doc.toString()).toBe("COOPER\nHello world.");
  });

  it("handles bold (**) wrapping and unwrapping", () => {
    const state = EditorState.create({
      doc: "INT. ROOM - DAY",
      selection: { anchor: 0, head: 15 },
    });
    const view = new EditorView({ state });

    toggleInlineMarker(view, "**");
    expect(view.state.doc.toString()).toBe("**INT. ROOM - DAY**");

    toggleInlineMarker(view, "**");
    expect(view.state.doc.toString()).toBe("INT. ROOM - DAY");
  });

  it("preserves synopsis prefix (=) when toggling markers on a synopsis line", () => {
    const state = EditorState.create({
      doc: "= The synopsis line",
      selection: { anchor: 0, head: 19 },
    });
    const view = new EditorView({ state });

    toggleInlineMarker(view, "==");
    expect(view.state.doc.toString()).toBe("=== The synopsis line==");
  });
});
