import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import React from "react";
import { UIProvider } from "./UIContext";
import { CustomModalProvider } from "./CustomModalContext";
import { FileProvider, useFile } from "./FileContext";
import { EditorProvider } from "./EditorContext";
import { ScriptEditorProvider, useScriptEditor } from "./ScriptEditorContext";

function wrapper({ children }: { children: React.ReactNode }) {
  return React.createElement(
    UIProvider,
    null,
    React.createElement(
      CustomModalProvider,
      null,
      React.createElement(
        FileProvider,
        null,
        React.createElement(
          EditorProvider,
          null,
          React.createElement(ScriptEditorProvider, null, children)
        )
      )
    )
  );
}

describe("ScriptEditorContext", () => {
  it("provides screenplay specific operations", () => {
    const { result } = renderHook(() => useScriptEditor(), { wrapper });
    expect(typeof result.current.scrollToScene).toBe("function");
    expect(typeof result.current.reorderScenes).toBe("function");
    expect(typeof result.current.autoAddSceneNumbers).toBe("function");
    expect(typeof result.current.clearSceneNumbers).toBe("function");
    expect(typeof result.current.replaceSceneText).toBe("function");
  });

  it("throws error when used outside ScriptEditorProvider", () => {
    expect(() => {
      renderHook(() => useScriptEditor());
    }).toThrow("useScriptEditor must be used within a ScriptEditorProvider");
  });

  it("autoAddSceneNumbers and clearSceneNumbers correctly modify raw text", () => {
    const { result } = renderHook(
      () => ({
        script: useScriptEditor(),
        file: useFile(),
      }),
      { wrapper }
    );

    act(() => {
      result.current.file.newFile("INT. HOUSE - DAY\n\nSome action.\n\nEXT. PARK - NIGHT\n\nMore action.");
    });

    expect(result.current.file.rawText).toContain("INT. HOUSE - DAY");

    act(() => {
      result.current.script.autoAddSceneNumbers();
    });

    expect(result.current.file.rawText).toContain("INT. HOUSE - DAY #1#");
    expect(result.current.file.rawText).toContain("EXT. PARK - NIGHT #2#");

    act(() => {
      result.current.script.clearSceneNumbers();
    });

    expect(result.current.file.rawText).not.toContain("#1#");
    expect(result.current.file.rawText).not.toContain("#2#");
  });
});
