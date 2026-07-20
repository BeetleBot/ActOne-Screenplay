import { useState, useCallback, useEffect, useRef } from "react";
import type { TourStep, TourWindow } from "../types/tour";
import { logger } from "../utils/logger";

interface UseTourCoordinatorOptions {
  steps: TourStep[];
  tourName: string;
  openModalWindow?: (windowName: TourWindow) => void;
  closeAllWindows?: () => Promise<void>;
  onComplete: () => void;
  onCancel: () => void;
}

interface UseTourCoordinatorResult {
  activeStep: number;
  currentStep: TourStep | null;
  progress: number;
  taskComplete: boolean;
  isLastStep: boolean;
  tourActive: boolean;
  closedWindowStep: TourStep | null;
  nextStep: () => void;
  previousStep: () => void;
  skipStep: () => void;
  cancelTour: () => void;
  retryWindowStep: () => void;
  dismissWindowPrompt: () => void;
}

export function useTourCoordinator({
  steps,
  tourName,
  openModalWindow,
  closeAllWindows,
  onComplete,
  onCancel,
}: UseTourCoordinatorOptions): UseTourCoordinatorResult {
  const [activeStep, setActiveStep] = useState(0);
  const [tourActive, setTourActive] = useState(false);
  const [taskComplete, setTaskComplete] = useState(false);
  const [closedWindowStep, setClosedWindowStep] = useState<TourStep | null>(null);
  const emmitedStepRef = useRef<number>(-1);

  const currentStep = steps[activeStep] ?? null;
  const progress = steps.length > 0 ? ((activeStep + 1) / steps.length) * 100 : 0;
  const isLastStep = activeStep >= steps.length - 1;

  useEffect(() => {
    setActiveStep(0);
    setTaskComplete(false);
    setTourActive(steps.length > 0);
    setClosedWindowStep(null);
    emmitedStepRef.current = -1;
  }, [steps, tourName]);

  const pendingWindowRef = useRef<{ window: string; stepIndex: number } | null>(null);

  const emitStep = useCallback(async (stepIndex: number) => {
    const step = steps[stepIndex];
    if (!step) return;

    const isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
    if (!isTauri) return;

    try {
      if (step.window && step.window !== "main") {
        const { emitTo } = await import("@tauri-apps/api/event");
        await emitTo(step.window, "tour:step", {
          step,
          index: stepIndex,
          total: steps.length,
          tourName,
        });
        emmitedStepRef.current = stepIndex;
      }
    } catch (e) {
      logger.error("tourCoordinator", "Failed to emit tour step", e);
    }
  }, [steps, tourName]);

  const emitCancel = useCallback(async () => {
    const isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
    if (!isTauri) return;
    try {
      const { emitTo } = await import("@tauri-apps/api/event");
      const windows: TourWindow[] = ["settings", "theme-manager", "xray", "tag-manager"];
      for (const w of windows) {
        await emitTo(w, "tour:cancel", {});
      }
    } catch (e) {
      void e;
    }
  }, []);

  const emitComplete = useCallback(async () => {
    const isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
    if (!isTauri) return;
    try {
      const { emitTo } = await import("@tauri-apps/api/event");
      const windows: TourWindow[] = ["settings", "theme-manager", "xray", "tag-manager"];
      for (const w of windows) {
        await emitTo(w, "tour:complete", {});
      }
    } catch (e) {
      void e;
    }
  }, []);

  const advanceToStep = useCallback(async (index: number) => {
    if (index < 0 || index >= steps.length) return;

    setActiveStep(index);
    setTaskComplete(false);
    setClosedWindowStep(null);

    const step = steps[index];
    if (!step) return;

    const windowName = step.window || "main";

    if (windowName === "main") {
      // Main window step: auto-complete task if no validation needed
      if (!step.validate && !step.detect) {
        setTaskComplete(true);
      }
    } else if (["settings", "theme-manager", "xray", "tag-manager"].includes(windowName)) {
      // Tauri window step: open the window
      if (openModalWindow) {
        openModalWindow(windowName as TourWindow);
      }
      // Wait for tour:listener-ready from the target window before emitting
      pendingWindowRef.current = { window: windowName, stepIndex: index };
      setTimeout(() => {
        if (pendingWindowRef.current) {
          emitStep(pendingWindowRef.current.stepIndex);
          pendingWindowRef.current = null;
        }
      }, 3000);
      setTaskComplete(true);
    } else {
      // In-window modal step: just open the modal and wait
      if (step.triggerOpen) {
        step.triggerOpen();
      }
      if (!step.validate && !step.detect) {
        setTaskComplete(true);
      }
    }
  }, [steps, openModalWindow, emitStep]);

  const nextStep = useCallback(async () => {
    if (activeStep < steps.length - 1) {
      await advanceToStep(activeStep + 1);
    } else {
      // Last step completed
      await emitComplete();
      onComplete();
    }
  }, [activeStep, steps.length, advanceToStep, emitComplete, onComplete]);

  const previousStep = useCallback(async () => {
    if (activeStep > 0) {
      await advanceToStep(activeStep - 1);
    }
  }, [activeStep, advanceToStep]);

  const skipStep = useCallback(async () => {
    await nextStep();
  }, [nextStep]);

  const cancelTour = useCallback(async () => {
    await emitCancel();
    if (closeAllWindows) {
      await closeAllWindows();
    }
    setTourActive(false);
    setActiveStep(0);
    setTaskComplete(false);
    setClosedWindowStep(null);
    onCancel();
  }, [emitCancel, closeAllWindows, onCancel]);

  const retryWindowStep = useCallback(async () => {
    if (closedWindowStep) {
      const stepIndex = steps.indexOf(closedWindowStep);
      if (stepIndex >= 0) {
        setClosedWindowStep(null);
        const w = closedWindowStep.window;
        if (w && openModalWindow && ["settings", "theme-manager", "xray", "tag-manager"].includes(w)) {
          openModalWindow(w);
          setTimeout(() => emitStep(stepIndex), 300);
        }
      }
    }
  }, [closedWindowStep, steps, openModalWindow, emitStep]);

  const dismissWindowPrompt = useCallback(() => {
    setClosedWindowStep(null);
  }, []);

  // Validate/detect polling
  useEffect(() => {
    if (!tourActive || !currentStep || currentStep.window && currentStep.window !== "main") {
      return;
    }

    if (currentStep.validate) {
      const { editorView } = (window as any).__TOUR_EDITOR__ || {};
      if (!editorView) return;

      const interval = setInterval(() => {
        const text = editorView.state.doc.toString();
        if (currentStep.validate!(text)) {
          setTaskComplete(true);
        }
      }, 200);
      return () => clearInterval(interval);
    }

    if (currentStep.detect) {
      const interval = setInterval(() => {
        if (currentStep.detect!()) {
          setTaskComplete(true);
          if (currentStep.autoAdvance) {
            nextStep();
          }
        }
      }, 200);
      return () => clearInterval(interval);
    }
  }, [tourActive, currentStep, nextStep]);

  // Shift+Enter to advance
  useEffect(() => {
    if (!tourActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter" && e.shiftKey && taskComplete) {
        e.preventDefault();
        e.stopPropagation();
        nextStep();
      }
    };

    document.addEventListener("keydown", handleKeyDown, { capture: true });
    return () => document.removeEventListener("keydown", handleKeyDown, { capture: true });
  }, [tourActive, taskComplete, nextStep]);

  const nextStepRef = useRef(nextStep);
  const cancelTourRef = useRef(cancelTour);
  const activeStepRef = useRef(activeStep);

  useEffect(() => {
    nextStepRef.current = nextStep;
    cancelTourRef.current = cancelTour;
    activeStepRef.current = activeStep;
  }, [nextStep, cancelTour, activeStep]);

  // Listen for tour:step-done and other events from modal windows
  useEffect(() => {
    const isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
    if (!isTauri) return;

    let unlisteners: (() => void)[] = [];

    const setup = async () => {
      try {
        const { listen } = await import("@tauri-apps/api/event");
        const uDone = await listen<{ stepIndex: number }>("tour:step-done", (event) => {
          const { stepIndex } = event.payload;
          if (stepIndex === activeStepRef.current) {
            setTaskComplete(true);
          }
        });
        const uCancel = await listen("tour:cancel", () => {
          cancelTourRef.current();
        });
        const uNextStep = await listen("tour:next-step", () => {
          nextStepRef.current();
        });
        unlisteners = [uDone, uCancel, uNextStep];
      } catch (e) {
        logger.error("tourCoordinator", "Failed to listen for events", e);
      }
    };

    setup();
    return () => {
      unlisteners.forEach((fn) => fn());
    };
  }, []);

  // Listen for tour:listener-ready from windows and emit pending step
  useEffect(() => {
    const isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
    if (!isTauri) return;

    let unlisten: (() => void) | undefined;

    const setup = async () => {
      try {
        const { listen } = await import("@tauri-apps/api/event");
        unlisten = await listen<{ window: string }>("tour:listener-ready", (event) => {
          const { window: w } = event.payload;
          if (pendingWindowRef.current && pendingWindowRef.current.window === w) {
            const idx = pendingWindowRef.current.stepIndex;
            pendingWindowRef.current = null;
            emitStep(idx);
          }
        });
      } catch (e) {
        logger.error("tourCoordinator", "Failed to listen for listener-ready", e);
      }
    };

    setup();
    return () => {
      if (unlisten) unlisten();
    };
  }, [emitStep]);

  // Listen for window close (from useModalWindows callback)
  useEffect(() => {
    if (!tourActive || !currentStep?.window) return;
    const w = currentStep.window;
    if (w === "main" || ["export", "structure", "title-page"].includes(w)) return;

    // The window close detection is handled via the onClose callback in useModalWindows
    // The coordinator exposes closedWindowStep which can be set externally
  }, [tourActive, currentStep]);

  // Initialize: start at step 0
  useEffect(() => {
    if (steps.length > 0 && !tourActive) {
      setTourActive(true);
      advanceToStep(0);
    }
  }, [steps]);

  return {
    activeStep,
    currentStep,
    progress,
    taskComplete,
    isLastStep,
    tourActive,
    closedWindowStep,
    nextStep,
    previousStep,
    skipStep,
    cancelTour,
    retryWindowStep,
    dismissWindowPrompt,
  };
}
