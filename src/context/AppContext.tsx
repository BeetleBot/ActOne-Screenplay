import { FountainDocument } from "../parser/FountainParser";
import { useFile, ScreenplayFile } from "./FileContext";
import { useUI } from "./UIContext";
import { useEditor } from "./EditorContext";

export type { ScreenplayFile };

interface AppContextProps {
  rawText: string;
  parsedDoc: FountainDocument;
  filePath: string | null;
  activeLineId: string | null;
  selectedSceneId: string | null;
  fontFamily: 'courier-prime' | 'courier-prime-sans';
  paperSize: 'letter' | 'a4';
  setFontFamily: (font: 'courier-prime' | 'courier-prime-sans') => void;
  setPaperSize: (size: 'letter' | 'a4') => void;
  isZenMode: boolean;
  setIsZenMode: (enabled: boolean) => void;
  setRawText: (text: string) => void;
  openFile: () => Promise<void>;
  saveFile: () => Promise<void>;
  saveFileAs: () => Promise<string | null>;
  updateLineText: (lineId: string, newText: string) => void;
  setActiveLineId: (id: string | null) => void;
  setSelectedSceneId: (id: string | null) => void;
  updateSettings: (updater: (prev: any) => any) => void;
  reorderScenes: (startIndex: number, endIndex: number) => void;
  isSaving: boolean;
  editorView: any | null;
  setEditorView: (view: any | null) => void;
  scrollToLine: (lineIndex: number, noFocus?: boolean) => void;
  autoAddSceneNumbers: () => void;
  clearSceneNumbers: () => void;
  files: ScreenplayFile[];
  activeFileId: string;
  selectFile: (id: string) => void;
  newFile: (initialContent?: string) => void;
  closeFile: (id: string) => void;
  recentFiles: any[];
  openFilePath: (path: string) => Promise<void>;
  removeFromRecent: (path: string) => void;
  typewriterMode: boolean;
  setTypewriterMode: (enabled: boolean) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  mainView: 'editor' | 'board';
  setMainView: (view: 'editor' | 'board') => void;
  zoomLevel: number;
  setZoomLevel: (zoom: number) => void;
  appScale: number;
  setAppScale: (scale: number) => void;
  autocompleteEnabled: boolean;
  setAutocompleteEnabled: (enabled: boolean) => void;
  smartQuotesEnabled: boolean;
  setSmartQuotesEnabled: (enabled: boolean) => void;
  matchParenthesesEnabled: boolean;
  setMatchParenthesesEnabled: (enabled: boolean) => void;
  hideFountainMarkupEnabled: boolean;
  setHideFountainMarkupEnabled: (enabled: boolean) => void;
  autoSaveEnabled: boolean;
  setAutoSaveEnabled: (enabled: boolean) => void;
  autoSaveInterval: number;
  setAutoSaveInterval: (interval: number) => void;
}

export const useAppContext = (): AppContextProps => {
  const file = useFile();
  const ui = useUI();
  const editor = useEditor();

  return {
    ...file,
    ...ui,
    ...editor,
  } as AppContextProps;
};



