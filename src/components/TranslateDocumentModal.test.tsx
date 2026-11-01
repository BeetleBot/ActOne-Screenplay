import { beforeEach, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { TranslateDocumentModal } from "./TranslateDocumentModal";

const mocks = vi.hoisted(() => ({
  invoke: vi.fn(),
  duplicate: vi.fn(),
  update: vi.fn(),
  setJob: vi.fn(),
  config: {
    provider: "ollama", model: "test-model", ollamaUrl: "http://localhost:11434",
    apiModel: "", apiEndpoint: "", apiKey: "", translateLanguages: ["French"],
    translatePrompt: "Translate naturally.", translateTemp: 0.2,
  },
  source: "INT. ROOM - DAY\n\nMAYA\nHello there.\n\nEXT. PARK - DAY\n\nMaya walks home.",
}));
vi.mock("@tauri-apps/api/core", () => ({ invoke: mocks.invoke }));
vi.mock("@tauri-apps/api/event", () => ({ listen: vi.fn(async () => vi.fn()) }));
vi.mock("../lib/urai", async original => ({
  ...(await original<typeof import("../lib/urai")>()), isUrAIDesktop: () => true,
}));
vi.mock("../hooks/usePromptConfig", () => ({
  usePromptConfig: () => mocks.config,
  fetchModels: async () => [],
  getActiveModelName: () => "test-model",
}));
vi.mock("../hooks/useApiList", () => ({ useApiList: () => [] }));
vi.mock("../context", () => ({
  useUI: () => ({
    isTranslationModalOpen: true, translationState: "idle", translationJob: null,
    translationSetupTarget: null, setIsTranslationModalOpen: vi.fn(),
    setTranslationSetupTarget: vi.fn(), setTranslationState: vi.fn(),
    setTranslatingTarget: vi.fn(), setTranslationJob: mocks.setJob,
    registerTranslationAbort: vi.fn(), getTranslationState: () => "running",
  }),
  useFile: () => ({
    scripts: [{ name: "Source.fountain", content: mocks.source }], activeScriptIndex: 0,
    activeFileId: "source-file", duplicateScript: mocks.duplicate,
    updateFileScriptContent: mocks.update, setActiveScript: vi.fn(),
  }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  mocks.config.provider = "ollama";
  mocks.duplicate.mockResolvedValue("Source-French");
});

it("starts whole-document translation on the first click and writes every scene to the duplicate", async () => {
  mocks.invoke.mockImplementation(async (command, { request }) => {
    expect(command).toBe("urai_run_job");
    const { job } = request;
    expect(job.totalScenes).toBe(2);
    expect(job.items.map((item: { element: { text: string } }) => item.element.text))
      .toEqual(["Hello there.", "Maya walks home."]);
    expect(job.instructions).toContain("Keep Maya unchanged.");
    expect(job.instructions).toContain("Preserve all character names exactly.");
    expect(job.instructions).not.toMatch(/glossary/i);
    const lines = [...job.lines];
    for (const item of job.items) {
      lines[item.line] = item.prefix + (item.scene === 0 ? "Bonjour." : "Maya rentre chez elle.") + item.suffix;
    }
    return { ...job, lines, completed: job.items.map((item: { element: { id: string } }) => item.element.id), status: "completed" };
  });
  render(<TranslateDocumentModal />);
  expect(screen.queryByText(/prepare glossary/i)).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("Custom Instructions (optional)"), { target: { value: "  Keep Maya unchanged.  " } });
  fireEvent.click(screen.getByRole("button", { name: "Start Translation" }));
  await waitFor(() => expect(mocks.update).toHaveBeenLastCalledWith(
    "source-file", 1,
    ".INT. ROOM - DAY\n\n@MAYA\nBonjour.\n\n.EXT. PARK - DAY\n\n!Maya rentre chez elle.",
    "Source-French",
  ));
  expect(mocks.duplicate).toHaveBeenCalledExactlyOnceWith(0, "Source-French", true);
  expect(mocks.invoke).toHaveBeenCalledTimes(1);
  expect(mocks.source).toContain("Hello there.");
  const completed = mocks.setJob.mock.calls.at(-1)?.[0](null);
  expect(completed).toMatchObject({ state: "completed", completedScenes: 2, translatedLines: 2 });
});

it("still validates the model before duplicating or sending a translation", async () => {
  mocks.config.provider = "none";
  render(<TranslateDocumentModal />);
  fireEvent.click(screen.getByRole("button", { name: "Start Translation" }));
  expect(await screen.findByText(/AI model is not configured/)).toBeInTheDocument();
  expect(mocks.duplicate).not.toHaveBeenCalled();
  expect(mocks.invoke).not.toHaveBeenCalled();
});
