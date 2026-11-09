import { optimizeProseImage } from "../utils/proseAssets";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import {
  Excalidraw,
  MainMenu,
  WelcomeScreen,
  loadFromBlob,
  serializeAsJSON,
  getSceneVersion,
  newElementWith,
  CaptureUpdateAction,
} from "@excalidraw/excalidraw";
import type {
  ExcalidrawProps,
  ExcalidrawInitialDataState,
  ExcalidrawImperativeAPI,
  BinaryFileData,
} from "@excalidraw/excalidraw/types";
import { useDocumentText, useFileActions, useWorkspaceMetadata } from "../context";
import { registerPendingEditor } from "../editor/pendingEdits";
import "@excalidraw/excalidraw/index.css";
import "./canvas.css";
import { WindowLoading } from "./WindowLoading";

declare global {
  interface Window {
    EXCALIDRAW_ASSET_PATH?: string;
  }
}
window.EXCALIDRAW_ASSET_PATH = `${import.meta.env.BASE_URL}canvas-assets/`;
interface CanvasImageChoice {
  file: BinaryFileData;
  optimized?: string;
  owner: string;
}
type Snapshot = Parameters<NonNullable<ExcalidrawProps["onChange"]>>;

export function CanvasEditor() {
  const text = useDocumentText();
  const { activeFileId, activeScriptIndex, activeScriptName } = useWorkspaceMetadata();
  const { setRawText, saveFile } = useFileActions();
  const theme = useTheme();
  const [initialData, setInitialData] = useState<ExcalidrawInitialDataState | null>(null);
  const [error, setError] = useState("");
  const [imageChoices, setImageChoices] = useState<CanvasImageChoice[]>([]);
  const [optimizing, setOptimizing] = useState(false);
  const [imageError, setImageError] = useState("");
  const seenImages = useRef(new Set<string>());
  const optimizedReplacements = useRef(new Map<string, BinaryFileData["id"]>());
  const alive = useRef(true);
  const owner = `${activeFileId}:${activeScriptIndex}`;
  const ownerRef = useRef(owner);
  ownerRef.current = owner;
  const choice = imageChoices[0]?.owner === owner ? imageChoices[0] : undefined;
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const snapshot = useRef<Snapshot | null>(null);
  const editorApi = useRef<ExcalidrawImperativeAPI | null>(null);
  const lastSaved = useRef(text);
  const version = useRef<number | null>(null);
  const dirty = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialText = useRef(text);
  const flush = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    if (!snapshot.current || !dirty.current) return;
    const [elements, state, files] = snapshot.current;
    const json = serializeAsJSON(elements, state, files, "local");
    dirty.current = false;
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
        if (!cancelled) {
          seenImages.current = new Set(Object.keys(data.files || {}));
          setInitialData({ ...data, scrollToContent: true });
        }
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
      // Undo/redo may restore an earlier element snapshot. Keep the accepted
      // optimized asset even when that snapshot referenced its old file ID.
      if (
        elements.some(
          (element) => element.type === "image" && element.fileId && optimizedReplacements.current.has(element.fileId),
        )
      ) {
        editorApi.current?.updateScene({
          elements: elements.map((element) =>
            element.type === "image" && element.fileId && optimizedReplacements.current.has(element.fileId)
              ? newElementWith(element, { fileId: optimizedReplacements.current.get(element.fileId)! })
              : element,
          ),
          captureUpdate: CaptureUpdateAction.NEVER,
        });
        return;
      }
      const added: CanvasImageChoice[] = [];
      for (const element of elements) {
        if (element.type !== "image" || element.isDeleted || !element.fileId || seenImages.current.has(element.fileId))
          continue;
        const file = files[element.fileId];
        if (!file) continue;
        seenImages.current.add(element.fileId);
        if (version.current !== null && ["image/png", "image/jpeg", "image/webp"].includes(file.mimeType)) {
          added.push({ file, owner: ownerRef.current });
        }
      }
      if (added.length) setImageChoices((current) => [...current, ...added]);
      const nextVersion = getSceneVersion(elements);
      const previousState = snapshot.current?.[1];
      // These are the app-state fields retained by Excalidraw's JSON export.
      const changed =
        nextVersion !== version.current ||
        snapshot.current?.[2] !== files ||
        previousState?.viewBackgroundColor !== state.viewBackgroundColor ||
        previousState?.gridSize !== state.gridSize ||
        previousState?.gridStep !== state.gridStep ||
        previousState?.gridModeEnabled !== state.gridModeEnabled;
      snapshot.current = [elements, state, files];
      if (version.current === null) {
        version.current = nextVersion;
        return;
      }
      version.current = nextVersion;
      if (!changed) return;
      dirty.current = true;
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(flush, 400);
    },
    [flush],
  );
  const dismissImage = () => {
    setImageChoices((current) => current.slice(1));
    setImageError("");
  };
  const optimizeImage = async () => {
    if (!choice || optimizing) return;
    setOptimizing(true);
    setImageError("");
    try {
      const optimized = await optimizeProseImage(choice.file.dataURL);
      if (alive.current && ownerRef.current === choice.owner)
        setImageChoices((current) => current.map((item) => (item === choice ? { ...item, optimized } : item)));
    } catch {
      if (alive.current && ownerRef.current === choice.owner)
        setImageError("Could not optimize this image. You can keep the original.");
    } finally {
      if (alive.current) setOptimizing(false);
    }
  };
  const useOptimizedImage = () => {
    const api = editorApi.current;
    if (!choice?.optimized || !api || ownerRef.current !== choice.owner) return;
    if (choice.optimized !== choice.file.dataURL) {
      const id = crypto.randomUUID() as BinaryFileData["id"];
      seenImages.current.add(id);
      const mimeType = choice.optimized.startsWith("data:image/jpeg;")
        ? "image/jpeg"
        : choice.optimized.startsWith("data:image/png;")
          ? "image/png"
          : "image/webp";
      optimizedReplacements.current.set(choice.file.id, id);
      api.addFiles([
        { ...choice.file, id, dataURL: choice.optimized as BinaryFileData["dataURL"], mimeType, created: Date.now() },
      ]);
      api.updateScene({
        elements: api
          .getSceneElements()
          .map((element) =>
            element.type === "image" && element.fileId === choice.file.id && !element.isDeleted
              ? newElementWith(element, { fileId: id })
              : element,
          ),
        captureUpdate: CaptureUpdateAction.NEVER,
      });
    }
    dismissImage();
  };
  const imageKB = (url: string) => Math.ceil(((url.split(",")[1]?.length || 0) * 3) / 4 / 1024);
  if (error) return <Alert severity="error">{error}</Alert>;
  if (!initialData) return <WindowLoading embedded spinning label="Loading canvas" />;
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
      <Dialog
        open={!!choice}
        onClose={() => {
          if (!optimizing) dismissImage();
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Canvas image</DialogTitle>
        <DialogContent>
          <Stack spacing={2}>
            {imageError && <Alert severity="error">{imageError}</Alert>}
            {choice && (
              <img
                src={choice.optimized || choice.file.dataURL}
                alt="Imported canvas image"
                style={{ maxWidth: "100%", maxHeight: 280, objectFit: "contain" }}
              />
            )}
            <Typography variant="body2">
              The image has been added. Keep its original quality, or optimize a copy to reduce project size. Your
              original file stays untouched.
            </Typography>
            <Typography variant="body2">
              Optimization fits within 2400 pixels and preserves transparency. Undo will not restore the
              pre-optimization image.
            </Typography>
            {choice && (
              <Typography variant="body2">
                Original: {imageKB(choice.file.dataURL)} KB
                {choice.optimized ? ` · Optimized: ${imageKB(choice.optimized)} KB` : ""}
              </Typography>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button disabled={optimizing} onClick={dismissImage}>
            Keep original
          </Button>
          {choice?.optimized ? (
            <Button variant="contained" onClick={useOptimizedImage}>
              Use optimized
            </Button>
          ) : (
            <Button disabled={optimizing} onClick={() => void optimizeImage()}>
              {optimizing ? "Optimizing…" : "Optimize image"}
            </Button>
          )}
        </DialogActions>
      </Dialog>
      {initialData && (
        <Excalidraw
          initialData={initialData}
          excalidrawAPI={(api) => {
            editorApi.current = api;
          }}
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
