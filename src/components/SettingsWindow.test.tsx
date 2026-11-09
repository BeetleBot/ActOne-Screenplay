import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor, act, cleanup } from "@testing-library/react";
import { SettingsWindow } from "./SettingsWindow";
import { resetPrefsEngine } from "../theme/AppPrefsEngine";
import { invoke } from "@tauri-apps/api/core";
import { STORAGE_KEYS } from "../constants";
const native = vi.hoisted(() => ({
  stored: {} as Record<string, string>,
  changed: null as null | ((event: { payload: Record<string, string> }) => void),
}));

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn().mockImplementation((cmd, args) => {
    if (cmd === "get_installed_spellcheck_languages") return Promise.resolve([]);
    if (cmd === "get_available_spellcheck_languages") return Promise.resolve([]);
    if (cmd === "get_custom_words_count") return Promise.resolve(0);
    if (cmd === "get_app_prefs") return Promise.resolve({ ...native.stored });
    if (cmd === "set_app_prefs") {
      Object.assign(native.stored, args.prefs);
      native.changed?.({ payload: { ...native.stored } });
      return Promise.resolve();
    }
    if (cmd === "get_system_fonts") return Promise.resolve(["Courier Prime", "Arial"]);
    return Promise.resolve(null);
  }),
}));

vi.mock("@tauri-apps/api/event", () => ({
  listen: vi.fn().mockImplementation(async (name, callback) => {
    if (name === "app-prefs:changed") native.changed = callback;
    return () => {
      if (native.changed === callback) native.changed = null;
    };
  }),
  emit: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../theme/ThemeEngine", () => ({
  initThemeEngine: vi.fn().mockResolvedValue({}),
  getThemeState: vi.fn().mockReturnValue({ themeId: "default", customThemes: {} }),
  setThemeState: vi.fn().mockResolvedValue(undefined),
  onThemeChanged: vi.fn().mockReturnValue(() => {}),
}));

vi.mock("./TitleBar", () => ({
  TitleBar: () => <div data-testid="mock-titlebar">TitleBar</div>,
}));

vi.mock("./SystemFontPicker", () => ({
  SystemFontPicker: () => <div data-testid="mock-font-picker">FontPicker</div>,
}));

describe("SettingsWindow", () => {
  beforeEach(() => {
    resetPrefsEngine();
    vi.clearAllMocks();
    native.stored = {};
    native.changed = null;
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    resetPrefsEngine();
  });

  it("persists a changed setting and restores it after a fresh mount without localStorage", async () => {
    native.stored = { [STORAGE_KEYS.TYPEWRITER_MODE]: "false" };
    const first = render(<SettingsWindow />);
    fireEvent.click(screen.getByRole("button", { name: /^editor$/i }));
    await waitFor(() => expect(native.changed).toBeTypeOf("function"));
    const toggle = screen.getByLabelText("Typewriter Mode");
    await waitFor(() => expect(toggle).not.toBeChecked());
    fireEvent.click(toggle);
    await waitFor(() =>
      expect(invoke).toHaveBeenCalledWith("set_app_prefs", {
        prefs: { [STORAGE_KEYS.TYPEWRITER_MODE]: "true" },
      }),
    );
    expect(native.stored[STORAGE_KEYS.TYPEWRITER_MODE]).toBe("true");
    first.unmount();
    resetPrefsEngine();
    localStorage.clear();
    render(<SettingsWindow />);
    fireEvent.click(screen.getByRole("button", { name: /^editor$/i }));
    await waitFor(() => expect(screen.getByLabelText("Typewriter Mode")).toBeChecked());
  });

  it("applies settings from another window without writing them back", async () => {
    render(<SettingsWindow />);
    fireEvent.click(screen.getByRole("button", { name: /^editor$/i }));
    await waitFor(() => expect(native.changed).toBeTypeOf("function"));
    vi.mocked(invoke).mockClear();
    act(() => native.changed!({ payload: { [STORAGE_KEYS.TYPEWRITER_MODE]: "true" } }));
    await waitFor(() => expect(screen.getByLabelText("Typewriter Mode")).toBeChecked());
    act(() => native.changed!({ payload: { [STORAGE_KEYS.TYPEWRITER_MODE]: "false" } }));
    await waitFor(() => expect(screen.getByLabelText("Typewriter Mode")).not.toBeChecked());
    expect(vi.mocked(invoke).mock.calls.some(([cmd]) => cmd === "set_app_prefs")).toBe(false);
  });

  it("renders without crashing with default General tab", () => {
    render(<SettingsWindow />);
    expect(screen.getByTestId("mock-titlebar")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^general$/i })).toBeInTheDocument();
    expect(screen.getByText(/LAYOUT & SCALE/i)).toBeInTheDocument();
  });

  it("switches tabs when tab buttons are clicked", () => {
    render(<SettingsWindow />);

    // Click on Editor tab
    const editorTab = screen.getByRole("button", { name: /^editor$/i });
    fireEvent.click(editorTab);
    expect(screen.getByText(/TYPOGRAPHY/i)).toBeInTheDocument();

    // Click on Spellcheck tab
    const spellcheckTab = screen.getByRole("button", { name: /^spellcheck$/i });
    fireEvent.click(spellcheckTab);
    expect(screen.getByRole("button", { name: /^snapshots$/i })).toBeInTheDocument();

    // Click on Snapshots tab
    const snapshotsTab = screen.getByRole("button", { name: /^snapshots$/i });
    fireEvent.click(snapshotsTab);

    // Click on UrAI tab
    const uraiTab = screen.getByRole("button", { name: /^urai$/i });
    fireEvent.click(uraiTab);
  });

  it("safely handles corrupted localStorage values without throwing", () => {
    localStorage.setItem("actone-zoom-level", "not-a-number");
    localStorage.setItem("actone-typewriter-mode", "corrupted-value");

    expect(() => render(<SettingsWindow />)).not.toThrow();
  });
});
