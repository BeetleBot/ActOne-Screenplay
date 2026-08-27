import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useStructures, DEFAULT_STRUCTURES, buildStructureFountainText } from "./useStructures";
import * as tauriCore from "@tauri-apps/api/core";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

describe("useStructures", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads built-in default structures including Three Act, Hero's Journey, Save the Cat", () => {
    const { result } = renderHook(() => useStructures());

    expect(result.current.structures.length).toBeGreaterThanOrEqual(3);

    const names = result.current.structures.map((s) => s.name);
    expect(names).toContain("Three Act");
    expect(names).toContain("Hero's Journey");
    expect(names).toContain("Save the Cat");
  });

  it("initializes with the first structure selected", () => {
    const { result } = renderHook(() => useStructures());
    expect(result.current.selectedStructure).toBeDefined();
    expect(result.current.selectedStructure?.name).toBe("Three Act");
  });

  it("allows selecting a different structure", () => {
    const { result } = renderHook(() => useStructures());

    const heroJourney = result.current.findStructureByName("Hero's Journey");
    expect(heroJourney).toBeDefined();

    act(() => {
      result.current.setSelectedStructure(heroJourney!);
    });

    expect(result.current.selectedStructure?.name).toBe("Hero's Journey");
  });

  it("verifies structure beat details for Three Act", () => {
    const { result } = renderHook(() => useStructures());
    const threeAct = result.current.findStructureByName("Three Act");

    expect(threeAct).toBeDefined();
    expect(threeAct?.beats.length).toBe(9);
    expect(threeAct?.beats[0].label).toBe("Act I - Setup");
    expect(threeAct?.beats.some((b) => b.label === "Inciting Incident")).toBe(true);
    expect(threeAct?.beats.some((b) => b.label === "Midpoint")).toBe(true);
    expect(threeAct?.beats.some((b) => b.label === "Act III - Climax")).toBe(true);
  });

  it("verifies structure beat details for Save the Cat", () => {
    const { result } = renderHook(() => useStructures());
    const saveTheCat = result.current.findStructureByName("Save the Cat");

    expect(saveTheCat).toBeDefined();
    expect(saveTheCat?.beats.length).toBe(15);
    expect(saveTheCat?.beats[0].label).toBe("Opening Image");
    expect(saveTheCat?.beats.some((b) => b.label === "Catalyst")).toBe(true);
    expect(saveTheCat?.beats.some((b) => b.label === "All Is Lost")).toBe(true);
    expect(saveTheCat?.beats[14].label).toBe("Final Image");
  });

  it("verifies structure beat details for Hero's Journey", () => {
    const { result } = renderHook(() => useStructures());
    const hero = result.current.findStructureByName("Hero's Journey");

    expect(hero).toBeDefined();
    expect(hero?.beats.length).toBe(12);
    expect(hero?.beats[0].label).toBe("The Ordinary World");
    expect(hero?.beats.some((b) => b.label === "Crossing the First Threshold")).toBe(true);
    expect(hero?.beats.some((b) => b.label === "Return with the Elixir")).toBe(true);
  });

  it("builds Fountain text format with headers and beats", () => {
    const structure = DEFAULT_STRUCTURES[0]; // Three Act
    const text = buildStructureFountainText(structure, true);

    expect(text).toContain("# Three Act\n= The classic screenplay structure");
    expect(text).toContain("# Act I - Setup\n= Establish the protagonist");
    expect(text).toContain("# Act III - Climax");
    expect(text.endsWith("\n")).toBe(true);
  });

  it("builds Fountain text without main title header when specified", () => {
    const structure = DEFAULT_STRUCTURES[0];
    const text = buildStructureFountainText(structure, false);

    expect(text.startsWith("# Act I - Setup")).toBe(true);
    expect(text).not.toContain("# Three Act\n");
  });

  it("finds structures by partial or case-insensitive name", () => {
    const { result } = renderHook(() => useStructures());

    expect(result.current.findStructureByName("three")).toBeDefined();
    expect(result.current.findStructureByName("HERO")).toBeDefined();
    expect(result.current.findStructureByName("cat")).toBeDefined();
    expect(result.current.findStructureByName("non-existent-xyz")).toBeUndefined();
  });

  it("reloads structures from Tauri backend when available", async () => {
    const mockStructures = [
      {
        name: "Mini Movie Method",
        description: "8-sequence screenplay method",
        beats: [{ label: "Sequence 1", description: "Status Quo" }],
      },
    ];

    (window as any).__TAURI_INTERNALS__ = {};
    vi.mocked(tauriCore.invoke).mockResolvedValue(mockStructures);

    const { result } = renderHook(() => useStructures());

    await act(async () => {
      await result.current.reloadStructures();
    });

    expect(result.current.structures).toEqual(mockStructures);
    expect(result.current.selectedStructure?.name).toBe("Mini Movie Method");

    delete (window as any).__TAURI_INTERNALS__;
  });

  it("falls back to default structures if reload throws error", async () => {
    (window as any).__TAURI_INTERNALS__ = {};
    vi.mocked(tauriCore.invoke).mockRejectedValue(new Error("Disk error"));

    const { result } = renderHook(() => useStructures());

    await act(async () => {
      await result.current.reloadStructures();
    });

    expect(result.current.error).toBe("Disk error");
    expect(result.current.structures).toEqual(DEFAULT_STRUCTURES);

    delete (window as any).__TAURI_INTERNALS__;
  });
});
