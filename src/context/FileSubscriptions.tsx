import React, { createContext, useContext, useMemo, useRef } from "react";
import type { FileContextProps } from "./FileContext";
import type { FountainDocument } from "../parser";
import { isProseScript } from "../utils/scriptMode";

export type FileActions = Pick<FileContextProps,
"setRawText" | "updateFileScriptContent" | "openFile" | "saveFile" | "saveFileAs" | "selectFile" | "newFile" | "importAsActoneProject" | "closeFile" | "closeOthers" | "closeAll" | "openFilePath" | "removeFromRecent" | "updateSettings" | "setActiveScript" | "addScript" | "importScript" | "importScriptFromPath" | "renameScript" | "duplicateScript" | "deleteScript" | "moveScript" | "openSnapshotAsNewProject">;

export interface FileTab {
  id: string;
  filePath: string | null;
  isDirty: boolean;
  isSaving: boolean;
  scripts?: { name: string; fileName: string; type?: string }[];
}

export interface WorkspaceMetadata {
  files: FileTab[];
  activeFileId: string;
  filePath: string | null;
  activeScriptIndex: number;
  activeScriptName: string;
  scriptFileName: string;
  isBundle: boolean;
  hasNoScripts: boolean;
  isProse: boolean;
  scripts: { name: string; fileName: string; type?: string }[];
}

export type ParsedScreenplay = Omit<FountainDocument, "pageBreaks">;
const ActionsContext = createContext<FileActions | undefined>(undefined);
const WorkspaceContext = createContext<WorkspaceMetadata | undefined>(undefined);
const TextContext = createContext<string | undefined>(undefined);
const ParsedContext = createContext<ParsedScreenplay | undefined>(undefined);
const PaginationContext = createContext<number[] | undefined>(undefined);
const SaveContext = createContext<FileContextProps["saveStatus"]>("idle");

export function useFileActions(): FileActions {
  const actions = useContext(ActionsContext);
  if (!actions) throw new Error("useFileActions requires FileProvider");
  return actions;
}

export function useWorkspaceMetadata(): WorkspaceMetadata {
  const workspace = useContext(WorkspaceContext);
  if (!workspace) throw new Error("useWorkspaceMetadata requires FileProvider");
  return workspace;
}

export function useDocumentText(): string {
  const text = useContext(TextContext);
  if (text === undefined) throw new Error("useDocumentText requires FileProvider");
  return text;
}

export function useParsedScreenplay(): ParsedScreenplay {
  const parsed = useContext(ParsedContext);
  if (!parsed) throw new Error("useParsedScreenplay requires FileProvider");
  return parsed;
}

export const usePageBreaks = () => useContext(PaginationContext);
export const useFileSaveStatus = () => useContext(SaveContext);

export function FileSubscriptions({ value, children }: { value: FileContextProps; children: React.ReactNode }) {
  const latest = useRef(value);
  latest.current = value;
  // Stable action delegates always use the latest committed file operations.
  const actions = useMemo<FileActions>(() => ({
    setRawText: (...args) => latest.current.setRawText(...args),
    updateFileScriptContent: (...args) => latest.current.updateFileScriptContent(...args),
    openFile: (...args) => latest.current.openFile(...args),
    saveFile: (...args) => latest.current.saveFile(...args),
    saveFileAs: (...args) => latest.current.saveFileAs(...args),
    selectFile: (...args) => latest.current.selectFile(...args),
    newFile: (...args) => latest.current.newFile(...args),
    importAsActoneProject: (...args) => latest.current.importAsActoneProject(...args),
    closeFile: (...args) => latest.current.closeFile(...args),
    closeOthers: (...args) => latest.current.closeOthers(...args),
    closeAll: (...args) => latest.current.closeAll(...args),
    openFilePath: (...args) => latest.current.openFilePath(...args),
    removeFromRecent: (...args) => latest.current.removeFromRecent(...args),
    updateSettings: (...args) => latest.current.updateSettings(...args),
    setActiveScript: (...args) => latest.current.setActiveScript(...args),
    addScript: (...args) => latest.current.addScript(...args),
    importScript: (...args) => latest.current.importScript(...args),
    importScriptFromPath: (...args) => latest.current.importScriptFromPath(...args),
    renameScript: (...args) => latest.current.renameScript(...args),
    duplicateScript: (...args) => latest.current.duplicateScript(...args),
    deleteScript: (...args) => latest.current.deleteScript(...args),
    moveScript: (...args) => latest.current.moveScript(...args),
    openSnapshotAsNewProject: (...args) => latest.current.openSnapshotAsNewProject(...args),
  }), []);
  const tabSignature = JSON.stringify(value.files.map(({ id, filePath, isDirty, isSaving, scripts }) => ({
    id, filePath, isDirty, isSaving,
    scripts: scripts?.map(({ name, fileName, type }) => ({ name, fileName, type })),
  })));
  const tabs = useMemo<FileTab[]>(() => JSON.parse(tabSignature), [tabSignature]);
  const activeFile = value.files.find(file => file.id === value.activeFileId);
  const hasNoScripts = activeFile?.scripts !== undefined && activeFile.scripts.length === 0;
  const scripts = tabs.find(file => file.id === value.activeFileId)?.scripts ?? [];
  const isProse = isProseScript(activeFile?.scripts?.[value.activeScriptIndex], value.filePath);
  const { activeFileId, filePath, activeScriptIndex, activeScriptName, scriptFileName, isBundle } = value;
  const workspace = useMemo<WorkspaceMetadata>(() => ({
    files: tabs, activeFileId, filePath, activeScriptIndex, activeScriptName, scriptFileName, isBundle, hasNoScripts, isProse, scripts,
  }), [tabs, activeFileId, filePath, activeScriptIndex, activeScriptName, scriptFileName, isBundle, hasNoScripts, isProse]);
  const { lines, settings, screenplayText, lineToSceneMap } = value.parsedDoc;
  const parsed = useMemo<ParsedScreenplay>(() => ({ lines, settings, screenplayText, lineToSceneMap }), [lines, settings, screenplayText, lineToSceneMap]);
  return (
    <ActionsContext.Provider value={actions}>
      <WorkspaceContext.Provider value={workspace}>
        <TextContext.Provider value={value.rawText}>
          <ParsedContext.Provider value={parsed}>
            <PaginationContext.Provider value={value.parsedDoc.pageBreaks}>
              <SaveContext.Provider value={value.saveStatus}>{children}</SaveContext.Provider>
            </PaginationContext.Provider>
          </ParsedContext.Provider>
        </TextContext.Provider>
      </WorkspaceContext.Provider>
    </ActionsContext.Provider>
  );
}
