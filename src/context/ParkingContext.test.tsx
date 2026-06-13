import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import React from "react";
import { UIProvider } from "./UIContext";
import { FileProvider } from "./FileContext";
import { EditorProvider } from "./EditorContext";
import { CustomModalProvider } from "./CustomModalContext";
import { ParkingProvider, useParking } from "./ParkingContext";

function wrapper({ children }: { children: React.ReactNode }) {
  return React.createElement(UIProvider, null,
    React.createElement(CustomModalProvider, null,
      React.createElement(FileProvider, null,
        React.createElement(EditorProvider, null,
          React.createElement(ParkingProvider, null, children)
        )
      )
    )
  );
}

describe("ParkingContext", () => {
  it("starts with empty parking items", () => {
    const { result } = renderHook(() => useParking(), { wrapper });
    expect(result.current.items).toEqual([]);
  });

  it("provides addItem and removeItem functions", () => {
    const { result } = renderHook(() => useParking(), { wrapper });
    expect(typeof result.current.addItem).toBe("function");
    expect(typeof result.current.removeItem).toBe("function");
  });

  it("does not add empty items", () => {
    const { result } = renderHook(() => useParking(), { wrapper });
    act(() => result.current.addItem(""));
    expect(result.current.items).toEqual([]);
    act(() => result.current.addItem("   "));
    expect(result.current.items).toEqual([]);
  });
});
