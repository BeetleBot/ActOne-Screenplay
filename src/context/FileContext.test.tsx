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

  it("preserves the selected .actOne path when opening a file via openFilePath", async () => {
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
    expect(activeFile?.filePath).toBe("C:/scripts/my_movie.actOne");
    expect(result.current.filePath).toBe("C:/scripts/my_movie.actOne");
  });

  it("preserves the selected .actOne path when saving a file via saveFileAs", async () => {
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
      expect(savedPath).toBe("C:/scripts/new_movie.actOne");
    });

    const activeFile = result.current.files.find((f) => f.id === result.current.activeFileId);
    expect(activeFile?.filePath).toBe("C:/scripts/new_movie.actOne");
    expect(result.current.filePath).toBe("C:/scripts/new_movie.actOne");
  });

  it("opens case-distinct Linux projects separately and saves to the original path", async () => {
    const bytes = Array.from(packActoneBundle(
      [{ name: "Script", fileName: "files/script.fountain", content: "hello", savedContent: "hello" }], {}
    ));
    vi.mocked(invoke).mockImplementation(async (cmd: string) => cmd === "read_file_binary" ? bytes : null);
    const { result } = renderHook(() => useFile(), { wrapper });
    await act(async () => { await result.current.openFilePath("/home/me/Movie.ACTONE"); });
    await act(async () => { await result.current.openFilePath("/home/me/movie.actone"); });
    expect(result.current.files.map(file => file.filePath)).toEqual(
      expect.arrayContaining(["/home/me/Movie.ACTONE", "/home/me/movie.actone"])
    );
    await act(async () => { await result.current.openFilePath("/home/me/Movie.ACTONE"); });
    vi.mocked(invoke).mockClear();
    await act(async () => { await result.current.saveFile(); });
    expect(invoke).toHaveBeenCalledWith("save_file_binary", expect.objectContaining({ path: "/home/me/Movie.ACTONE" }));
  });

  it("uses the granted folder path for Save As", async () => {
    vi.mocked(invoke).mockImplementation(async (cmd: string) => {
      if (cmd === "save_file_dialog") return "/run/user/1000/doc/file/Movie.ACTONE";
      if (cmd === "prepare_project_path") return "/run/user/1000/doc/folder/Movie.ACTONE";
      return null;
    });
    const { result } = renderHook(() => useFile(), { wrapper });
    await act(async () => { result.current.newFile(); });
    await act(async () => {
      expect(await result.current.saveFileAs()).toBe("/run/user/1000/doc/folder/Movie.ACTONE");
    });
    expect(invoke).toHaveBeenCalledWith("save_file_binary", expect.objectContaining({ path: "/run/user/1000/doc/folder/Movie.ACTONE" }));
  });

  it("manages saveStatus transition during file saving", async () => {
    vi.mocked(invoke).mockImplementation(async (cmd, _args) => {
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

  it("syncs active script edits when calling saveFileAs for an actone project", async () => {
    let savedBytes: number[] | null = null;
    vi.mocked(invoke).mockImplementation(async (cmd: string, args?: unknown) => {
      if (cmd === "save_file_dialog") {
        return "C:/scripts/renamed.actone";
      }
      if (cmd === "save_file_binary") {
        const payload = args as { bytes: number[] };
        savedBytes = payload.bytes;
        return null;
      }
      return null;
    });

    const { result } = renderHook(() => useFile(), { wrapper });

    await act(async () => {
      result.current.newFile("Initial script content");
    });

    await act(async () => {
      result.current.setRawText("Updated text before Save As");
    });

    await act(async () => {
      await result.current.saveFileAs();
    });

    expect(savedBytes).not.toBeNull();
    const unpacked = unpackActoneBundle(new Uint8Array(savedBytes!));
    expect(unpacked.scripts[0].content).toBe("Updated text before Save As");
  });

  it("does not overwrite active tab when background parse completes for an older tab", async () => {
    const { result } = renderHook(() => useFile(), { wrapper });

    await act(async () => {
      result.current.newFile("Tab 1 original");
    });
    const tab1Id = result.current.activeFileId;

    await act(async () => {
      result.current.setRawText("Tab 1 fast typing");
    });

    await act(async () => {
      result.current.newFile("Tab 2 fresh");
    });
    const tab2Id = result.current.activeFileId;
    expect(tab2Id).not.toBe(tab1Id);

    // Wait for the 100ms debounce
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 150));
    });

    expect(result.current.activeFileId).toBe(tab2Id);
    expect(result.current.rawText).toBe("Tab 2 fresh");
    const tab1 = result.current.files.find(f => f.id === tab1Id);
    expect(tab1?.rawText).toBe("Tab 1 fast typing");
  });

  it("opens external .pdf file via openFilePath as untitled project without immediate save", async () => {
    vi.mocked(invoke).mockImplementation(async (cmd: string, args: any) => {
      if (cmd === "parse_pdf_to_fountain" && args.path.endsWith(".pdf")) {
        return "INT. COFFEE SHOP - DAY\n\nJOHN\nHello from PDF!";
      }
      return null;
    });

    const { result } = renderHook(() => useFile(), { wrapper });

    await act(async () => {
      await result.current.openFilePath("C:/scripts/Just_Married.pdf");
    });

    const activeFile = result.current.files.find(f => f.id === result.current.activeFileId);
    expect(activeFile).toBeDefined();
    // Project filePath must be null (unsaved Untitled project)
    expect(activeFile?.filePath).toBeNull();
    expect(activeFile?.isDirty).toBe(true);
    // Script inside should retain the imported file name
    expect(activeFile?.scripts?.[0].name).toBe("Just_Married");
    expect(activeFile?.rawText).toContain("Hello from PDF!");
  });

  it("opens external .fdx file via openFilePath converting to fountain", async () => {
    vi.mocked(invoke).mockImplementation(async (cmd: string, args: any) => {
      if (cmd === "read_file_content" && args.path.endsWith(".fdx")) {
        return `<?xml version="1.0" encoding="UTF-8"?><FinalDraft DocumentType="Script" Template="No" Version="1"><Content><Paragraph Type="Scene Heading"><Text>INT. HOUSE - NIGHT</Text></Paragraph></Content></FinalDraft>`;
      }
      return null;
    });

    const { result } = renderHook(() => useFile(), { wrapper });

    await act(async () => {
      await result.current.openFilePath("C:/scripts/MyScreenplay.fdx");
    });

    const activeFile = result.current.files.find(f => f.id === result.current.activeFileId);
    expect(activeFile).toBeDefined();
    expect(activeFile?.filePath).toBeNull();
    expect(activeFile?.scripts?.[0].name).toBe("MyScreenplay");
    expect(activeFile?.rawText).toContain("INT. HOUSE - NIGHT");
  });

  it("opens external .md file via openFilePath as prose document", async () => {
    vi.mocked(invoke).mockImplementation(async (cmd: string, args: any) => {
      if (cmd === "read_file_content" && args.path.endsWith(".md")) {
        return "# My Treatment Notes\n\nSome prose content here.";
      }
      return null;
    });

    const { result } = renderHook(() => useFile(), { wrapper });

    await act(async () => {
      await result.current.openFilePath("C:/scripts/Treatment.md");
    });

    const activeFile = result.current.files.find(f => f.id === result.current.activeFileId);
    expect(activeFile).toBeDefined();
    expect(activeFile?.filePath).toBeNull();
    expect(activeFile?.scripts?.[0].name).toBe("Treatment");
    expect(activeFile?.scripts?.[0].type).toBe("markdown");
    expect(activeFile?.rawText).toContain("My Treatment Notes");
  });

  it("imports .pdf via importScriptFromPath into the current active project", async () => {
    const mockedBytes = Array.from(
      packActoneBundle(
        [{ name: "Episode 1", fileName: "files/Episode_1.fountain", content: "INT. LAB - DAY", savedContent: "INT. LAB - DAY" }],
        {}
      )
    );
    vi.mocked(invoke).mockImplementation(async (cmd: string, args: any) => {
      if (cmd === "read_file_binary" && args.path.endsWith(".actone")) {
        return mockedBytes;
      }
      if (cmd === "parse_pdf_to_fountain" && args.path.endsWith(".pdf")) {
        return "INT. OFFICE - DAY\n\nSALLY\nHey!";
      }
      return null;
    });

    const { result } = renderHook(() => useFile(), { wrapper });

    await act(async () => {
      await result.current.openFilePath("C:/scripts/series.actone");
    });

    expect(result.current.scripts.length).toBe(1);

    await act(async () => {
      await result.current.importScriptFromPath("C:/downloads/Episode_2.pdf");
    });

    expect(result.current.scripts.length).toBe(2);
    expect(result.current.scripts[1].name).toBe("Episode_2");
    expect(result.current.scripts[1].type).toBe("fountain");
    expect(result.current.rawText).toContain("SALLY");
  });

  it("imports .md via importScriptFromPath as prose into the current active project", async () => {
    const mockedBytes = Array.from(
      packActoneBundle(
        [{ name: "Episode 1", fileName: "files/Episode_1.fountain", content: "INT. LAB - DAY", savedContent: "INT. LAB - DAY" }],
        {}
      )
    );
    vi.mocked(invoke).mockImplementation(async (cmd: string, args: any) => {
      if (cmd === "read_file_binary" && args.path.endsWith(".actone")) {
        return mockedBytes;
      }
      if (cmd === "read_file_content" && args.path.endsWith(".md")) {
        return "# Character Bible\n\nDetails about characters.";
      }
      return null;
    });

    const { result } = renderHook(() => useFile(), { wrapper });

    await act(async () => {
      await result.current.openFilePath("C:/scripts/series.actone");
    });

    await act(async () => {
      await result.current.importScriptFromPath("C:/downloads/Character_Bible.md");
    });

    expect(result.current.scripts.length).toBe(2);
    expect(result.current.scripts[1].name).toBe("Character_Bible");
    expect(result.current.scripts[1].type).toBe("markdown");
    expect(result.current.rawText).toContain("Character Bible");
  });

  it("discards stale parse results if rawText has changed while an async parse was in flight", async () => {
    const { result } = renderHook(() => useFile(), { wrapper });

    await act(async () => {
      result.current.newFile("Initial");
    });

    await act(async () => {
      result.current.setRawText("Stale Edit");
      result.current.setRawText("Latest Edit");
    });

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 150));
    });

    const activeF = result.current.files.find(f => f.id === result.current.activeFileId);
    expect(activeF?.rawText).toBe("Latest Edit");
  });

  it("updates script content via updateFileScriptContent and preserves latest update", async () => {
    const { result } = renderHook(() => useFile(), { wrapper });

    await act(async () => {
      result.current.newFile("Initial");
    });

    const fileId = result.current.activeFileId!;

    await act(async () => {
      await result.current.updateFileScriptContent(fileId, 0, "First Script Edit");
    });

    let activeF = result.current.files.find(f => f.id === fileId);
    expect(activeF?.rawText).toBe("First Script Edit");

    await act(async () => {
      const p1 = result.current.updateFileScriptContent(fileId, 0, "Second Edit");
      const p2 = result.current.updateFileScriptContent(fileId, 0, "Third Edit");
      await Promise.all([p1, p2]);
    });

    activeF = result.current.files.find(f => f.id === fileId);
    expect(activeF?.rawText).toBe("Third Edit");
  });
});


describe("remembered project document", () => {
  it.each([
    { method: "path", index: 1 }, { method: "dialog", index: 1 },
    { method: "path", index: 2 }, { method: "dialog", index: 2 },
  ].flatMap(test => [ { ...test, blank: false }, { ...test, blank: true } ]))(
    "reopens document $index through $method with blank=$blank after other projects and a new app session", async ({ method, index, blank }) => {
    localStorage.clear();
    vi.clearAllMocks();
    (window as unknown as Record<string, unknown>).__TAURI_INTERNALS__ = {};
    const prose = Array.from({ length: 80 }, (_, index) => `Line ${index + 1}`).join("\n");
    const bytes = Array.from(packActoneBundle([
      { name: "Screenplay", fileName: "files/script.fountain", content: "INT. ROOM - DAY\n\nHello.", savedContent: "INT. ROOM - DAY\n\nHello." },
      { name: "Test", fileName: "files/test.md", content: prose, savedContent: prose, type: "markdown" },
      { name: "Second Script", fileName: "files/second.fountain", content: "EXT. PARK - DAY\n\nA second script.", savedContent: "EXT. PARK - DAY\n\nA second script." },
    ], {}));
    vi.mocked(invoke).mockImplementation(async (command) => {
      if (command === "read_file_binary") return bytes;
      if (command === "open_file_dialog") return { path: "C:/projects/file1.actone", content: "" };
      return null;
    });
    const first = renderHook(() => useFile(), { wrapper });
    await act(async () => { await first.result.current.openFilePath("C:/projects/file1.actone"); });
    act(() => first.result.current.setActiveScript(index));
    const originalText = first.result.current.rawText;
    const originalSettings = structuredClone(first.result.current.parsedDoc.settings);
    await act(async () => { await first.result.current.closeFile(first.result.current.activeFileId); });
    await act(async () => { await first.result.current.openFilePath("C:/projects/file2.actone"); });
    first.unmount();
    const reopened = renderHook(() => useFile(), { wrapper });
    if (blank) act(() => reopened.result.current.newFile());
    await act(async () => {
      if (method === "path") await reopened.result.current.openFilePath("C:/projects/file1.actone");
      else await reopened.result.current.openFile();
    });
    expect(reopened.result.current.activeScriptIndex).toBe(index);
    expect(reopened.result.current.scriptFileName).toBe(index === 1 ? "files/test.md" : "files/second.fountain");
    expect(reopened.result.current.rawText).toBe(originalText);
    expect(reopened.result.current.parsedDoc.screenplayText).toBe(originalText);
    const file = reopened.result.current.files.find(file => file.id === reopened.result.current.activeFileId);
    expect(file?.isDirty).toBe(false);
    expect(file?.parsedDoc.settings).toEqual(originalSettings);
    expect(vi.mocked(invoke).mock.calls.some(([command]) => command === "save_file_binary")).toBe(false);
    reopened.unmount();
  });
});
