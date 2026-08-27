import React, { createContext, useContext, useState, useCallback, useMemo } from "react";

export interface SearchMatch {
  from: number;
  to: number;
  line: number;
  text: string;
  preview: string;
}

export interface SearchOptions {
  query: string;
  replaceText?: string;
  matchCase: boolean;
  matchWholeWord: boolean;
  isRegex: boolean;
  scope: "script" | "project";
}

export interface SearchContextProps {
  query: string;
  setQuery: (q: string) => void;
  replaceText: string;
  setReplaceText: (r: string) => void;
  matchCase: boolean;
  setMatchCase: (mc: boolean) => void;
  matchWholeWord: boolean;
  setMatchWholeWord: (mww: boolean) => void;
  isRegex: boolean;
  setIsRegex: (ir: boolean) => void;
  scope: "script" | "project";
  setScope: (s: "script" | "project") => void;
  matches: SearchMatch[];
  activeMatchIndex: number;
  activeMatch: SearchMatch | null;
  isOpen: boolean;
  openSearch: (initialQuery?: string) => void;
  closeSearch: () => void;
  performSearch: (content: string, overrideQuery?: string) => SearchMatch[];
  nextMatch: () => void;
  previousMatch: () => void;
  replaceCurrent: (content: string, replacement?: string) => { newContent: string; replaced: boolean };
  replaceAll: (content: string, replacement?: string) => { newContent: string; count: number };
  clearSearch: () => void;
}

const SearchContext = createContext<SearchContextProps | undefined>(undefined);

export const useSearch = (): SearchContextProps => {
  const context = useContext(SearchContext);
  if (!context) {
    throw new Error("useSearch must be used within a SearchProvider");
  }
  return context;
};

export const SearchProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [query, setQuery] = useState("");
  const [replaceText, setReplaceText] = useState("");
  const [matchCase, setMatchCase] = useState(false);
  const [matchWholeWord, setMatchWholeWord] = useState(false);
  const [isRegex, setIsRegex] = useState(false);
  const [scope, setScope] = useState<"script" | "project">("script");
  const [matches, setMatches] = useState<SearchMatch[]>([]);
  const [activeMatchIndex, setActiveMatchIndex] = useState(-1);
  const [isOpen, setIsOpen] = useState(false);

  const openSearch = useCallback((initialQuery?: string) => {
    setIsOpen(true);
    if (initialQuery !== undefined) {
      setQuery(initialQuery);
    }
  }, []);

  const closeSearch = useCallback(() => {
    setIsOpen(false);
  }, []);

  const clearSearch = useCallback(() => {
    setQuery("");
    setReplaceText("");
    setMatches([]);
    setActiveMatchIndex(-1);
  }, []);

  const performSearch = useCallback(
    (content: string, overrideQuery?: string): SearchMatch[] => {
      const q = overrideQuery !== undefined ? overrideQuery : query;
      if (!q || !content) {
        setMatches([]);
        setActiveMatchIndex(-1);
        return [];
      }

      try {
        let patternString = q;
        if (!isRegex) {
          patternString = patternString.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        }
        if (matchWholeWord) {
          patternString = `\\b${patternString}\\b`;
        }

        const flags = matchCase ? "g" : "gi";
        const regex = new RegExp(patternString, flags);

        const found: SearchMatch[] = [];
        let match: RegExpExecArray | null;

        const lines = content.split("\n");
        const lineOffsets: number[] = [0];
        for (let i = 0; i < lines.length - 1; i++) {
          lineOffsets.push(lineOffsets[i] + lines[i].length + 1);
        }

        const findLineNumber = (offset: number) => {
          let low = 0;
          let high = lineOffsets.length - 1;
          while (low <= high) {
            const mid = Math.floor((low + high) / 2);
            if (lineOffsets[mid] <= offset) {
              if (mid === lineOffsets.length - 1 || lineOffsets[mid + 1] > offset) {
                return mid + 1;
              }
              low = mid + 1;
            } else {
              high = mid - 1;
            }
          }
          return 1;
        };

        while ((match = regex.exec(content)) !== null) {
          if (match[0].length === 0) {
            regex.lastIndex++;
            continue;
          }
          const from = match.index;
          const to = from + match[0].length;
          const lineNum = findLineNumber(from);
          const lineText = lines[lineNum - 1] || "";
          found.push({
            from,
            to,
            line: lineNum,
            text: match[0],
            preview: lineText.trim(),
          });
        }

        setMatches(found);
        setActiveMatchIndex(found.length > 0 ? 0 : -1);
        return found;
      } catch {
        setMatches([]);
        setActiveMatchIndex(-1);
        return [];
      }
    },
    [query, matchCase, matchWholeWord, isRegex]
  );

  const nextMatch = useCallback(() => {
    if (matches.length === 0) return;
    setActiveMatchIndex((prev) => (prev + 1) % matches.length);
  }, [matches.length]);

  const previousMatch = useCallback(() => {
    if (matches.length === 0) return;
    setActiveMatchIndex((prev) => (prev - 1 + matches.length) % matches.length);
  }, [matches.length]);

  const activeMatch = useMemo(() => {
    if (activeMatchIndex >= 0 && activeMatchIndex < matches.length) {
      return matches[activeMatchIndex];
    }
    return null;
  }, [activeMatchIndex, matches]);

  const replaceCurrent = useCallback(
    (content: string, replacement = replaceText): { newContent: string; replaced: boolean } => {
      if (!activeMatch || activeMatchIndex < 0 || activeMatchIndex >= matches.length) {
        return { newContent: content, replaced: false };
      }

      const match = matches[activeMatchIndex];
      const newContent = content.slice(0, match.from) + replacement + content.slice(match.to);

      const delta = replacement.length - (match.to - match.from);
      const remainingMatches = matches
        .filter((_, idx) => idx !== activeMatchIndex)
        .map((m) => {
          if (m.from > match.from) {
            return {
              ...m,
              from: m.from + delta,
              to: m.to + delta,
            };
          }
          return m;
        });

      setMatches(remainingMatches);
      setActiveMatchIndex((prev) => (remainingMatches.length === 0 ? -1 : Math.min(prev, remainingMatches.length - 1)));

      return { newContent, replaced: true };
    },
    [activeMatch, activeMatchIndex, matches, replaceText]
  );

  const replaceAll = useCallback(
    (content: string, replacement = replaceText): { newContent: string; count: number } => {
      if (matches.length === 0) {
        return { newContent: content, count: 0 };
      }

      let newContent = content;
      let offsetAdjustment = 0;

      for (const m of matches) {
        const from = m.from + offsetAdjustment;
        const to = m.to + offsetAdjustment;
        newContent = newContent.slice(0, from) + replacement + newContent.slice(to);
        offsetAdjustment += replacement.length - (m.to - m.from);
      }

      const count = matches.length;
      setMatches([]);
      setActiveMatchIndex(-1);

      return { newContent, count };
    },
    [matches, replaceText]
  );

  return (
    <SearchContext.Provider
      value={{
        query,
        setQuery,
        replaceText,
        setReplaceText,
        matchCase,
        setMatchCase,
        matchWholeWord,
        setMatchWholeWord,
        isRegex,
        setIsRegex,
        scope,
        setScope,
        matches,
        activeMatchIndex,
        activeMatch,
        isOpen,
        openSearch,
        closeSearch,
        performSearch,
        nextMatch,
        previousMatch,
        replaceCurrent,
        replaceAll,
        clearSearch,
      }}
    >
      {children}
    </SearchContext.Provider>
  );
};
