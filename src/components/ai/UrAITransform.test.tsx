import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { useUrAITransform } from "./UrAITransform";
import type { PromptConfig } from "../../hooks/usePromptConfig";

const { transform } = vi.hoisted(() => ({ transform: vi.fn() }));
vi.mock("../../lib/urai", async (original) => ({
  ...(await original<typeof import("../../lib/urai")>()),
  isUrAIDesktop: () => true,
  nativeTransform: transform,
}));
const config = { provider: "ollama", ollamaUrl: "http://localhost:11434", model: "test", translatePrompt: "natural" } as PromptConfig;
function Harness({ view }: { view: EditorView }) {
  const action = useUrAITransform(config);
  return <><button onClick={() => action.start(view, 0, view.state.doc.length, "rephrase", "make clear")}>Start</button>{action.dialog}</>;
}

describe("UrAI inline writing actions", () => {
  it("applies the completed suggestion without an approval dialog", async () => {
    const view = new EditorView({ state: EditorState.create({ doc: "He walks slowly." }) });
    transform.mockResolvedValueOnce([{ id: "0", text: "He takes his time." }]);
    const rendered = render(<Harness view={view} />);
    fireEvent.click(screen.getByText("Start"));
    await waitFor(() => expect(view.state.doc.toString()).toBe("He takes his time."));
    expect(screen.queryByRole("button", { name: "Approve suggestion" })).toBeNull();
    rendered.unmount();
    view.destroy();
  });

  it("does not overwrite edits made while a request is running", async () => {
    let finish!: (value: { id: string; text: string }[]) => void;
    transform.mockReturnValueOnce(new Promise((resolve) => { finish = resolve; }));
    const view = new EditorView({ state: EditorState.create({ doc: "He walks slowly." }) });
    const rendered = render(<Harness view={view} />);
    fireEvent.click(screen.getByText("Start"));
    act(() => view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: "New writing." } }));
    await act(async () => finish([{ id: "0", text: "He takes his time." }]));
    await screen.findByText(/The document changed while UrAI was working/);
    expect(view.state.doc.toString()).toBe("New writing.");
    rendered.unmount();
    view.destroy();
  });
});
