import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { registerPendingEditor } from "../editor/pendingEdits";
import { nativeChat } from "../lib/urai";
import { sceneRef } from "../lib/uraiSources";
import { parseScreenplay } from "../parser";
import { UrAIPanel } from "./UrAIPanel";

const mocks = vi.hoisted(() => ({
  scroll: vi.fn(),
  updateSettings: vi.fn(),
  endpoint: "http://localhost:11434",
  project: "panel-project",
  text: "",
}));
vi.mock("../context", () => ({
  useFile: () => ({
    parsedDoc: parseScreenplay(mocks.text), rawText: mocks.text,
    filePath: "project.actone", activeFileId: mocks.project, scriptFileName: "draft.fountain",
    activeScriptIndex: 0, scripts: [], updateSettings: mocks.updateSettings,
  }),
  useEditor: () => ({ scrollToLine: mocks.scroll }),
  useCursor: () => ({ activeLineNumber: 1 }),
  useUI: () => ({ paperSize: "letter" }),
}));
vi.mock("../hooks/usePromptConfig", () => ({
  usePromptConfig: () => ({ provider: "ollama", ollamaUrl: mocks.endpoint, model: "fixture", chatTemp: 0 }),
  getActiveModelName: () => "fixture",
  fetchModels: vi.fn(async () => []),
}));
vi.mock("../hooks/useApiList", () => ({ useApiList: () => [] }));
vi.mock("./ai/UrAIAbout", () => ({ UrAIAbout: () => null }));
vi.mock("../lib/urai", async (original) => ({
  ...await original<typeof import("../lib/urai")>(),
  loadNativeSessions: vi.fn(async () => null),
  saveNativeSessions: vi.fn(async () => undefined),
  nativeChat: vi.fn(async (_config, _messages, options) => {
    const source = options.reading?.scenes.find(({ id }) => id === options.reading?.focusIds[0]);
    if (source) options.onTool?.({ name: "read_requested_source", result: "Full requested scenes", sources: [sceneRef(source)] });
    return { text: "She leaves because of the letter.", inputTokens: 100, outputTokens: 9, finishReason: "stop" };
  }),
}));

async function submit(text: string) {
  const composer = screen.getByPlaceholderText("Message UrAI...");
  await waitFor(() => expect(composer).toBeEnabled());
  fireEvent.change(composer, { target: { value: text } });
  fireEvent.click(await screen.findByRole("button", { name: "Send message" }));
}

describe("UrAI screenplay chat", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    mocks.endpoint = "http://localhost:11434";
    mocks.text = [
      ...Array.from({ length: 71 }, (_, index) => `INT. ROOM ${index + 1} - DAY\n\nAn unrelated scene.`),
      "EXT. RIVER - NIGHT #67#\n\nMAYA\nI found the note.",
      "EXT. ROAD - NIGHT #68#\n\nMaya leaves.",
    ].join("\n\n");
  });

  it("reads the explicitly numbered scene and an unflushed editor edit, then continues after reopening", async () => {
    const unregister = registerPendingEditor(mocks.project, vi.fn(), (name) =>
      name === "draft.fountain" ? mocks.text.replace("I found the note.", "I found the letter.") : undefined);
    try {
      const panel = render(<UrAIPanel />);
      await submit("What happens in scene 67?");
      expect(nativeChat).not.toHaveBeenCalled();
      fireEvent.click(screen.getByRole("button", { name: "Allow" }));
      await screen.findByText("She leaves because of the letter.");
      const first = vi.mocked(nativeChat).mock.calls[0][2].reading!;
      expect(first.focusIds).toEqual([72]);
      expect(first.scenes[71].text).toContain("I found the letter.");
      fireEvent.click(await screen.findByRole("button", { name: "Scene 67" }));
      expect(mocks.scroll).toHaveBeenCalledWith(first.scenes[71].startLine - 1);

      panel.unmount();
      render(<UrAIPanel />);
      await screen.findByText("She leaves because of the letter.");
      await submit("What happens in the next scene?");
      fireEvent.click(screen.getByRole("button", { name: "Allow" }));
      await waitFor(() => expect(nativeChat).toHaveBeenCalledTimes(2));
      const [, history, options] = vi.mocked(nativeChat).mock.calls[1];
      expect(history.map(({ content }) => content)).toEqual([
        "What happens in scene 67?", "She leaves because of the letter.", "What happens in the next scene?",
      ]);
      expect(options.reading?.focusIds).toEqual([73]);
    } finally {
      unregister();
    }
  });

  it("saves a scene-linked note only after the writer reviews it", async () => {
    render(<UrAIPanel />);
    await submit("What happens in scene 67?");
    fireEvent.click(screen.getByRole("button", { name: "Allow" }));
    await screen.findByText("She leaves because of the letter.");
    await submit("Save that as a revision note for scene 67");
    expect(await screen.findByRole("textbox", { name: "Scene note" })).toHaveValue("She leaves because of the letter.");
    expect(mocks.updateSettings).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Save note" }));
    expect(mocks.updateSettings.mock.calls[0][0]({})).toMatchObject({
      uraiNotes: { "draft.fountain": [{ kind: "revision", scene: { label: "67", id: 72 } }] },
    });
    expect(nativeChat).toHaveBeenCalledOnce();
  });

  it("shows the printed scene for a direct ordinal read without asking the model", async () => {
    render(<UrAIPanel />);
    await submit("read 67th scene");
    fireEvent.click(screen.getByRole("button", { name: "Allow" }));
    expect(await screen.findByText(/I found the note\./)).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: "Scene 67" })).toBeInTheDocument();
    expect(nativeChat).not.toHaveBeenCalled();
  });

  it("summarizes scene 16 even when 15A is the 16th scene in the draft", async () => {
    mocks.text = [
      ...Array.from({ length: 15 }, (_, index) => `INT. ROOM ${index + 1} - DAY #${index + 1}#\n\nAn earlier scene.`),
      "EXT. RIVER - NIGHT #15A#\n\nMaya stays.",
      "EXT. ROAD - NIGHT #16#\n\nMaya leaves.",
    ].join("\n\n");
    render(<UrAIPanel />);
    await submit("read 16th scene and summarise me");
    fireEvent.click(screen.getByRole("button", { name: "Allow" }));
    expect(await screen.findByRole("button", { name: "Scene 16" })).toBeInTheDocument();
    expect(vi.mocked(nativeChat).mock.calls[0][2].reading?.focusIds).toEqual([17]);
  });
});
