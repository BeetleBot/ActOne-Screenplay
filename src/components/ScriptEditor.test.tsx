import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import React from "react";

vi.mock("../context", () => ({
  useFile: () => ({ parsedDoc: null, activeScriptIndex: 0, activeScriptName: "script.fountain", duplicateScript: vi.fn(), activeFileId: "file1", updateFileScriptContent: vi.fn() }),
  useUI: () => ({ fontFamily: "font-courier", setActiveRightPane: vi.fn(), setActiveTab: vi.fn(), setAiStatus: vi.fn(), translationState: "idle", setTranslationState: vi.fn(), registerTranslationAbort: vi.fn() }),
  useCustomModal: () => ({ prompt: vi.fn() }),
  useEditor: () => ({ updateSettings: vi.fn() }),
  useParking: () => ({ addItem: vi.fn() }),
}));

vi.mock("../editor", () => ({
  useScriptCodeMirror: () => ({ current: null }),
}));

vi.mock("../hooks/usePromptConfig", () => ({
  usePromptConfig: () => ({
    rephrasePresets: [],
    translateLanguages: ["Spanish", "French"],
    rephraseTemp: 0.7,
    translateTemp: 0.3,
  }),
}));

import { ScriptEditor } from "./ScriptEditor";

describe("ScriptEditor Component", () => {
  it("renders without crashing and renders CoreEditor", () => {
    const { container } = render(<ScriptEditor />);
    expect(container.querySelector(".editor-font-wrapper")).toBeTruthy();
  });
});
