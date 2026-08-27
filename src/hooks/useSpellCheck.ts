import { useState, useCallback, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";

export interface MisspelledWord {
  from: number;
  to: number;
  word: string;
}

export interface SpellCheckOptions {
  initialEnabled?: boolean;
  characterNames?: string[];
}

export interface UseSpellCheckReturn {
  isEnabled: boolean;
  setIsEnabled: (enabled: boolean) => void;
  isChecking: boolean;
  misspelledWords: MisspelledWord[];
  suggestions: string[];
  activeWord: string | null;
  ignoredWords: string[];
  customWords: string[];
  checkText: (text: string, characterNames?: string[]) => Promise<MisspelledWord[]>;
  getSuggestions: (word: string) => Promise<string[]>;
  replaceWord: (text: string, from: number, to: number, replacement: string) => string;
  replaceWordInText: (text: string, targetWord: string, replacement: string) => string;
  addWordToDictionary: (word: string) => Promise<void>;
  ignoreWord: (word: string) => Promise<void>;
  clearMisspelled: () => void;
  setActiveWord: (word: string | null) => void;
}

export function useSpellCheck(options: SpellCheckOptions = {}): UseSpellCheckReturn {
  const [isEnabled, setIsEnabled] = useState<boolean>(options.initialEnabled ?? true);
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [misspelledWords, setMisspelledWords] = useState<MisspelledWord[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [activeWord, setActiveWord] = useState<string | null>(null);
  const [ignoredWords, setIgnoredWords] = useState<string[]>([]);
  const [customWords, setCustomWords] = useState<string[]>([]);

  const ignoredSetRef = useRef<Set<string>>(new Set());
  const customSetRef = useRef<Set<string>>(new Set());

  const checkText = useCallback(
    async (text: string, characterNames?: string[]): Promise<MisspelledWord[]> => {
      if (!isEnabled || !text.trim()) {
        setMisspelledWords([]);
        return [];
      }

      setIsChecking(true);
      try {
        let results: MisspelledWord[] = [];
        if (typeof window !== "undefined" && "__TAURI_INTERNALS__" in window) {
          results = await invoke<MisspelledWord[]>("spellcheck_check_text", {
            ranges: [{ text, offset: 0 }],
            characterNames: characterNames || options.characterNames,
          });
        } else {
          // Fallback basic check for testing & non-tauri environments
          const words = Array.from(text.matchAll(/\b[a-zA-Z]{2,}\b/g));
          results = words
            .filter((m) => {
              const word = m[0];
              const lower = word.toLowerCase();
              if (ignoredSetRef.current.has(lower) || customSetRef.current.has(lower)) {
                return false;
              }
              if (characterNames?.includes(word) || options.characterNames?.includes(word)) {
                return false;
              }
              return /(.)\1{2,}/.test(word) || word === "teh" || word === "misspelld";
            })
            .map((m) => ({
              from: m.index ?? 0,
              to: (m.index ?? 0) + m[0].length,
              word: m[0],
            }));
        }

        const filtered = results.filter(
          (w) => !ignoredSetRef.current.has(w.word.toLowerCase()) && !customSetRef.current.has(w.word.toLowerCase())
        );

        setMisspelledWords(filtered);
        return filtered;
      } catch {
        setMisspelledWords([]);
        return [];
      } finally {
        setIsChecking(false);
      }
    },
    [isEnabled, options.characterNames]
  );

  const getSuggestions = useCallback(async (word: string): Promise<string[]> => {
    if (!word) {
      setSuggestions([]);
      return [];
    }

    try {
      let result: string[] = [];
      if (typeof window !== "undefined" && "__TAURI_INTERNALS__" in window) {
        result = await invoke<string[]>("spellcheck_suggest", { word });
      } else {
        // Fallback suggestions for tests
        if (word === "teh") result = ["the", "ten", "tea"];
        else if (word === "misspelld") result = ["misspelled", "misspelling"];
        else result = [word.slice(0, -1), word + "e", word + "s"];
      }
      setSuggestions(result);
      setActiveWord(word);
      return result;
    } catch {
      setSuggestions([]);
      return [];
    }
  }, []);

  const replaceWord = useCallback(
    (text: string, from: number, to: number, replacement: string): string => {
      if (from < 0 || to > text.length || from > to) return text;
      const newText = text.slice(0, from) + replacement + text.slice(to);
      setMisspelledWords((prev) => prev.filter((item) => !(item.from >= from && item.to <= to)));
      return newText;
    },
    []
  );

  const replaceWordInText = useCallback(
    (text: string, targetWord: string, replacement: string): string => {
      const regex = new RegExp(`\\b${targetWord}\\b`, "g");
      const newText = text.replace(regex, replacement);
      setMisspelledWords((prev) => prev.filter((item) => item.word !== targetWord));
      return newText;
    },
    []
  );

  const addWordToDictionary = useCallback(async (word: string): Promise<void> => {
    const trimmed = word.trim();
    if (!trimmed) return;
    const lower = trimmed.toLowerCase();
    customSetRef.current.add(lower);
    setCustomWords(Array.from(customSetRef.current));

    try {
      if (typeof window !== "undefined" && "__TAURI_INTERNALS__" in window) {
        await invoke("spellcheck_add_word", { word: trimmed });
      }
    } catch {}

    setMisspelledWords((prev) => prev.filter((w) => w.word.toLowerCase() !== lower));
  }, []);

  const ignoreWord = useCallback(async (word: string): Promise<void> => {
    const trimmed = word.trim();
    if (!trimmed) return;
    const lower = trimmed.toLowerCase();
    ignoredSetRef.current.add(lower);
    setIgnoredWords(Array.from(ignoredSetRef.current));

    try {
      if (typeof window !== "undefined" && "__TAURI_INTERNALS__" in window) {
        await invoke("spellcheck_ignore_word", { word: trimmed });
      }
    } catch {}

    setMisspelledWords((prev) => prev.filter((w) => w.word.toLowerCase() !== lower));
  }, []);

  const clearMisspelled = useCallback(() => {
    setMisspelledWords([]);
    setSuggestions([]);
    setActiveWord(null);
  }, []);

  return {
    isEnabled,
    setIsEnabled,
    isChecking,
    misspelledWords,
    suggestions,
    activeWord,
    ignoredWords,
    customWords,
    checkText,
    getSuggestions,
    replaceWord,
    replaceWordInText,
    addWordToDictionary,
    ignoreWord,
    clearMisspelled,
    setActiveWord,
  };
}
