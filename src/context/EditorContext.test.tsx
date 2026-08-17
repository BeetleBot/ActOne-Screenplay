import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import React from "react";
import { UIProvider } from "./UIContext";
import { CustomModalProvider } from "./CustomModalContext";
import { FileProvider } from "./FileContext";
import { EditorProvider, useEditor } from "./EditorContext";

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
        React.createElement(EditorProvider, null, children)
      )
    )
  );
}

describe("EditorContext", () => {
  it("provides generic editor functions and initial state", () => {
    const { result } = renderHook(() => useEditor(), { wrapper });
    expect(result.current.editorView).toBeNull();
    expect(typeof result.current.setEditorView).toBe("function");
    expect(typeof result.current.scrollToLine).toBe("function");
    expect(typeof result.current.updateLineText).toBe("function");
    expect(typeof result.current.updateSettings).toBe("function");
  });

  it("throws error when used outside EditorProvider", () => {
    expect(() => {
      renderHook(() => useEditor());
    }).toThrow("useEditor must be used within an EditorProvider");
  });
});
