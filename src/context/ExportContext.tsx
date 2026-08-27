import React, { createContext, useContext, useState, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";

export type ExportFormat = "pdf" | "fountain" | "fdx" | "fadein" | "markdown" | "html";
export type PaperSize = "letter" | "a4";

export interface ElementFormat {
  bold: boolean;
  italic: boolean;
  underline: boolean;
}

export interface ElementFormats {
  scene_heading: ElementFormat;
  action: ElementFormat;
  character: ElementFormat;
  parenthetical: ElementFormat;
  dialogue: ElementFormat;
  lyrics: ElementFormat;
  transition: ElementFormat;
  shot: ElementFormat;
  centered_text: ElementFormat;
}

export interface ExportSettings {
  format: ExportFormat;
  paperSize: PaperSize;
  includeTitlePage: boolean;
  includeSections: boolean;
  includeSynopses: boolean;
  includeNotes: boolean;
  includeSceneNumbers: boolean;
  watermarkText: string;
  headerText: string;
  footerText: string;
  fontFamily: string;
  elementFormats: ElementFormats;
}

export const DEFAULT_ELEMENT_FORMATS: ElementFormats = {
  scene_heading: { bold: true, italic: false, underline: false },
  action: { bold: false, italic: false, underline: false },
  character: { bold: false, italic: false, underline: false },
  parenthetical: { bold: false, italic: false, underline: false },
  dialogue: { bold: false, italic: false, underline: false },
  lyrics: { bold: false, italic: false, underline: false },
  transition: { bold: false, italic: false, underline: false },
  shot: { bold: true, italic: false, underline: false },
  centered_text: { bold: false, italic: false, underline: false },
};

export const DEFAULT_EXPORT_SETTINGS: ExportSettings = {
  format: "pdf",
  paperSize: "letter",
  includeTitlePage: true,
  includeSections: false,
  includeSynopses: false,
  includeNotes: false,
  includeSceneNumbers: true,
  watermarkText: "",
  headerText: "",
  footerText: "",
  fontFamily: "Courier Prime",
  elementFormats: DEFAULT_ELEMENT_FORMATS,
};

export interface ExportContextProps {
  settings: ExportSettings;
  updateSettings: (partial: Partial<ExportSettings>) => void;
  updateElementFormat: (element: keyof ElementFormats, format: Partial<ElementFormat>) => void;
  resetSettings: () => void;
  isExporting: boolean;
  exportScript: (content: string, overrideFormat?: ExportFormat) => Promise<{ success: boolean; filePath?: string; error?: string }>;
}

const ExportContext = createContext<ExportContextProps | undefined>(undefined);

export const useExport = (): ExportContextProps => {
  const context = useContext(ExportContext);
  if (!context) {
    throw new Error("useExport must be used within an ExportProvider");
  }
  return context;
};

export const ExportProvider: React.FC<{
  children: React.ReactNode;
  initialSettings?: Partial<ExportSettings>;
}> = ({ children, initialSettings }) => {
  const [settings, setSettings] = useState<ExportSettings>({
    ...DEFAULT_EXPORT_SETTINGS,
    ...initialSettings,
    elementFormats: {
      ...DEFAULT_ELEMENT_FORMATS,
      ...(initialSettings?.elementFormats || {}),
    },
  });

  const [isExporting, setIsExporting] = useState<boolean>(false);

  const updateSettings = useCallback((partial: Partial<ExportSettings>) => {
    setSettings((prev) => ({
      ...prev,
      ...partial,
      elementFormats: partial.elementFormats
        ? { ...prev.elementFormats, ...partial.elementFormats }
        : prev.elementFormats,
    }));
  }, []);

  const updateElementFormat = useCallback((element: keyof ElementFormats, format: Partial<ElementFormat>) => {
    setSettings((prev) => ({
      ...prev,
      elementFormats: {
        ...prev.elementFormats,
        [element]: {
          ...prev.elementFormats[element],
          ...format,
        },
      },
    }));
  }, []);

  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_EXPORT_SETTINGS);
  }, []);

  const exportScript = useCallback(
    async (
      content: string,
      overrideFormat?: ExportFormat
    ): Promise<{ success: boolean; filePath?: string; error?: string }> => {
      const activeFormat = overrideFormat || settings.format;
      setIsExporting(true);
      try {
        if (typeof window !== "undefined" && "__TAURI_INTERNALS__" in window) {
          const result = await invoke<{ success: boolean; filePath?: string }>("export_screenplay", {
            content,
            format: activeFormat,
            settings,
          });
          return result;
        }
        return { success: true, filePath: `/mock/path/screenplay.${activeFormat}` };
      } catch (err: any) {
        return { success: false, error: err?.message || "Export failed" };
      } finally {
        setIsExporting(false);
      }
    },
    [settings]
  );

  return (
    <ExportContext.Provider
      value={{
        settings,
        updateSettings,
        updateElementFormat,
        resetSettings,
        isExporting,
        exportScript,
      }}
    >
      {children}
    </ExportContext.Provider>
  );
};
