import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import React from "react";
import { ThemeProvider, useTheme } from "./ThemeContext";

function wrapper({ children }: { children: React.ReactNode }) {
  return React.createElement(ThemeProvider, null, children);
}

describe("ThemeContext", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("provides default theme values", () => {
    const { result } = renderHook(() => useTheme(), { wrapper });
    expect(result.current.theme).toBeTruthy();
    expect(result.current.mode).toMatch(/^(light|dark)$/);
    expect(typeof result.current.toggleMode).toBe("function");
    expect(result.current.customThemes).toEqual([]);
  });

  it("toggles theme mode", () => {
    const { result } = renderHook(() => useTheme(), { wrapper });
    const initialMode = result.current.mode;
    act(() => result.current.toggleMode());
    expect(result.current.mode).not.toBe(initialMode);
  });

  it("sets a specific theme", () => {
    const { result } = renderHook(() => useTheme(), { wrapper });
    act(() => result.current.setTheme("dark"));
    expect(result.current.theme).toBe("dark");
    act(() => result.current.setTheme("light"));
    expect(result.current.theme).toBe("light");
  });

  it("adds a custom theme", () => {
    const { result } = renderHook(() => useTheme(), { wrapper });
    act(() => {
      result.current.addCustomTheme("My Theme", false, {
        editor: "#fff", text: "#000", accent: "#0061a4",
        sidebar: "#f5f5f5", button: "#0061a4",
        selectionText: "#000", selectionBg: "rgba(0,0,0,0.1)",
        dropdown: "#fff", dropdownText: "#000",
        border: "rgba(0,0,0,0.1)", textSecondary: "rgba(0,0,0,0.54)",
      });
    });
    expect(result.current.customThemes).toHaveLength(1);
    expect(result.current.customThemes[0].name).toBe("My Theme");
  });

  it("deletes a custom theme", () => {
    const { result } = renderHook(() => useTheme(), { wrapper });
    let id: string;
    act(() => {
      id = result.current.addCustomTheme("My Theme", false, {
        editor: "#fff", text: "#000", accent: "#0061a4",
        sidebar: "#f5f5f5", button: "#0061a4",
        selectionText: "#000", selectionBg: "rgba(0,0,0,0.1)",
        dropdown: "#fff", dropdownText: "#000",
        border: "rgba(0,0,0,0.1)", textSecondary: "rgba(0,0,0,0.54)",
      });
    });
    act(() => result.current.deleteCustomTheme(id));
    expect(result.current.customThemes).toHaveLength(0);
  });

  it("updates a custom theme", () => {
    const { result } = renderHook(() => useTheme(), { wrapper });
    let id: string;
    act(() => {
      id = result.current.addCustomTheme("My Theme", false, {
        editor: "#fff", text: "#000", accent: "#0061a4",
        sidebar: "#f5f5f5", button: "#0061a4",
        selectionText: "#000", selectionBg: "rgba(0,0,0,0.1)",
        dropdown: "#fff", dropdownText: "#000",
        border: "rgba(0,0,0,0.1)", textSecondary: "rgba(0,0,0,0.54)",
      });
    });
    act(() => result.current.updateCustomTheme(id, "Updated", true, {
      editor: "#111", text: "#fff", accent: "#a0caff",
      sidebar: "#222", button: "#a0caff",
      selectionText: "#fff", selectionBg: "rgba(160,202,255,0.25)",
      dropdown: "#242628", dropdownText: "#fff",
      border: "rgba(255,255,255,0.1)", textSecondary: "rgba(255,255,255,0.54)",
    }));
    expect(result.current.customThemes[0].name).toBe("Updated");
    expect(result.current.customThemes[0].isDark).toBe(true);
  });
});
