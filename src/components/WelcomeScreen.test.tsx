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
    openTutorialsWindow: vi.fn(),
  }),
}));

vi.mock("@tauri-apps/api/window", () => ({
  getCurrentWindow: () => ({
    close: vi.fn(),
    minimize: vi.fn(),
    maximize: vi.fn(),
    unmaximize: vi.fn(),
    isMaximized: vi.fn().mockResolvedValue(false),
    isResizable: vi.fn().mockResolvedValue(false),
    onResized: vi.fn().mockResolvedValue(() => {}),
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
    importAsActoneProject: vi.fn(),
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

  it("renders the version number in status bar", () => {
    render(<WelcomeScreenWindow />);
    expect(screen.getByText("vtest-version [beta]")).toBeInTheDocument();
  });

  it("renders the ActOne Screenplay title", () => {
    render(<WelcomeScreenWindow />);
    expect(screen.getByText("ActOne Screenplay")).toBeInTheDocument();
  });

  it("renders action cards with labels", () => {
    render(<WelcomeScreenWindow />);
    expect(screen.getByText("New Project")).toBeInTheDocument();
    expect(screen.getByText("Open Project")).toBeInTheDocument();
    expect(screen.getByText("Import Script")).toBeInTheDocument();
    expect(screen.getByText("Templates")).toBeInTheDocument();
    expect(screen.getByText("Tutorials")).toBeInTheDocument();
  });

  it("shows action button CTA labels", () => {
    render(<WelcomeScreenWindow />);
    expect(screen.getByText("Create")).toBeInTheDocument();
    expect(screen.getByText("Open")).toBeInTheDocument();
    expect(screen.getByText("Import")).toBeInTheDocument();
    expect(screen.getByText("Choose")).toBeInTheDocument();
    expect(screen.getByText("Start")).toBeInTheDocument();
  });

  it("renders Discord and Help buttons", () => {
    render(<WelcomeScreenWindow />);
    expect(screen.getByText("Discord")).toBeInTheDocument();
    expect(screen.queryByText("Theme")).not.toBeInTheDocument();
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
});
