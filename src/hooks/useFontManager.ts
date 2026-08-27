import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";

export interface FontInfo {
  name: string;
  isSystem?: boolean;
}

export interface UseFontManagerReturn {
  fonts: string[];
  filteredFonts: string[];
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  isLoading: boolean;
  error: string | null;
  selectedFont: string;
  setSelectedFont: (font: string) => void;
  refreshFonts: () => Promise<string[]>;
  isFontAvailable: (fontName: string) => boolean;
}

export const FALLBACK_FONTS = [
  "Courier Prime",
  "Courier Final Draft",
  "Courier New",
  "Courier",
  "Inter",
  "Roboto",
  "Arial",
  "Times New Roman",
  "Georgia",
  "Menlo",
  "Monaco",
  "Consolas",
];

const FONT_CACHE_KEY = "actone-system-fonts-cache";

export function useFontManager(initialFont = "Courier Prime"): UseFontManagerReturn {
  const [fonts, setFonts] = useState<string[]>(() => {
    try {
      const cached = localStorage.getItem(FONT_CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return FALLBACK_FONTS;
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFont, setSelectedFont] = useState<string>(initialFont);

  const refreshFonts = useCallback(async (): Promise<string[]> => {
    setIsLoading(true);
    setError(null);
    try {
      let loadedFonts: string[] = [];
      if (typeof window !== "undefined" && "__TAURI_INTERNALS__" in window) {
        loadedFonts = await invoke<string[]>("get_system_fonts");
      } else {
        loadedFonts = fonts;
      }

      if (loadedFonts && loadedFonts.length > 0) {
        const unique = Array.from(new Set([...FALLBACK_FONTS, ...loadedFonts]));
        setFonts(unique);
        try {
          localStorage.setItem(FONT_CACHE_KEY, JSON.stringify(unique));
        } catch {}
        return unique;
      }
      return fonts;
    } catch (err: any) {
      setError(err?.message || "Failed to load system fonts");
      return fonts;
    } finally {
      setIsLoading(false);
    }
  }, [fonts]);

  useEffect(() => {
    refreshFonts();
  }, []);

  const filteredFonts = searchQuery.trim()
    ? fonts.filter((f) => f.toLowerCase().includes(searchQuery.toLowerCase()))
    : fonts;

  const isFontAvailable = useCallback(
    (fontName: string): boolean => {
      return fonts.some((f) => f.toLowerCase() === fontName.toLowerCase());
    },
    [fonts]
  );

  return {
    fonts,
    filteredFonts,
    searchQuery,
    setSearchQuery,
    isLoading,
    error,
    selectedFont,
    setSelectedFont,
    refreshFonts,
    isFontAvailable,
  };
}
