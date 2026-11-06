import { describe, it, expect } from "vitest";
import { UI_STEPS, FOUNTAIN_STEPS, ADVANCED_STEPS } from "./OnboardingTour";
import type { TourStep } from "../types/tour";

const ALL_STEP_SETS: [string, TourStep[], number][] = [
  ["UI_STEPS", UI_STEPS, UI_STEPS.length],
  ["FOUNTAIN_STEPS", FOUNTAIN_STEPS, FOUNTAIN_STEPS.length],
  ["ADVANCED_STEPS", ADVANCED_STEPS, ADVANCED_STEPS.length],
];

describe("Tour step arrays", () => {
  it.each(ALL_STEP_SETS)("%s has at least 2 steps", (_name, _steps, count) => {
    expect(count).toBeGreaterThanOrEqual(2);
  });

  describe("each step has required fields", () => {
    it.each(ALL_STEP_SETS)("%s", (_name, steps) => {
      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        expect(step.title, `Step ${i}: missing title`).toBeTruthy();
        expect(step.description, `Step ${i}: missing description`).toBeTruthy();
        expect(typeof step.title, `Step ${i}: title not a string`).toBe("string");
        expect(typeof step.description, `Step ${i}: description not a string`).toBe("string");
      }
    });
  });

  describe("window property is valid when present", () => {
    it.each(ALL_STEP_SETS)("%s", (_name, steps) => {
      const validWindows = ["main", "settings", "theme-manager", "xray", "export", "structure", "title-page"];
      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        if (step.window) {
          expect(validWindows, `Step ${i}: invalid window "${step.window}"`).toContain(step.window);
        }
      }
    });
  });

  describe("cardPosition is valid when present", () => {
    it.each(ALL_STEP_SETS)("%s", (_name, steps) => {
      const validPositions = ["left", "right", "center"];
      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        if (step.cardPosition) {
          expect(validPositions, `Step ${i}: invalid cardPosition "${step.cardPosition}"`).toContain(step.cardPosition);
        }
      }
    });
  });
});

describe("UI_STEPS", () => {
  it("starts with a welcome step (no targetId)", () => {
    expect(UI_STEPS[0].title).toBe("Welcome to ActOne!");
    expect(UI_STEPS[0].targetId).toBeUndefined();
  });

  it("has targetId for all action steps", () => {
    for (let i = 1; i < UI_STEPS.length; i++) {
      const step = UI_STEPS[i];
      if (!step.targetId && !step.validate && !step.detect) continue;
      expect(step.targetId, `Step ${i} "${step.title}" missing targetId`).toBeTruthy();
    }
  });

  it("landing pad step includes canvas format", () => {
    const landingStep = UI_STEPS.find((s) => s.targetId === "landing-pad");
    expect(landingStep).toBeDefined();
    expect(landingStep?.description).toContain(".canvas");
  });

  it("does not have obsolete status-xray step", () => {
    expect(UI_STEPS.some((s) => s.targetId === "status-xray")).toBe(false);
  });

  it("includes rich multi-step Timeline walkthrough with forced scrubbing", () => {
    const timelineSteps = UI_STEPS.filter((s) => s.targetId === "timeline-view");
    expect(timelineSteps.length).toBeGreaterThanOrEqual(3);

    const scrubStep = UI_STEPS.find((s) => s.targetId === "timeline-view" && s.taskInstructions);
    expect(scrubStep).toBeDefined();
    expect(scrubStep?.title).toBe("Playhead & Scrubbing");
    expect(scrubStep?.detect).toBeDefined();

    const timelineOptionsStep = UI_STEPS.find((s) => s.targetId === "status-timeline-options");
    expect(timelineOptionsStep).toBeDefined();
    expect(timelineOptionsStep?.title).toBe("Timeline Options & Filtering");
    expect(timelineOptionsStep?.cardPosition).toBe("left");
  });
});

describe("FOUNTAIN_STEPS", () => {
  it("starts with a welcome step", () => {
    expect(FOUNTAIN_STEPS[0].title).toBe("Basic Fountain Syntax");
  });

  it("has validate function for all typing steps", () => {
    const nonValidateTitles = [
      "Basic Fountain Syntax",
      "Load Full Demo",
      "Observe the Demo",
      "9. Complete Screenplay Demo",
      "Fountain Syntax Complete!",
    ];
    for (let i = 1; i < FOUNTAIN_STEPS.length; i++) {
      const step = FOUNTAIN_STEPS[i];
      if (nonValidateTitles.includes(step.title)) {
        expect(step.validate, `Step ${i}: "${step.title}" should not have validate`).toBeUndefined();
      } else {
        expect(step.validate, `Step ${i}: "${step.title}" missing validate`).toBeDefined();
      }
    }
  });

  it("each validate function passes for a valid input", () => {
    const tests: [string, string][] = [
      ["Scene Headings", "INT. HOUSE - DAY\n\nSome action.\n\nJANE\nHello."],
      ["Character", "INT. HOUSE - DAY\n\nJOHN\nHello."],
      ["Dialogue", "INT. HOUSE - DAY\n\nJOHN\nHello there."],
      ["Parentheticals", "INT. HOUSE - DAY\n\nJOHN\n(wryly)\nHello there."],
      ["Transitions", "INT. HOUSE - DAY\n\n> CUT TO:"],
      ["Shots", "INT. HOUSE - DAY\n\n!! CLOSE UP\n\non the lock."],
    ];
    for (const [stepTitlePrefix, input] of tests) {
      for (let i = 1; i < FOUNTAIN_STEPS.length; i++) {
        const step = FOUNTAIN_STEPS[i];
        if (step.validate && step.title.startsWith(stepTitlePrefix)) {
          expect(step.validate(input), `"${step.title}" should pass for "${input}"`).toBe(true);
        }
      }
    }
  });
});

describe("ADVANCED_STEPS", () => {
  it("has 16 steps", () => {
    expect(ADVANCED_STEPS).toHaveLength(16);
  });

  it("starts with a welcome step", () => {
    expect(ADVANCED_STEPS[0].title).toBe("Advanced Fountain Syntax");
    expect(ADVANCED_STEPS[1].title).toBe("Sandbox Ready");
  });

  it("has validate function for all typing steps", () => {
    const skipTitles = [
      "Advanced Fountain Syntax",
      "Sandbox Ready",
      "Load Full Demo",
      "Observe the Demo",
      "Open Scene Navigator",
      "Explore the Navigator",
      "Open Markers Pane",
      "Explore the Markers Pane",
      "Export Options",
      "Advanced Syntax Complete!",
    ];
    for (let i = 0; i < ADVANCED_STEPS.length; i++) {
      const step = ADVANCED_STEPS[i];
      if (skipTitles.includes(step.title)) {
        expect(step.validate, `Step ${i}: "${step.title}" should not have validate`).toBeUndefined();
      } else {
        expect(step.validate, `Step ${i}: "${step.title}" missing validate`).toBeDefined();
      }
    }
  });
});

