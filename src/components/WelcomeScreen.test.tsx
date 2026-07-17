import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { render, screen } from "@testing-library/react";
import { WelcomeScreenWindow } from "./WelcomeScreen";

// Mock the tauri API
vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn().mockResolvedValue([]),
}));

vi.mock("@tauri-apps/api/event", () => ({
  listen: vi.fn().mockResolvedValue(() => {}),
}));

// Mock the update checker
vi.mock("../hooks/useStoreUpdateCheck", () => ({
  useStoreUpdateCheck: () => ({
    updateAvailable: null,
    installUpdate: vi.fn(),
  }),
}));

// Mock window context
vi.mock("../context/WindowContext", () => ({
  useModalWindows: () => ({
    openHelpWindow: vi.fn(),
  }),
}));

// Mock Window API
vi.mock("@tauri-apps/api/window", () => ({
  getCurrentWindow: () => ({
    close: vi.fn(),
  }),
}));

// Create 12 dummy recent files
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

describe("WelcomeScreenWindow", () => {
  beforeAll(() => {
    vi.stubGlobal("__APP_VERSION__", "test-version");
  });

  afterAll(() => {
    vi.unstubAllGlobals();
  });

  it("renders up to 10 recent files", () => {
    render(<WelcomeScreenWindow />);

    // It should display exactly 10 recent files
    for (let i = 0; i < 10; i++) {
      expect(screen.getByText(`Script ${i}.fountain`)).toBeInTheDocument();
    }
    
    // Items 10 and 11 should not be rendered
    expect(screen.queryByText("Script 10.fountain")).not.toBeInTheDocument();
    expect(screen.queryByText("Script 11.fountain")).not.toBeInTheDocument();
  });
});

