import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { render, screen } from "@testing-library/react";
import { WelcomeScreenWindow } from "./WelcomeScreen";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn().mockResolvedValue([]),
}));

vi.mock("@tauri-apps/api/event", () => ({
  listen: vi.fn().mockResolvedValue(() => {}),
}));

vi.mock("../hooks/useStoreUpdateCheck", () => ({
  useStoreUpdateCheck: () => ({
    updateAvailable: null,
    installUpdate: vi.fn(),
  }),
}));

vi.mock("../context/WindowContext", () => ({
  useModalWindows: () => ({
    openHelpWindow: vi.fn(),
  }),
}));

vi.mock("@tauri-apps/api/window", () => ({
  getCurrentWindow: () => ({
    close: vi.fn(),
    minimize: vi.fn(),
    startDragging: vi.fn(),
  }),
}));

const mockRecentFiles = Array.from({ length: 12 }).map((_, i) => ({
  path: `/fake/path/script${i}.fountain`,
  name: `Script ${i}.fountain`,
  lastOpened: Date.now() - i * 60000,
}));

vi.mock("../context/FileContext", () => ({
  useFile: () => ({
    newFile: vi.fn(),
    openFile: vi.fn(),
    recentFiles: mockRecentFiles,
    openFilePath: vi.fn(),
    removeFromRecent: vi.fn(),
  }),
}));

vi.mock("../context/ThemeContext", () => ({
  useTheme: () => ({
    theme: "light",
    setTheme: vi.fn(),
    mode: "light",
    toggleMode: vi.fn(),
    customThemes: [],
    addCustomTheme: vi.fn(),
    updateCustomTheme: vi.fn(),
    deleteCustomTheme: vi.fn(),
  }),
}));

describe("WelcomeScreenWindow", () => {
  beforeAll(() => {
    vi.stubGlobal("__APP_VERSION__", "test-version");
    vi.stubGlobal("__APP_CHANNEL__", "beta");
  });

  afterAll(() => {
    vi.unstubAllGlobals();
  });

  it("renders up to 10 recent files", () => {
    render(<WelcomeScreenWindow />);

    for (let i = 0; i < 10; i++) {
      expect(screen.getByText(`Script ${i}.fountain`)).toBeInTheDocument();
    }

    expect(screen.queryByText("Script 10.fountain")).not.toBeInTheDocument();
    expect(screen.queryByText("Script 11.fountain")).not.toBeInTheDocument();
  });

  it("renders the version number in the header and status bar", () => {
    render(<WelcomeScreenWindow />);
    expect(screen.getAllByText("vtest-version [beta]").length).toBe(2);
  });

  it("renders the Welcome To ActOne title", () => {
    render(<WelcomeScreenWindow />);
    expect(screen.getByText("Welcome To ActOne!")).toBeInTheDocument();
  });

  it("renders a quote on screen", () => {
    render(<WelcomeScreenWindow />);
    const quoteChars = screen.getAllByText(/["\u201c]/);
    expect(quoteChars.length).toBeGreaterThan(0);
  });

  it("renders action cards with labels", () => {
    render(<WelcomeScreenWindow />);
    expect(screen.getByText("New Project")).toBeInTheDocument();
    expect(screen.getByText("Open Project")).toBeInTheDocument();
    expect(screen.getByText("Templates")).toBeInTheDocument();
    expect(screen.getByText("Sample Screenplays")).toBeInTheDocument();
    expect(screen.getByText("Tutorials")).toBeInTheDocument();
  });

  it("shows keyboard shortcut hints on New and Open", () => {
    render(<WelcomeScreenWindow />);
    expect(screen.getByText("Ctrl+N")).toBeInTheDocument();
    expect(screen.getByText("Ctrl+O")).toBeInTheDocument();
  });

  it("shows Coming soon on Sample Screenplays", () => {
    render(<WelcomeScreenWindow />);
    expect(screen.getByText("Coming soon")).toBeInTheDocument();
  });

  it("shows Interactive tours on Tutorials", () => {
    render(<WelcomeScreenWindow />);
    expect(screen.getByText("Interactive tours")).toBeInTheDocument();
  });

  it("renders Discord and Help buttons", () => {
    render(<WelcomeScreenWindow />);
    expect(screen.getByText("Discord")).toBeInTheDocument();
    expect(screen.getByLabelText("Help")).toBeInTheDocument();
  });

  it("renders Recent files header", () => {
    render(<WelcomeScreenWindow />);
    expect(screen.getByText("Recent files")).toBeInTheDocument();
  });

  it("does not show update button when no update available", () => {
    render(<WelcomeScreenWindow />);
    expect(screen.queryByText("Update Available")).not.toBeInTheDocument();
  });

  it("renders the Structure template subtitle on Templates", () => {
    render(<WelcomeScreenWindow />);
    expect(screen.getByText("Structure template")).toBeInTheDocument();
  });
});
