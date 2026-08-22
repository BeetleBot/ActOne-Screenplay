import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import React from "react";
import { UIProvider } from "./UIContext";
import { FileProvider, useFile } from "./FileContext";
import { CustomModalProvider } from "./CustomModalContext";
import { packActoneBundle, unpackActoneBundle } from "../utils";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

import { invoke } from "@tauri-apps/api/core";

function wrapper({ children }: { children: React.ReactNode }) {
  return React.createElement(UIProvider, null,
    React.createElement(CustomModalProvider, null,
      React.createElement(FileProvider, null, children)
    )
  );
}

describe("FileContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (window as unknown as Record<string, unknown>).__TAURI_INTERNALS__ = {};
  });

  it("normalizes .actOne path to .actone when opening a file via openFilePath", async () => {
    const mockedBytes = Array.from(
      packActoneBundle(
        [{ name: "Test Script", fileName: "document.fountain", content: "hello", savedContent: "hello" }],
        {}
      )
    );
    vi.mocked(invoke).mockImplementation(async (cmd: string, _args: { path: string }) => {
      if (cmd === "read_file_binary" && _args.path.endsWith(".actOne")) {
        return mockedBytes;
      }
      return null;
    });

    const { result } = renderHook(() => useFile(), { wrapper });

    await act(async () => {
      await result.current.openFilePath("C:/scripts/my_movie.actOne");
    });

    const activeFile = result.current.files.find((f) => f.id === result.current.activeFileId);
    expect(activeFile).toBeDefined();
    expect(activeFile?.filePath).toBe("C:/scripts/my_movie.actone");
    expect(result.current.filePath).toBe("C:/scripts/my_movie.actone");
  });

  it("normalizes .actOne path to .actone when saving a file via saveFileAs", async () => {
    vi.mocked(invoke).mockImplementation(async (cmd: string) => {
      if (cmd === "save_file_dialog") {
        return "C:/scripts/new_movie.actOne";
      }
      if (cmd === "save_file_binary") {
        return null;
      }
      return null;
    });

    const { result } = renderHook(() => useFile(), { wrapper });

    await act(async () => {
      result.current.newFile();
    });

    await act(async () => {
      const savedPath = await result.current.saveFileAs();
      expect(savedPath).toBe("C:/scripts/new_movie.actone");
    });

    const activeFile = result.current.files.find((f) => f.id === result.current.activeFileId);
    expect(activeFile?.filePath).toBe("C:/scripts/new_movie.actone");
    expect(result.current.filePath).toBe("C:/scripts/new_movie.actone");
  });

  it("manages saveStatus transition during file saving", async () => {
    vi.mocked(invoke).mockImplementation(async (cmd, _args) => {
      if (cmd === "save_file_dialog") {
        return "C:/scripts/new_movie.actone";
      }
      if (cmd === "save_file_binary") {
        return null;
      }
      return null;
    });

    const { result } = renderHook(() => useFile(), { wrapper });

    await act(async () => {
      result.current.newFile();
    });

    expect(result.current.saveStatus).toBe("idle");

    let savePromise;
    act(() => {
      savePromise = result.current.saveFileAs();
    });

    // Right after starting the async save operation, saveStatus should be "saving"
    expect(result.current.saveStatus).toBe("saving");

    await act(async () => {
      await savePromise;
    });

    // After resolution, it should transition to "saved"
    expect(result.current.saveStatus).toBe("saved");
  });

  it("duplicates a script with a custom name when provided", async () => {
    const { result } = renderHook(() => useFile(), { wrapper });

    await act(async () => {
      result.current.newFile("INT. ROOM - DAY");
    });

    await act(async () => {
      const newName = await result.current.duplicateScript(0, "Untitled-Tamil");
      expect(newName).toBe("Untitled-Tamil");
    });

    expect(result.current.scripts.map((s) => s.name)).toEqual(["Untitled", "Untitled-Tamil"]);
    expect(result.current.activeScriptIndex).toBe(1);
  });

  it("falls back to a unique suffixed name when the custom name already exists", async () => {
    const { result } = renderHook(() => useFile(), { wrapper });

    await act(async () => {
      result.current.newFile("INT. ROOM - DAY");
    });

    await act(async () => {
      const first = await result.current.duplicateScript(0, "Untitled-Tamil");
      expect(first).toBe("Untitled-Tamil");
    });

    await act(async () => {
      const second = await result.current.duplicateScript(0, "Untitled-Tamil");
      expect(second).toBe("Untitled-Tamil (2)");
    });

    expect(result.current.scripts.map((s) => s.name)).toEqual([
      "Untitled",
      "Untitled-Tamil (2)",
      "Untitled-Tamil",
    ]);
  });

  it("uses the default suffixed name when no custom name is provided", async () => {
    const { result } = renderHook(() => useFile(), { wrapper });

    await act(async () => {
      result.current.newFile("INT. ROOM - DAY");
    });

    await act(async () => {
      const newName = await result.current.duplicateScript(0);
      expect(newName).toBe("Untitled (2)");
    });

    expect(result.current.scripts.map((s) => s.name)).toEqual(["Untitled", "Untitled (2)"]);
  });

  it("preserves prose document content when saving an actone bundle", async () => {
    let savedBytes: number[] | null = null;
    const initialProseContent = "# Treatment\n\nThis is a prose document.";
    const mockedBytes = Array.from(
      packActoneBundle(
        [
          { name: "Treatment", fileName: "files/Treatment.md", type: "markdown", content: initialProseContent, savedContent: initialProseContent },
          { name: "Script", fileName: "files/Script.fountain", type: "fountain", content: "INT. ROOM - DAY\n\nHi.", savedContent: "INT. ROOM - DAY\n\nHi." },
        ],
        {}
      )
    );

    vi.mocked(invoke).mockImplementation(async (cmd: string, args?: unknown) => {
      if (cmd === "read_file_binary") {
        return mockedBytes;
      }
      if (cmd === "save_file_binary") {
        const payload = args as { path: string; bytes: number[] };
        savedBytes = payload.bytes;
        return null;
      }
      return null;
    });

    const { result } = renderHook(() => useFile(), { wrapper });

    await act(async () => {
      await result.current.openFilePath("C:/scripts/project.actone");
    });

    expect(result.current.rawText).toBe(initialProseContent);
    expect(result.current.scripts[0].content).toBe(initialProseContent);

    await act(async () => {
      await result.current.saveFile();
    });

    expect(savedBytes).not.toBeNull();
    const unpacked = unpackActoneBundle(new Uint8Array(savedBytes!));
    expect(unpacked.scripts[0].content).toBe(initialProseContent);
    expect(unpacked.scripts[1].content).toBe("INT. ROOM - DAY\n\nHi.");
  });

  it("saves the target file directly during targeted saveFile call", async () => {
    let savedContent: string | null = null;
    vi.mocked(invoke).mockImplementation(async (cmd: string, args?: unknown) => {
      if (cmd === "save_file_content") {
        const payload = args as { path: string; content: string };
        savedContent = payload.content;
        return null;
      }
      return null;
    });

    const { result } = renderHook(() => useFile(), { wrapper });

    await act(async () => {
      result.current.newFile("ACTIVE TAB CONTENT");
    });

    const activeId = result.current.activeFileId;

    await act(async () => {
      result.current.newFile("SECOND TAB CONTENT");
    });

    const secondId = result.current.activeFileId;
    expect(secondId).not.toBe(activeId);

    // Give the second file a path
    await act(async () => {
      result.current.files.find(f => f.id === secondId)!.filePath = "/path/second.fountain";
    });

    await act(async () => {
      await result.current.saveFile(secondId);
    });

    expect(savedContent).toBe("SECOND TAB CONTENT");
  });

  it("opens snapshot as a new unsaved project with null filePath", async () => {
    const initialProseContent = "# Treatment Notes";
    const mockedBytes = Array.from(
      packActoneBundle(
        [
          { name: "Treatment", fileName: "files/Treatment.md", type: "markdown", content: initialProseContent, savedContent: initialProseContent },
        ],
        {}
      )
    );

    vi.mocked(invoke).mockImplementation(async (cmd: string) => {
      if (cmd === "read_file_binary") {
        return mockedBytes;
      }
      return null;
    });

    const { result } = renderHook(() => useFile(), { wrapper });

    await act(async () => {
      await result.current.openSnapshotAsNewProject("/project/.snapshots/project_20260822_190000.actone");
    });

    expect(result.current.filePath).toBeNull();
    const activeF = result.current.files.find(f => f.id === result.current.activeFileId);
    expect(activeF?.isDirty).toBe(true);
    expect(result.current.rawText).toBe(initialProseContent);
    expect(result.current.recentFiles.some(f => f.path.includes(".snapshots"))).toBe(false);
  });
});


