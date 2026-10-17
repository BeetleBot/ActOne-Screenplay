import React from "react";
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { EditorSelection, EditorState, type TransactionSpec } from "@codemirror/state";
import { history, redo, undo } from "@codemirror/commands";
import { LineType, parseScreenplay } from "../parser";

const editor = vi.hoisted(() => ({ view: null as unknown, setRawText: vi.fn() }));
vi.mock("./EditorContext", () => ({ useEditor: () => ({ editorView: editor.view, scrollToLine: vi.fn() }) }));
vi.mock("./FileSubscriptions", () => ({
  useParsedScreenplay: () => ({ lines: [] }),
  useFileActions: () => ({ setRawText: editor.setRawText }),
}));

import { ScriptEditorProvider, useScriptEditor } from "./ScriptEditorContext";

const text =
  "Title: Example\n\nINT. FIRST - DAY\n\nFirst action.\n\nEXT. SECOND - NIGHT\n\nSecond action.\n\nINT. THIRD - DAY\n\nThird action.";

function setup(selection: EditorSelection) {
  let state = EditorState.create({
    doc: text,
    selection,
    extensions: [history(), EditorState.allowMultipleSelections.of(true)],
  });
  const dispatch = vi.fn((spec: TransactionSpec) => {
    state = state.update(spec).state;
  });
  editor.view = {
    get state() {
      return state;
    },
    dispatch,
  };
  const { result } = renderHook(() => useScriptEditor(), {
    wrapper: ({ children }) => <ScriptEditorProvider>{children}</ScriptEditorProvider>,
  });
  return {
    result,
    dispatch,
    getState: () => state,
    setState: (next: EditorState) => {
      state = next;
    },
  };
}

beforeEach(() => vi.clearAllMocks());

describe("scene reorder selection", () => {
  it.each([
    [2, 0],
    [0, 2],
  ])("preserves the cursor inside the moved scene (%i to %i)", (from, to) => {
    const action = ["First action.", "Second action.", "Third action."][from];
    const { result, getState, dispatch } = setup(EditorSelection.single(text.indexOf(action) + 5));
    act(() => result.current.reorderScenes(from, to));
    const state = getState();
    expect(state.doc.lineAt(state.selection.main.head).text).toBe(action);
    expect(state.selection.main.head - state.doc.lineAt(state.selection.main.head).from).toBe(5);
    expect(
      parseScreenplay(state.doc.toString()).lines.filter((line) => line.type === LineType.heading)[to].text,
    ).toContain(["FIRST", "SECOND", "THIRD"][from]);
    expect(dispatch.mock.calls[0][0].annotations).toBeDefined();
    expect(dispatch).toHaveBeenCalledOnce();
    expect(editor.setRawText).toHaveBeenCalledWith(state.doc.toString());
  });

  it("preserves a backward selection in an unaffected scene and a cursor in the title page", () => {
    const first = text.indexOf("First action.");
    const { result, getState } = setup(
      EditorSelection.create([EditorSelection.cursor(3), EditorSelection.range(first + 8, first + 2)], 1),
    );
    act(() => result.current.reorderScenes(2, 0));
    const state = getState();
    expect(state.selection.ranges[0].head).toBe(3);
    expect(state.selection.main.anchor).toBeGreaterThan(state.selection.main.head);
    expect(state.sliceDoc(state.selection.main.from, state.selection.main.to)).toBe("rst ac");
    expect(state.selection.mainIndex).toBe(1);
  });

  it("undo restores the original selection and redo reapplies the scene move", () => {
    const originalSelection = EditorSelection.single(text.indexOf("Second action.") + 3);
    const { result, getState, setState } = setup(originalSelection);
    act(() => result.current.reorderScenes(1, 0));
    const moved = getState();
    expect(undo({ state: moved, dispatch: (transaction) => setState(transaction.state) })).toBe(true);
    expect(getState().doc.toString()).toBe(text);
    expect(getState().selection.eq(originalSelection)).toBe(true);
    expect(redo({ state: getState(), dispatch: (transaction) => setState(transaction.state) })).toBe(true);
    expect(getState().doc.eq(moved.doc)).toBe(true);
  });

  it("does not rewrite the document when a scene is dropped in its existing position", () => {
    const { result, dispatch } = setup(EditorSelection.single(20));
    act(() => result.current.reorderScenes(1, 1));
    expect(dispatch).not.toHaveBeenCalled();
    expect(editor.setRawText).not.toHaveBeenCalled();
  });
});
