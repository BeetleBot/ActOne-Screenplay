import { countWords } from "../utils/text";
import { createTextCalculation } from "./documentDataStore";

export interface TextStatistics {
  words: number;
  characters: number;
  lines: number;
}

export const getTextStatistics = createTextCalculation<TextStatistics>("text-statistics", (text) => ({
  words: countWords(text),
  characters: text.length,
  lines: text ? text.split("\n").length : 1,
}));
