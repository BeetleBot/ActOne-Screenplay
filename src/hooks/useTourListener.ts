import { useState, useEffect, useCallback, useRef } from "react";
import type { TourStep, TourWindow } from "../types/tour";
import { logger } from "../utils/logger";

interface UseTourListenerResult {
  currentStep: TourStep | null;
  tourName: string;
  progress: number;
  taskComplete: boolean;
  isLastStep: boolean;
  currentIndex: number;
  totalSteps: number;
  markStepDone: () => void;
  cancelTour: () => void;
  completeTour: () => void;
}

export function useTourListener(windowName: TourWindow): UseTourListenerResult {
  const [currentStep, setCurrentStep] = useState<TourStep | null>(null);
  const [tourName, setTourName] = useState("");
  const [progress, setProgress] = useState(0);
  const [totalSteps, setTotalSteps] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [taskComplete, setTaskComplete] = useState(false);
  const [, setActive] = useState(false);
  const markStepDoneRef = useRef(false);

  const handleStep = useCallback((step: TourStep, index: number, total: number, name: string) => {
    setCurrentStep(step);
    setCurrentIndex(index);
    setTotalSteps(total);
    setTourName(name);
    setProgress(((index + 1) / total) * 100);
    setTaskComplete(index === total - 1);
    setActive(true);
    markStepDoneRef.current = false;
  }, []);

  const handleCancel = useCallback(() => {
    setCurrentStep(null);
    setActive(false);
    markStepDoneRef.current = false;
  }, []);

  const markStepDone = useCallback(() => {
    if (markStepDoneRef.current) return;
    markStepDoneRef.current = true;
    setTaskComplete(true);
  }, []);

  const cancelTour = useCallback(() => {
    handleCancel();
  }, [handleCancel]);

  const completeTour = useCallback(() => {
    setCurrentStep(null);
    setActive(false);
  }, []);

  useEffect(() => {
    const isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
    if (!isTauri) return;

    let unlisteners: (() => void)[] = [];

    const setup = async () => {
      try {
        const { listen } = await import("@tauri-apps/api/event");

        const u1 = await listen<{
          step: TourStep;
          index: number;
          total: number;
          tourName: string;
        }>("tour:step", (event) => {
          const { step, index, total, tourName: name } = event.payload;
          if (step.window === windowName) {
            handleStep(step, index, total, name);
          }
        });

        const u2 = await listen("tour:cancel", () => {
          handleCancel();
        });

        const u3 = await listen("tour:complete", () => {
          setCurrentStep(null);
          setActive(false);
        });

        unlisteners = [u1, u2, u3];

        const { emitTo } = await import("@tauri-apps/api/event");
        emitTo("main", "tour:listener-ready", { window: windowName });
      } catch (e) {
        logger.error("tourListener", "Failed to set up event listeners", e);
      }
    };

    setup();
    return () => {
      unlisteners.forEach((fn) => fn());
    };
  }, [windowName, handleStep, handleCancel]);

  const isLastStep = currentStep !== null && currentIndex >= totalSteps - 1;

  return {
    currentStep,
    tourName,
    progress,
    taskComplete,
    isLastStep,
    currentIndex,
    totalSteps,
    markStepDone,
    cancelTour,
    completeTour,
  };
}
