import { describe, it, expect } from "vitest";
import { UI_STEPS, FOUNTAIN_STEPS, ADVANCED_STEPS, THEMING_STEPS, TAGGING_STEPS } from "./OnboardingTour";
import type { TourStep } from "../types/tour";

const ALL_STEP_SETS: [string, TourStep[], number][] = [
  ["UI_STEPS", UI_STEPS, UI_STEPS.length],
  ["FOUNTAIN_STEPS", FOUNTAIN_STEPS, FOUNTAIN_STEPS.length],
  ["ADVANCED_STEPS", ADVANCED_STEPS, ADVANCED_STEPS.length],
  ["TAGGING_STEPS", TAGGING_STEPS, TAGGING_STEPS.length],
  ["THEMING_STEPS", THEMING_STEPS, THEMING_STEPS.length],
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
      const validWindows = ["main", "settings", "theme-manager", "xray", "tag-manager", "export", "structure", "title-page"];
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

describe("TAGGING_STEPS", () => {
  it("starts with a welcome step", () => {
    expect(TAGGING_STEPS[0].title).toContain("Tagging");
  });

  it("has the correct number of steps", () => {
    expect(TAGGING_STEPS.length).toBeGreaterThanOrEqual(6);
  });

  it("has targetId for action steps", () => {
    for (let i = 1; i < TAGGING_STEPS.length - 1; i++) {
      const step = TAGGING_STEPS[i];
      expect(step.targetId, `Step ${i} "${step.title}" missing targetId`).toBeTruthy();
    }
  });
});

describe("THEMING_STEPS", () => {
  it("has exactly 5 steps", () => {
    expect(THEMING_STEPS).toHaveLength(5);
  });

  it("all steps target theme-manager window", () => {
    for (let i = 0; i < THEMING_STEPS.length; i++) {
      expect(THEMING_STEPS[i].window, `Step ${i}: missing window`).toBe("theme-manager");
    }
  });

  it("all steps have noMask enabled", () => {
    for (let i = 0; i < THEMING_STEPS.length; i++) {
      expect(THEMING_STEPS[i].noMask, `Step ${i}: missing noMask`).toBe(true);
    }
  });

  it("all steps have cardWidth 260", () => {
    for (let i = 0; i < THEMING_STEPS.length; i++) {
      expect(THEMING_STEPS[i].cardWidth, `Step ${i}: missing cardWidth`).toBe(260);
    }
  });

  it("steps 1 and 2 have taskInstructions", () => {
    expect(THEMING_STEPS[1].taskInstructions).toBeTruthy();
    expect(THEMING_STEPS[2].taskInstructions).toBeTruthy();
  });
});
