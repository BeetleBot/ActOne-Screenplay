import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";

export interface StructureBeat {
  label: string;
  description: string;
}

export interface Structure {
  name: string;
  description: string;
  beats: StructureBeat[];
}

export const DEFAULT_STRUCTURES: Structure[] = [
  {
    name: "Three Act",
    description: "The classic screenplay structure dividing the narrative into Setup, Confrontation, and Resolution.",
    beats: [
      { label: "Act I - Setup", description: "Establish the protagonist, world, and status quo." },
      { label: "Inciting Incident", description: "An event disrupts the protagonist's world and sets the story in motion." },
      { label: "Plot Point 1", description: "The protagonist makes a definitive choice to enter Act II." },
      { label: "Act II - Rising Action", description: "Obstacles escalate as the protagonist pursues their goal." },
      { label: "Midpoint", description: "A major shift occurs, raising the stakes and shifting from reactive to proactive." },
      { label: "All Hope is Lost", description: "The lowest point where victory seems impossible." },
      { label: "Plot Point 2", description: "A new insight or discovery drives the story into Act III." },
      { label: "Act III - Climax", description: "The ultimate confrontation where the main dramatic question is answered." },
      { label: "Resolution", description: "The aftermath establishing the new normal." },
    ],
  },
  {
    name: "Hero's Journey",
    description: "Joseph Campbell and Christopher Vogler's monomyth structure of transformation.",
    beats: [
      { label: "The Ordinary World", description: "Introduce the hero in their normal surroundings." },
      { label: "Call to Adventure", description: "The hero receives a challenge or quest." },
      { label: "Refusal of the Call", description: "The hero hesitates out of fear or doubt." },
      { label: "Meeting the Mentor", description: "A wise figure prepares the hero for the unknown." },
      { label: "Crossing the First Threshold", description: "The hero commits to entering the special world." },
      { label: "Tests, Allies, and Enemies", description: "Learning the rules of the new world and building a team." },
      { label: "Approach to the Inmost Cave", description: "Preparations for the central challenge." },
      { label: "The Ordeal", description: "A life-or-death confrontation where the hero faces their deepest fear." },
      { label: "The Reward", description: "The hero claims the treasure or elixir." },
      { label: "The Road Back", description: "Urgency drives the hero back toward the ordinary world." },
      { label: "Resurrection", description: "A final test of transformation on a higher plane." },
      { label: "Return with the Elixir", description: "The hero returns home bearing something that heals their world." },
    ],
  },
  {
    name: "Save the Cat",
    description: "Blake Snyder's iconic 15-beat screenplay roadmap.",
    beats: [
      { label: "Opening Image", description: "A snapshot of the hero and world before change begins." },
      { label: "Theme Stated", description: "What the story is really about is mentioned early on." },
      { label: "Set-up", description: "Expand on the hero's flaws, stakes, and goals." },
      { label: "Catalyst", description: "The life-changing event that knocks down the existing world." },
      { label: "Debate", description: "The hero wrestles with what action to take." },
      { label: "Break into Two", description: "The hero decides to venture into the new upside-down world." },
      { label: "B Story", description: "Introduction of the love story or relationship driving theme." },
      { label: "Fun and Games", description: "The core promise of the premise delivered in scenes." },
      { label: "Midpoint", description: "False victory or false defeat; stakes are raised." },
      { label: "Bad Guys Close In", description: "Internal and external pressure mounts from all sides." },
      { label: "All Is Lost", description: "Total collapse and loss; whiff of death." },
      { label: "Dark Night of the Soul", description: "Processing grief before an epiphany hits." },
      { label: "Break into Three", description: "The solution is realized thanks to the B story." },
      { label: "Finale", description: "Executing the plan and synthesizing lessons learned." },
      { label: "Final Image", description: "The mirror opposite of the opening image demonstrating change." },
    ],
  },
];

export interface UseStructuresReturn {
  structures: Structure[];
  selectedStructure: Structure | null;
  setSelectedStructure: (structure: Structure | null) => void;
  isLoading: boolean;
  error: string | null;
  reloadStructures: () => Promise<Structure[]>;
  buildFountainText: (structure: Structure, includeHeader?: boolean) => string;
  findStructureByName: (name: string) => Structure | undefined;
}

export function buildStructureFountainText(s: Structure, includeHeader = true): string {
  let text = "";
  if (includeHeader) {
    text += `# ${s.name}\n`;
    if (s.description) {
      text += `= ${s.description}\n`;
    }
    text += "\n";
  }
  s.beats.forEach((beat) => {
    text += `# ${beat.label}\n`;
    if (beat.description) {
      text += `= ${beat.description}\n`;
    }
    text += "\n\n\n";
  });
  return text.trimEnd() + "\n";
}

export function useStructures(): UseStructuresReturn {
  const [structures, setStructures] = useState<Structure[]>(DEFAULT_STRUCTURES);
  const [selectedStructure, setSelectedStructure] = useState<Structure | null>(DEFAULT_STRUCTURES[0] || null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const reloadStructures = useCallback(async (): Promise<Structure[]> => {
    setIsLoading(true);
    setError(null);
    try {
      let data: Structure[] = [];
      if (typeof window !== "undefined" && "__TAURI_INTERNALS__" in window) {
        data = await invoke<Structure[]>("get_structures");
      }
      if (data && data.length > 0) {
        setStructures(data);
        setSelectedStructure(data[0]);
        return data;
      }
      setStructures(DEFAULT_STRUCTURES);
      setSelectedStructure(DEFAULT_STRUCTURES[0]);
      return DEFAULT_STRUCTURES;
    } catch (err: any) {
      setError(err?.message || "Failed to load structures");
      setStructures(DEFAULT_STRUCTURES);
      setSelectedStructure(DEFAULT_STRUCTURES[0]);
      return DEFAULT_STRUCTURES;
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    reloadStructures();
  }, []);

  const findStructureByName = useCallback(
    (name: string): Structure | undefined => {
      return structures.find(
        (s) => s.name.toLowerCase() === name.toLowerCase() || s.name.toLowerCase().includes(name.toLowerCase())
      );
    },
    [structures]
  );

  return {
    structures,
    selectedStructure,
    setSelectedStructure,
    isLoading,
    error,
    reloadStructures,
    buildFountainText: buildStructureFountainText,
    findStructureByName,
  };
}
