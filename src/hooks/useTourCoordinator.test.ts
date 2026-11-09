import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useTourCoordinator } from "./useTourCoordinator";
import type { TourStep } from "../types/tour";

vi.mock("@tauri-apps/api/event", () => ({
  emit: vi.fn().mockResolvedValue(undefined),
  listen: vi.fn().mockResolvedValue(() => {}),
}));

describe("useTourCoordinator hook", () => {
  const sampleSteps: TourStep[] = [
    {
      id: "step1",
      window: "main",
      title: "Step 1",
      content: "First step",
      target: "#btn1",
    },
    {
      id: "step2",
      window: "main",
      title: "Step 2",
      content: "Second step",
      target: "#btn2",
    },
    {
      id: "step3",
      window: "settings",
      title: "Step 3",
      content: "Settings step",
      target: "#btn3",
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (window as any).__TAURI_INTERNALS__ = {};
  });

  afterEach(() => {
    delete (window as any).__TAURI_INTERNALS__;
  });

  it("initializes with first step and correct progress", () => {
    const onComplete = vi.fn();
    const onCancel = vi.fn();
    const { result } = renderHook(() =>
      useTourCoordinator({
        steps: sampleSteps,
        tourName: "intro-tour",
        onComplete,
        onCancel,
      }),
    );

    expect(result.current.activeStep).toBe(0);
    expect(result.current.currentStep?.id).toBe("step1");
    expect(result.current.progress).toBeCloseTo((1 / 3) * 100);
    expect(result.current.isLastStep).toBe(false);
  });

  it("navigates forward with nextStep and backward with previousStep", async () => {
    const onComplete = vi.fn();
    const onCancel = vi.fn();
    const { result } = renderHook(() =>
      useTourCoordinator({
        steps: sampleSteps,
        tourName: "intro-tour",
        onComplete,
        onCancel,
      }),
    );

    await act(async () => {
      await result.current.nextStep();
    });
    expect(result.current.activeStep).toBe(1);
    expect(result.current.currentStep?.id).toBe("step2");

    await act(async () => {
      await result.current.previousStep();
    });
    expect(result.current.activeStep).toBe(0);
    expect(result.current.currentStep?.id).toBe("step1");
  });

  it("calls onComplete when advancing past the last step", async () => {
    const onComplete = vi.fn();
    const onCancel = vi.fn();
    const singleStep: TourStep[] = [
      {
        id: "step1",
        window: "main",
        title: "Single",
        content: "Only step",
      },
    ];

    const { result } = renderHook(() =>
      useTourCoordinator({
        steps: singleStep,
        tourName: "single-tour",
        onComplete,
        onCancel,
      }),
    );

    await act(async () => {
      await result.current.nextStep();
    });
    expect(onComplete).toHaveBeenCalled();
  });

  it("calls onCancel when cancelTour is called", async () => {
    const onComplete = vi.fn();
    const onCancel = vi.fn();
    const { result } = renderHook(() =>
      useTourCoordinator({
        steps: sampleSteps,
        tourName: "intro-tour",
        onComplete,
        onCancel,
      }),
    );

    await act(async () => {
      await result.current.cancelTour();
    });
    expect(onCancel).toHaveBeenCalled();
  });
});
