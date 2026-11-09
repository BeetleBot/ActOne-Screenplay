import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useTourListener } from "./useTourListener";
import * as tauriEvent from "@tauri-apps/api/event";
import type { TourStep } from "../types/tour";

vi.mock("@tauri-apps/api/event", () => ({
  listen: vi.fn(),
  emitTo: vi.fn().mockResolvedValue(undefined),
  emit: vi.fn().mockResolvedValue(undefined),
}));

describe("useTourListener hook", () => {
  let eventHandlers: Record<string, (e: any) => void> = {};

  beforeEach(() => {
    vi.clearAllMocks();
    eventHandlers = {};
    (window as any).__TAURI_INTERNALS__ = {};

    vi.mocked(tauriEvent.listen).mockImplementation(async (eventName, handler) => {
      eventHandlers[eventName] = handler;
      return () => {
        delete eventHandlers[eventName];
      };
    });
  });

  afterEach(() => {
    delete (window as any).__TAURI_INTERNALS__;
  });

  it("initializes in inactive state with empty currentStep", () => {
    const { result } = renderHook(() => useTourListener("settings"));
    expect(result.current.currentStep).toBeNull();
    expect(result.current.tourName).toBe("");
    expect(result.current.progress).toBe(0);
  });

  it("handles tour:step event directed to its window", async () => {
    const { result } = renderHook(() => useTourListener("settings"));

    // Allow setup effect to complete
    await act(async () => {
      await Promise.resolve();
    });

    const step: TourStep = {
      id: "step-settings",
      window: "settings",
      title: "Settings Step",
      content: "Explain settings",
    };

    act(() => {
      if (eventHandlers["tour:step"]) {
        eventHandlers["tour:step"]({
          payload: {
            step,
            index: 1,
            total: 3,
            tourName: "test-tour",
          },
        });
      }
    });

    expect(result.current.currentStep?.id).toBe("step-settings");
    expect(result.current.currentIndex).toBe(1);
    expect(result.current.totalSteps).toBe(3);
    expect(result.current.tourName).toBe("test-tour");
    expect(result.current.progress).toBeCloseTo((2 / 3) * 100);
  });

  it("resets when tour:cancel event is received", async () => {
    const { result } = renderHook(() => useTourListener("settings"));

    await act(async () => {
      await Promise.resolve();
    });

    const step: TourStep = {
      id: "step-settings",
      window: "settings",
      title: "Settings Step",
      content: "Explain settings",
    };

    act(() => {
      if (eventHandlers["tour:step"]) {
        eventHandlers["tour:step"]({
          payload: { step, index: 0, total: 1, tourName: "tour" },
        });
      }
    });
    expect(result.current.currentStep).not.toBeNull();

    act(() => {
      if (eventHandlers["tour:cancel"]) {
        eventHandlers["tour:cancel"]({ payload: {} });
      }
    });

    expect(result.current.currentStep).toBeNull();
  });
});
