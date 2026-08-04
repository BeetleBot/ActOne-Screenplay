import { describe, it, expect } from "vitest";
import type { TourStep, TourWindow } from "./tour";

describe("TourStep type", () => {
  it("accepts a minimal valid step", () => {
    const step: TourStep = {
      title: "Minimal Step",
      description: "A minimal step with just required fields",
    };
    expect(step.title).toBe("Minimal Step");
    expect(step.description).toBe("A minimal step with just required fields");
  });

  it("accepts a fully populated step", () => {
    const step: TourStep = {
      targetId: "my-element",
      title: "Full Step",
      description: "A step with all optional fields",
      taskInstructions: "Do the thing",
      window: "theme-manager",
      validate: (text: string) => text.length > 0,
      detect: () => true,
      triggerOpen: () => {},
      noMask: true,
      cardPosition: "right",
      cardWidth: 260,
      nextLabel: "Continue",
      autoAdvance: true,
      noAutoClick: true,
    };
    expect(step.validate!("hello")).toBe(true);
    expect(step.detect!()).toBe(true);
    expect(step.cardWidth).toBe(260);
    expect(step.window).toBe("theme-manager");
  });

  it("allows all cardPosition values", () => {
    const positions: Array<"left" | "right" | "center"> = ["left", "right", "center"];
    for (const pos of positions) {
      const step: TourStep = { title: "Test", description: "Test", cardPosition: pos };
      expect(step.cardPosition).toBe(pos);
    }
  });
});

describe("TourWindow type", () => {
  it("allows all valid window values", () => {
    const windows: TourWindow[] = ["main", "settings", "theme-manager", "xray", "export", "structure", "title-page"];
    for (const w of windows) {
      const step: TourStep = { title: "Test", description: "Test", window: w };
      expect(step.window).toBe(w);
    }
  });
});
