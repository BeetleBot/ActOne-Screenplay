import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { renderHook, act } from "@testing-library/react";
import { UIProvider } from "../context/UIContext";
import { FileProvider, useFile } from "../context/FileContext";
import { CustomModalProvider } from "../context/CustomModalContext";
import { packActoneBundle, unpackActoneBundle } from "../utils";
import * as tauriCore from "@tauri-apps/api/core";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

function wrapper({ children }: { children: React.ReactNode }) {
  return React.createElement(
    UIProvider,
    null,
    React.createElement(
      CustomModalProvider,
      null,
      React.createElement(FileProvider, null, children),
    ),
  );
}

describe("Desktop Workflow Integration: Open -> Edit -> Save -> Close -> Reopen", () => {
  const virtualDisk = new Map<string, Uint8Array>();

  beforeEach(() => {
    vi.clearAllMocks();
    virtualDisk.clear();
    (window as any).__TAURI_INTERNALS__ = {};

    vi.mocked(tauriCore.invoke).mockImplementation(async (cmd: string, args: any) => {
      if (cmd === "save_file_dialog") {
        return "C:/projects/screenplay_test.actOne";
      }
      if (cmd === "prepare_project_path") {
        return args?.path ?? "C:/projects/screenplay_test.actOne";
      }
      if (cmd === "save_actone_bundle") {
        const bytes = packActoneBundle(args.scripts, args.settings || {});
        virtualDisk.set(args.path, bytes);
        return undefined;
      }
      if (cmd === "read_actone_bundle") {
        const stored = virtualDisk.get(args.path);
        if (stored) {
          return unpackActoneBundle(stored);
        }
        return null;
      }
      return null;
    });
  });

  it("drives full lifecycle: create -> edit -> save -> close -> reopen", async () => {
    const { result } = renderHook(() => useFile(), { wrapper });

    // 1. Initial State: Create a new project
    act(() => {
      result.current.newFile();
    });

    const activeFile = result.current.files.find((f) => f.id === result.current.activeFileId);
    expect(activeFile).toBeDefined();

    // 2. Edit screenplay text across scenes
    const editedText = [
      "INT. WRITER'S ROOM - DAY",
      "",
      "A writer types furiously.",
      "",
      "CHARACTER",
      "We finally have an integration test!",
      "",
      "EXT. PARKING LOT - NIGHT",
      "",
      "The car drives away.",
    ].join("\n");

    act(() => {
      result.current.setRawText(editedText);
    });

    expect(result.current.rawText).toBe(editedText);

    // 3. Save the project to disk via saveFileAs
    await act(async () => {
      const savedPath = await result.current.saveFileAs();
      expect(savedPath).toBe("C:/projects/screenplay_test.actOne");
    });

    expect(result.current.filePath).toBe("C:/projects/screenplay_test.actOne");
    expect(virtualDisk.has("C:/projects/screenplay_test.actOne")).toBe(true);

    // 4. Close the document
    const fileIdToClose = result.current.activeFileId;
    await act(async () => {
      await result.current.closeFile(fileIdToClose);
    });

    expect(result.current.files.find((f) => f.id === fileIdToClose)).toBeUndefined();

    // 5. Reopen the saved document from virtual disk
    await act(async () => {
      await result.current.openFilePath("C:/projects/screenplay_test.actOne");
    });

    // 6. Verify full integrity of reopened document
    const reopenedFile = result.current.files.find((f) => f.filePath === "C:/projects/screenplay_test.actOne");
    expect(reopenedFile).toBeDefined();
    expect(reopenedFile?.filePath).toBe("C:/projects/screenplay_test.actOne");
    expect(reopenedFile?.scripts[0]?.content).toBe(editedText);
    expect(reopenedFile?.scripts[0]?.fileName).toBe("files/document.fountain");
  });
});
