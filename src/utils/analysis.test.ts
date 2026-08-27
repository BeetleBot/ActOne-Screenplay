import { describe, it, expect } from "vitest";
import { parseScreenplay } from "../parser";
import {
  extractCharacters,
  computeStats,
  computeSceneTiming,
  computeCharacterConnections,
} from "./analysis";

describe("analysis - extractCharacters", () => {
  it("extracts character statistics including line count, word count, scenes, and percentages", () => {
    const text = `
EXT. COFFEE SHOP - DAY

ALICE
Hello Bob! How are you today?

BOB
I am doing great, Alice. Thanks for asking.

INT. OFFICE - NIGHT

ALICE
Let's get back to work.
`.trim();
    const doc = parseScreenplay(text);
    const genders = { ALICE: "female", BOB: "male" };
    const profiles = {
      ALICE: { role: "Protagonist", color: "#ff0000" },
    };

    const characters = extractCharacters(doc, genders, profiles);

    expect(characters).toHaveLength(2);

    const alice = characters.find((c) => c.name === "ALICE");
    const bob = characters.find((c) => c.name === "BOB");

    expect(alice).toBeDefined();
    expect(alice?.lineCount).toBe(2);
    expect(alice?.wordCount).toBe(11); // "Hello Bob! How are you today?" (6) + "Let's get back to work." (5)
    expect(alice?.sceneCount).toBe(2);
    expect(alice?.gender).toBe("female");
    expect(alice?.role).toBe("Protagonist");
    expect(alice?.color).toBe("#ff0000");

    expect(bob).toBeDefined();
    expect(bob?.lineCount).toBe(1);
    expect(bob?.wordCount).toBe(8); // "I am doing great, Alice. Thanks for asking." (8)
    expect(bob?.sceneCount).toBe(1);
    expect(bob?.gender).toBe("male");
    expect(bob?.role).toBe("—");
    expect(bob?.color).toBe("");

    const totalWords = 19;
    expect(alice?.dialoguePercentage).toBeCloseTo((11 / totalWords) * 100);
    expect(bob?.dialoguePercentage).toBeCloseTo((8 / totalWords) * 100);
  });

  it("handles character extensions, @ prefixes, and dual dialogue characters", () => {
    const text = `
INT. ROOM - DAY

@JOHN (V.O.)
Can you hear me?

MARY ^
Yes, loud and clear!
`.trim();
    const doc = parseScreenplay(text);
    const characters = extractCharacters(doc, {});

    const john = characters.find((c) => c.name === "JOHN");
    const mary = characters.find((c) => c.name === "MARY");

    expect(john).toBeDefined();
    expect(john?.lineCount).toBe(1);
    expect(john?.wordCount).toBe(4);
    expect(john?.gender).toBe("unknown");

    expect(mary).toBeDefined();
    expect(mary?.lineCount).toBe(1);
    expect(mary?.wordCount).toBe(4);
  });
});

describe("analysis - computeStats", () => {
  it("computes screenplay metrics: dialogue vs action ratio, words, locations, time of day distribution", () => {
    const text = `
Title: THE TEST SCRIPT
Author: Screenwriter

# ACT ONE

INT. COFFEE SHOP - DAY

Alice drinks coffee peacefully. She looks around the busy shop.

ALICE
It is a wonderful morning.

EXT. PARK - NIGHT

The wind howls violently through the dark trees.

BOB
Where is everyone?

EXT. BEACH - DUSK

The sun sets gently over the horizon.

ALICE
Look at that sunset!

INT. CABIN - DAWN

Sunlight creeps through the window curtains.

CHARLIE
A new day begins.
`.trim();
    const doc = parseScreenplay(text);
    const genders = { ALICE: "female", BOB: "male", CHARLIE: "nonbinary" };

    const stats = computeStats(doc, genders);

    expect(stats.headingCount).toBe(4);
    expect(stats.totalWords).toBeGreaterThan(0);
    expect(stats.dialogueWords).toBe(16); // "It is a wonderful morning." (5) + "Where is everyone?" (3) + "Look at that sunset!" (4) + "A new day begins." (4)
    expect(stats.actionWords).toBe(31); // 9 + 8 + 6 + 3 + 5
    expect(stats.dialoguePct + stats.actionPct).toBeLessThanOrEqual(100);

    // Locations check
    expect(stats.locations.length).toBeGreaterThan(0);

    // Setting stats (INT, EXT)
    expect(stats.intCount).toBe(2);
    expect(stats.extCount).toBe(2);

    // Time of day stats
    // DAY -> dayCount, NIGHT, DUSK, DAWN -> nightCount
    expect(stats.dayCount).toBe(1);
    expect(stats.nightCount).toBe(3); // NIGHT + DUSK + DAWN
    expect(stats.otherTimeCount).toBe(0);

    // Gender dialogue lines
    expect(stats.genderDialogueLines.female).toBe(2);
    expect(stats.genderDialogueLines.male).toBe(1);
    expect(stats.genderDialogueLines.nonbinary).toBe(1);
    expect(stats.genderDialogueLines.unknown).toBe(0);

    // Acts check
    expect(stats.acts.length).toBe(1);
    expect(stats.acts[0].title).toBe("ACT ONE");
    expect(stats.acts[0].sceneCount).toBe(4);

    // Monologue / speeches check
    expect(stats.totalSpeeches).toBe(4);
    expect(stats.avgWordsPerSpeech).toBeGreaterThan(0);
    expect(stats.longestMonologue).toBeDefined();
    expect(stats.longestMonologue?.character).toBe("ALICE");
    expect(stats.longestMonologue?.wordCount).toBe(5);
  });

  it("handles INT/EXT combo scenes, other settings, and unspecified time of day", () => {
    const text = `
INT/EXT. CAR - CONTINUOUS

Driving fast down the road.

DRIVER
Hold on tight!

.OTHER LOCATION WITHOUT STANDARD HEADING

Walking in mystery.
`.trim();
    const doc = parseScreenplay(text);
    const stats = computeStats(doc, {});

    expect(stats.comboCount).toBeGreaterThanOrEqual(1);
    expect(stats.otherTimeCount).toBeGreaterThan(0);
    expect(stats.timeOfDayStats.some((t) => t.name === "CONTINUOUS")).toBe(true);
  });
});

describe("analysis - computeSceneTiming & computeCharacterConnections", () => {
  it("computes scene timing with duration and offsets", () => {
    const text = `
INT. ROOM 1 - DAY

Alice talks to Bob.

ALICE
Hello!

INT. ROOM 2 - NIGHT

Bob sits quietly.
`.trim();
    const doc = parseScreenplay(text);
    const timings = computeSceneTiming(doc);

    expect(timings).toHaveLength(2);
    expect(timings[0].heading).toContain("ROOM 1");
    expect(timings[0].offsetSeconds).toBe(0);
    expect(timings[0].durationSeconds).toBeGreaterThanOrEqual(5);
    expect(timings[1].heading).toContain("ROOM 2");
    expect(timings[1].offsetSeconds).toBe(timings[0].durationSeconds);
  });

  it("computes character interactions across scenes", () => {
    const text = `
INT. ROOM 1 - DAY

ALICE
Hi Bob.

BOB
Hi Alice.

INT. ROOM 2 - NIGHT

BOB
Hi Charlie.

CHARLIE
Hi Bob.
`.trim();
    const doc = parseScreenplay(text);
    const connections = computeCharacterConnections(doc);

    expect(connections.length).toBe(2);
    const aliceBob = connections.find(
      (c) => (c.source === "ALICE" && c.target === "BOB") || (c.source === "BOB" && c.target === "ALICE")
    );
    const bobCharlie = connections.find(
      (c) => (c.source === "BOB" && c.target === "CHARLIE") || (c.source === "CHARLIE" && c.target === "BOB")
    );

    expect(aliceBob?.interactions).toBe(1);
    expect(bobCharlie?.interactions).toBe(1);
  });
});
