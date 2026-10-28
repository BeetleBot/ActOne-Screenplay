import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Box } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import {
  Excalidraw,
  MainMenu,
  WelcomeScreen,
  loadFromBlob,
  serializeAsJSON,
  getSceneVersion,
} from "@excalidraw/excalidraw";
import type { ExcalidrawProps, ExcalidrawInitialDataState, ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import { useDocumentText, useFileActions, useWorkspaceMetadata } from "../context";
import { registerPendingEditor } from "../editor/pendingEdits";
import "@excalidraw/excalidraw/index.css";
import "./canvas.css";

declare global {
  interface Window {
    EXCALIDRAW_ASSET_PATH?: string;
  }
}
window.EXCALIDRAW_ASSET_PATH = `${import.meta.env.BASE_URL}canvas-assets/`;
type Snapshot = Parameters<NonNullable<ExcalidrawProps["onChange"]>>;

export function CanvasEditor() {
  const text = useDocumentText();
  const { activeFileId, activeScriptIndex, activeScriptName } = useWorkspaceMetadata();
  const { setRawText, saveFile } = useFileActions();
  const theme = useTheme();
  const [initialData, setInitialData] = useState<ExcalidrawInitialDataState | null>(null);
  const [error, setError] = useState("");
  const snapshot = useRef<Snapshot | null>(null);
  const editorApi = useRef<ExcalidrawImperativeAPI | null>(null);
  const lastSaved = useRef(text);
  const version = useRef<number | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialText = useRef(text);
  const flush = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    if (!snapshot.current) return;
    const [elements, state, files] = snapshot.current;
    const json = serializeAsJSON(elements, state, files, "local");
    if (json !== lastSaved.current) {
      lastSaved.current = json;
      setRawText(json, { fileId: activeFileId, scriptIndex: activeScriptIndex });
    }
  }, [activeFileId, activeScriptIndex, setRawText]);
  useEffect(() => {
    const openImageExport = () => {
      flush();
      editorApi.current?.updateScene({ appState: { openDialog: { name: "imageExport" } } });
    };
    window.addEventListener("actone:canvas-export-image", openImageExport);
    return () => window.removeEventListener("actone:canvas-export-image", openImageExport);
  }, [flush]);
  useEffect(() => {
    let cancelled = false;
    void loadFromBlob(new Blob([initialText.current]), null, null)
      .then((data) => {
        if (!cancelled) setInitialData({ ...data, scrollToContent: true });
      })
      .catch(() => {
        if (!cancelled) setError("This canvas could not be opened. Its original contents have been preserved.");
      });
    return () => {
      cancelled = true;
    };
  }, []);
  useEffect(() => {
    const unregister = registerPendingEditor(activeFileId, flush);
    return () => {
      flush();
      unregister();
    };
  }, [activeFileId, flush]);
  const onChange = useCallback<NonNullable<ExcalidrawProps["onChange"]>>(
    (elements, state, files) => {
      if (state.openSidebar?.name === "default" && state.openSidebar.tab !== "search") {
        editorApi.current?.updateScene({ appState: { openSidebar: null } });
      }
      const nextVersion = getSceneVersion(elements);
      const changed = nextVersion !== version.current || snapshot.current?.[2] !== files || snapshot.current?.[1].viewBackgroundColor !== state.viewBackgroundColor;
      snapshot.current = [elements, state, files];
      if (version.current === null) {
        version.current = nextVersion;
        lastSaved.current = serializeAsJSON(elements, state, files, "local");
        return;
      }
      version.current = nextVersion;
      if (!changed) return;
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(flush, 400);
    },
    [flush],
  );
  if (error) return <Alert severity="error">{error}</Alert>;
  return (
    <Box
      className="actone-canvas"
      onKeyDownCapture={(e) => {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
          e.preventDefault();
          e.stopPropagation();
          flush();
          void saveFile();
        }
      }}
    >
      {initialData && (
        <Excalidraw
          initialData={initialData}
          excalidrawAPI={api => { editorApi.current = api; }}
          onChange={onChange}
          theme={theme.palette.mode}
          name={activeScriptName}
          autoFocus
          aiEnabled={false}
          validateEmbeddable={false}
          handleKeyboardGlobally={false}
          UIOptions={{
            canvasActions: { loadScene: false, saveToActiveFile: false, export: false, toggleTheme: false },
          }}
        >
          <MainMenu>
            <MainMenu.DefaultItems.SaveAsImage />
            <MainMenu.DefaultItems.ClearCanvas />
          </MainMenu>
          <WelcomeScreen>
            <WelcomeScreen.Center>
              <WelcomeScreen.Center.Heading>Canvas</WelcomeScreen.Center.Heading>
            </WelcomeScreen.Center>
          </WelcomeScreen>
        </Excalidraw>
      )}
    </Box>
  );
}
