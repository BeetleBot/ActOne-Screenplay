import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { nativeChat, loadNativeSessions } from "../../lib/urai";
import { UrAIChatPane } from "./UrAIChatPane";
import { fetchModels, setPromptConfigField } from "../../hooks/usePromptConfig";
import { registerPendingEditor } from "../../editor/pendingEdits";

const mocks = vi.hoisted(() => ({ scroll: vi.fn() }));

vi.mock("../../context", () => ({
  useFile: () => ({ filePath: "draft.actone", activeFileId: "draft", scriptFileName: "draft.fountain", rawText: "INT. ROOM - DAY #15A#\n\nMaya waits.\n\nEXT. ROAD - NIGHT #16#\n\nMaya leaves." }),
  useEditor: () => ({ scrollToLine: mocks.scroll }),
  useCursor: () => ({ activeLineNumber: 0 }),
  useUI: () => ({ paperSize: "letter" }),
}));

vi.mock("../../hooks/usePromptConfig", () => ({
  usePromptConfig: () => ({ provider: "ollama", ollamaUrl: "http://localhost:11434", model: "fixture", chatTemp: 0 }),
  getActiveModelName: () => "fixture",
  fetchModels: vi.fn(async () => ["fixture", "another-model"]),
  setPromptConfigField: vi.fn(),
}));

vi.mock("../../hooks/useApiList", () => ({ useApiList: () => [] }));

vi.mock("../../lib/urai", async (original) => ({
  ...await original<typeof import("../../lib/urai")>(),
  loadNativeSessions: vi.fn(async () => null),
  saveNativeSessions: vi.fn(async () => undefined),
  nativeChat: vi.fn(),
}));

it("streams through the new composer, cancels, and retries without duplicating the prompt", async () => {
  localStorage.clear();
  vi.mocked(nativeChat).mockImplementationOnce(async (_config, _messages, options) => {
    options.onTurn?.({ status: "running", content: "Partial reply", sources: [], toolCalls: [], tokens: 2 });
    options.onTurn?.({ status: "running", content: "Partial reply with more text", sources: [], toolCalls: [], tokens: 6 });
    return new Promise((_, reject) => {
      options.signal?.addEventListener("abort", () => reject(new DOMException("Cancelled", "AbortError")), { once: true });
    });
  }).mockRejectedValueOnce(new Error("Provider unavailable"))
    .mockResolvedValueOnce({ text: '**scene-read**\n\n{ "tool": "read_scene", "args": { "label": "#16#" } }\n\n**Recovered reply** and *emphasis*', inputTokens: 1, outputTokens: 2, finishReason: "stop" });

  render(<UrAIChatPane />);
  expect(screen.getByText("UrAI Chat")).toBeInTheDocument();
  const input = screen.getByRole("textbox", { name: "Message UrAI" });
  await waitFor(() => expect(input).toBeEnabled());
  expect(loadNativeSessions).toHaveBeenCalledWith(expect.stringMatching(/^rewrite-v1::/));
  fireEvent.change(input, { target: { value: "Talk through the ending" } });
  fireEvent.click(screen.getByRole("button", { name: "Send" }));
  expect(await screen.findByText("Partial reply with more text")).toBeInTheDocument();
  expect(screen.queryByText("Partial reply")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Stop" }));
  await screen.findByRole("button", { name: "Send" });
  fireEvent.change(input, { target: { value: "Try a different ending" } });
  fireEvent.click(screen.getByRole("button", { name: "Send" }));
  fireEvent.click(await screen.findByRole("button", { name: "Retry" }));
  expect((await screen.findByText("Recovered reply")).tagName).toBe("STRONG");
  expect(screen.getAllByText("UrAI", { exact: true })).toHaveLength(2);
  expect(screen.getByText("emphasis").tagName).toBe("EM");
  expect(screen.queryByText("scene-read")).not.toBeInTheDocument();
  expect(screen.queryByText(/"tool": "read_scene"/)).not.toBeInTheDocument();
  expect(screen.getAllByText("Try a different ending")).toHaveLength(1);
});

it("lists available models and switches Ollama models from the chat footer", async () => {
  render(<UrAIChatPane />);
  fireEvent.click(screen.getByRole("button", { name: /choose model/i }));
  fireEvent.click(await screen.findByRole("menuitem", { name: "another-model" }));
  expect(fetchModels).toHaveBeenCalledWith("ollama");
  expect(setPromptConfigField).toHaveBeenCalledWith("model", "another-model");
  expect(setPromptConfigField).toHaveBeenCalledWith("provider", "ollama");
});

it("deletes a conversation from History only after confirmation", async () => {
  localStorage.clear();
  vi.mocked(nativeChat).mockResolvedValue({ text: "A reply worth testing", inputTokens: 1, outputTokens: 2, finishReason: "stop" });
  render(<UrAIChatPane />);
  const input = screen.getByRole("textbox", { name: "Message UrAI" });
  await waitFor(() => expect(input).toBeEnabled());
  fireEvent.change(input, { target: { value: "Brainstorm an ending" } });
  fireEvent.click(screen.getByRole("button", { name: "Send" }));
  await screen.findByText("A reply worth testing");
  const openDelete = async () => {
    fireEvent.click(await screen.findByRole("button", { name: "History" }));
    fireEvent.click(await screen.findByRole("button", { name: "Delete chat: Brainstorm an ending" }));
  };
  await openDelete();
  fireEvent.click(await screen.findByRole("button", { name: "Cancel" }));
  expect(screen.getByText("A reply worth testing")).toBeInTheDocument();
  await openDelete();
  fireEvent.click(await screen.findByRole("button", { name: "Delete chat", exact: true }));
  expect(await screen.findByText("Talk through your screenplay")).toBeInTheDocument();
  expect(screen.queryByText("A reply worth testing")).not.toBeInTheDocument();
});

it("passes the live screenplay statistics to Rust when the writer asks for them", async () => {
  localStorage.clear();
  vi.mocked(nativeChat).mockClear();
  vi.mocked(nativeChat).mockResolvedValue({ text: "There are two scenes.", inputTokens: 1, outputTokens: 2, finishReason: "stop" });
  render(<UrAIChatPane />);
  const input = screen.getByRole("textbox", { name: "Message UrAI" });
  await waitFor(() => expect(input).toBeEnabled());
  fireEvent.change(input, { target: { value: "How many scenes are there?" } });
  fireEvent.click(screen.getByRole("button", { name: "Send" }));
  fireEvent.click(await screen.findByRole("button", { name: "Allow" }));
  expect(await screen.findByText("There are two scenes.")).toBeInTheDocument();
  expect(vi.mocked(nativeChat).mock.calls[0][2]).toMatchObject({
    compactHistory: true,
    reading: { statisticsCategory: "overview", statistics: { overview: { scenes: 2 } }, indexRequested: false },
  });
});

it("asks for access and reads the current unsaved text of the printed scene", async () => {
  localStorage.clear();
  vi.mocked(nativeChat).mockClear();
  const unregister = registerPendingEditor("draft", vi.fn(), (name) => name === "draft.fountain"
    ? "INT. ROOM - DAY #15A#\n\nMaya waits.\n\nEXT. ROAD - NIGHT #16#\n\nMaya leaves with the letter."
    : undefined);
  try {
    render(<UrAIChatPane />);
    const input = screen.getByRole("textbox", { name: "Message UrAI" });
    await waitFor(() => expect(input).toBeEnabled());
    fireEvent.change(input, { target: { value: "Read the 16th scene" } });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));
    expect(nativeChat).not.toHaveBeenCalled();
    fireEvent.click(await screen.findByRole("button", { name: "Allow" }));
    expect(await screen.findByText(/Maya leaves with the letter/)).toBeInTheDocument();
    fireEvent.click(await screen.findByRole("button", { name: "Scene 16" }));
    expect(mocks.scroll).toHaveBeenCalledWith(4);
    expect(nativeChat).not.toHaveBeenCalled();
  } finally {
    unregister();
  }
});

it("dispatches indexing only for an explicit whole-screenplay read", async () => {
  localStorage.clear();
  vi.mocked(nativeChat).mockClear();
  vi.mocked(nativeChat).mockResolvedValue({ text: "The draft overview", inputTokens: 1, outputTokens: 2, finishReason: "stop" });
  render(<UrAIChatPane />);
  const input = screen.getByRole("textbox", { name: "Message UrAI" });
  await waitFor(() => expect(input).toBeEnabled());
  fireEvent.change(input, { target: { value: "Discuss scene 16" } });
  fireEvent.click(screen.getByRole("button", { name: "Send" }));
  fireEvent.click(await screen.findByRole("button", { name: "Allow" }));
  await screen.findByText("The draft overview");
  expect(vi.mocked(nativeChat).mock.calls[0][2].reading).toMatchObject({ indexRequested: false, focusIds: [2] });
  fireEvent.change(input, { target: { value: "Read my whole screenplay" } });
  fireEvent.click(screen.getByRole("button", { name: "Send" }));
  await waitFor(() => expect(vi.mocked(nativeChat).mock.calls[1]?.[2].reading).toMatchObject({ indexRequested: true, focusIds: [] }));
});
