import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act, waitFor } from "@testing-library/react";
import React from "react";
import { ErrorBoundary } from "./ErrorBoundary";
import * as crashScreenModule from "./CrashScreen";

vi.mock("./CrashScreen", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./CrashScreen")>();
  return { ...actual, showCrashScreen: vi.fn() };
});

vi.mock("../constants/reporting", () => ({
  CRASH_REPORT_WEBHOOK_URL: "https://discord.example.test/webhook",
  ERROR_REPORT_QUEUE_KEY: "actone-error-report-queue",
  ERROR_REPORT_MAX_QUEUE: 50,
  CRASH_REPORT_WINDOW_KEY: "actone-crash-report-latest",
}));

const showCrashScreenMock = crashScreenModule.showCrashScreen as unknown as ReturnType<typeof vi.fn>;

describe("ErrorBoundary", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("renders children when there is no error", () => {
    render(
      React.createElement(ErrorBoundary, null,
        React.createElement("div", null, "Hello World")
      )
    );
    expect(screen.getByText("Hello World")).toBeTruthy();
  });

  it("renders a compact inline fallback when a child throws", () => {
    const ThrowingComponent = () => {
      throw new Error("Test error");
    };

    act(() => {
      render(
        React.createElement(ErrorBoundary, null,
          React.createElement(ThrowingComponent)
        )
      );
    });
    expect(screen.getByText(/COMPONENT/)).toBeTruthy();
    expect(screen.getByText("Test error")).toBeTruthy();
    expect(screen.getByText("Retry")).toBeTruthy();
  });

  it("reports a pane crash with pane severity without opening a crash window", () => {
    const ThrowingComponent = () => {
      throw new Error("Pane error");
    };

    act(() => {
      render(
        React.createElement(ErrorBoundary, { name: "outline" },
          React.createElement(ThrowingComponent)
        )
      );
    });
    expect(screen.getByText(/OUTLINE/)).toBeTruthy();
    expect(showCrashScreenMock).not.toHaveBeenCalled();
  });

  it("opens the crash window for a fullScreen boundary", () => {
    const ThrowingComponent = () => {
      throw new Error("App error");
    };

    act(() => {
      render(
        React.createElement(ErrorBoundary, { fullScreen: true, name: "app-root" },
          React.createElement(ThrowingComponent)
        )
      );
    });
    expect(showCrashScreenMock).toHaveBeenCalledTimes(1);
  });

  it("resets error state when Retry is clicked", async () => {
    let shouldThrow = true;
    const ThrowingComponent = () => {
      if (shouldThrow) throw new Error("Test error");
      return React.createElement("div", null, "Recovered");
    };

    let rerender: ReturnType<typeof render>["rerender"];
    act(() => {
      const result = render(
        React.createElement(ErrorBoundary, null,
          React.createElement(ThrowingComponent)
        )
      );
      rerender = result.rerender;
    });

    expect(screen.getByText(/COMPONENT/)).toBeTruthy();
    shouldThrow = false;
    act(() => {
      rerender(
        React.createElement(ErrorBoundary, null,
          React.createElement(ThrowingComponent)
        )
      );
    });
    act(() => {
      screen.getByText("Retry").click();
    });
    await waitFor(() => expect(screen.getByText("Recovered")).toBeTruthy());
  });
});
