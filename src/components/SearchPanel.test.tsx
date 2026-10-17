import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";
import React from "react";
import { EditorState, type TransactionSpec } from "@codemirror/state";
import { EditorView, type ViewUpdate } from "@codemirror/view";
import { search } from "@codemirror/search";
import { history, undo } from "@codemirror/commands";
import { lineTypesField } from "../editor/fountainSyntax";
let mockEditorView: EditorView | null = null;
function makeEditor(doc: string): EditorView {
  const editor = {
    state: EditorState.create({ doc, extensions: [search(), history(), lineTypesField] }),
    focus: vi.fn(),
    dispatch(spec: TransactionSpec) {
      const transaction = editor.state.update(spec);
      const startState = editor.state;
      editor.state = transaction.state;
      for (const listener of editor.state.facet(EditorView.updateListener))
        listener({
          docChanged: transaction.docChanged,
          state: editor.state,
          startState,
          changes: transaction.changes,
          view: editor,
          transactions: [transaction],
        } as unknown as ViewUpdate);
    },
  };
  return editor as unknown as EditorView;
}

const mockSetActiveRightPane = vi.fn();
const mockConfirm = vi.fn();

vi.mock("../context", () => ({
  useUI: () => ({
    activeRightPane: "search",
    setActiveRightPane: mockSetActiveRightPane,
  }),
  useEditor: () => ({
    get editorView() {
      return mockEditorView;
    },
  }),
  useFile: () => ({
    parsedDoc: {
      screenplayText: "Hello world\n\nAnother line",
      lines: [{ text: "Hello world", type: 0, sceneNumber: undefined }],
    },
    rawText: "Hello world\n\nAnother line",
    setRawText: vi.fn(),
  }),
  useCustomModal: () => ({
    confirm: mockConfirm,
  }),
}));

import { SearchPanel } from "./SearchPanel";

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  mockEditorView = null;
});

describe("SearchPanel Component", () => {
  it("renders the search input", () => {
    render(React.createElement(SearchPanel));
    expect(screen.getByPlaceholderText("Find...")).toBeTruthy();
  });

  it("renders empty state when no query is entered", () => {
    render(React.createElement(SearchPanel));
    expect(screen.getByText(/Type a query to search/)).toBeTruthy();
  });

  it("shows replace section when chevron is clicked", () => {
    render(React.createElement(SearchPanel));
    const chevron = screen.getByLabelText("Show replace");
    act(() => {
      fireEvent.click(chevron);
    });
    expect(screen.getByPlaceholderText("Replace with...")).toBeTruthy();
  });

  it("shows no results state when query does not match", () => {
    render(React.createElement(SearchPanel));
    const nativeInput = screen.getByPlaceholderText("Find...") as HTMLInputElement;
    act(() => {
      fireEvent.change(nativeInput, { target: { value: "zzzznotfound" } });
    });
    expect(screen.getByText("No matches found")).toBeTruthy();
  });
});

describe("SearchPanel document operations", () => {
  it("finds all matches, replaces them in one undo step, and keeps result DOM bounded", async () => {
    localStorage.setItem("actone-find-last-query", "word");
    const original = "INT. ROOM - DAY\n\n" + "word ".repeat(200);
    mockEditorView = makeEditor(original);
    const { container } = render(<SearchPanel />);
    fireEvent.click(screen.getByLabelText("Show replace"));
    fireEvent.change(screen.getByPlaceholderText("Replace with..."), { target: { value: "text" } });
    await waitFor(() => expect(screen.getByRole("button", { name: "All (200)" })).toBeEnabled());
    expect(container.querySelectorAll("[data-match-id]").length).toBeLessThan(30);
    mockConfirm.mockResolvedValue("ok");
    fireEvent.click(screen.getByRole("button", { name: "All (200)" }));
    await waitFor(() => expect(mockEditorView!.state.doc.toString()).toContain("text text"));
    act(() => {
      undo(mockEditorView!);
    });
    expect(mockEditorView!.state.doc.toString()).toBe(original);
  });

  it("rejects stale offsets if text changes while Replace All confirmation is open", async () => {
    localStorage.setItem("actone-find-last-query", "word");
    mockEditorView = makeEditor("word word");
    render(<SearchPanel />);
    fireEvent.click(screen.getByLabelText("Show replace"));
    fireEvent.change(screen.getByPlaceholderText("Replace with..."), { target: { value: "text" } });
    await waitFor(() => expect(screen.getByRole("button", { name: "All (2)" })).toBeEnabled());
    let resolveConfirm: (choice: string) => void = () => {};
    mockConfirm
      .mockImplementationOnce(
        () =>
          new Promise<string>((resolve) => {
            resolveConfirm = resolve;
          }),
      )
      .mockResolvedValue("ok");
    fireEvent.click(screen.getByRole("button", { name: "All (2)" }));
    act(() => mockEditorView!.dispatch({ changes: { from: 0, insert: "prefix " } }));
    await act(async () => {
      resolveConfirm("ok");
    });
    expect(mockEditorView!.state.doc.toString()).toBe("prefix word word");
    expect(mockConfirm).toHaveBeenCalledTimes(2);
  });

  it("navigates to the exact clicked match, including repeated matches on one line", async () => {
    localStorage.setItem("actone-find-last-query", "word");
    mockEditorView = makeEditor("word word");
    const { container } = render(<SearchPanel />);
    await waitFor(() => expect(container.querySelector('[data-match-id="5-9"]')).toBeTruthy());
    fireEvent.click(container.querySelector('[data-match-id="5-9"]')!);
    expect(mockEditorView.state.selection.main.from).toBe(5);
    expect(mockEditorView.state.selection.main.to).toBe(9);
  });
});

describe("checked search results", () => {
  it("preserves a checked match through edits before it and replaces only that match", async () => {
    localStorage.setItem("actone-find-last-query", "word");
    mockEditorView = makeEditor("word word");
    const { container } = render(<SearchPanel />);
    fireEvent.click(screen.getByLabelText("Show replace"));
    fireEvent.change(screen.getByPlaceholderText("Replace with..."), { target: { value: "changed" } });
    await waitFor(() => expect(container.querySelector('[data-match-id="5-9"]')).toBeTruthy());
    fireEvent.click(container.querySelector('[data-match-id="5-9"]')!.firstElementChild!);
    expect(screen.getByRole("button", { name: "Selected (1)" })).toBeEnabled();
    act(() => mockEditorView!.dispatch({ changes: { from: 0, insert: "x " } }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Selected (1)" })).toBeEnabled());
    fireEvent.click(screen.getByRole("button", { name: "Selected (1)" }));
    expect(mockEditorView.state.doc.toString()).toBe("x word changed");
  });

  it("keeps numbered scene context in previews", async () => {
    localStorage.setItem("actone-find-last-query", "word");
    mockEditorView = makeEditor("INT. ROOM - DAY #7#\n\nword");
    const { container } = render(<SearchPanel />);
    await waitFor(() => expect(container.textContent).toContain("[7] INT. ROOM - DAY #7#"));
  });
});
