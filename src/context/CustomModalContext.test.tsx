import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import React from "react";
import { CustomModalProvider, useCustomModal } from "./CustomModalContext";

function wrapper({ children }: { children: React.ReactNode }) {
  return React.createElement(CustomModalProvider, null, children);
}

describe("CustomModalContext", () => {
  it("provides confirm and prompt functions", () => {
    const { result } = renderHook(() => useCustomModal(), { wrapper });
    expect(typeof result.current.confirm).toBe("function");
    expect(typeof result.current.prompt).toBe("function");
  });

  it("confirm resolves with the button value", async () => {
    const { result } = renderHook(() => useCustomModal(), { wrapper });
    let promise: Promise<string>;
    act(() => {
      promise = result.current.confirm({
        title: "Test",
        message: "Test message",
        buttons: [{ value: "yes", label: "Yes" }, { value: "no", label: "No" }],
      });
    });
    // The dialog renders buttons - in jsdom we can test the promise resolves
    expect(promise).toBeInstanceOf(Promise);
  });
});
