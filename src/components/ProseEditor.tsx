import { invoke } from "@tauri-apps/api/core";
import { getCurrentWebview } from "@tauri-apps/api/webview";
import { useUrAITransform } from "./ai/UrAITransform";
import React, { useRef, useState, useEffect, useMemo } from "react";
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import {
  imageDescription,
  readProseImage,
  optimizeProseImage,
  getProseImages,
  nextProseImageName,
  shortenProseImages,
} from "../utils/proseAssets";
import { getScriptSwitchToken } from "../editor/useCoreCodeMirror";
import { Transaction, type EditorState } from "@codemirror/state";
import { useProseCodeMirror } from "../editor/useProseCodeMirror";
import { CoreEditor, type MenuSelectionSnap } from "./editor/CoreEditor";
import { type ContextMenuItem, type ContextMenuItemDef } from "./ContextMenu";
import { useUI, useParsedScreenplay, useFileActions, useDocumentText } from "../context";
import { usePromptConfig } from "../hooks/usePromptConfig";

export const ProseEditor = React.memo(() => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { setActiveRightPane, setActiveTab } = useUI();
  const promptConfig = usePromptConfig();
  const transform = useUrAITransform(promptConfig);

  const rawText = useDocumentText();
  const { settings } = useParsedScreenplay();
  const { updateSettings } = useFileActions();
  const images = useMemo(() => getProseImages(settings), [settings.proseImages]);
  const imagesRef = useRef(images);
  imagesRef.current = images;
  const viewRef = useProseCodeMirror({ containerRef, images });

  useEffect(() => {
    const view = viewRef.current;
    if (!view || view.state.readOnly) return;
    const text = view.state.doc.toString();
    if (!text.includes("data:image/")) return;
    const migrated = shortenProseImages(text, imagesRef.current);
    if (migrated.text === text) return;
    imagesRef.current = migrated.images;
    updateSettings((prev) => ({ ...prev, proseImages: { ...getProseImages(prev), ...migrated.images } }));
    view.dispatch({
      changes: { from: 0, to: text.length, insert: migrated.text },
      annotations: Transaction.addToHistory.of(false),
    });
  }, [rawText, images, viewRef, updateSettings]);

  interface PendingImage {
    original: string;
    optimized?: string;
    name: string;
    state: EditorState;
    token: number;
    from: number;
    to: number;
  }
  const [pendingImage, setPendingImage] = useState<PendingImage | null>(null);
  const [imageError, setImageError] = useState("");
  const [optimizing, setOptimizing] = useState(false);
  const [tableOpen, setTableOpen] = useState(false);
  const [tableRows, setTableRows] = useState(3);
  const [tableColumns, setTableColumns] = useState(3);
  const replaceRange = useRef<{ from: number; to: number } | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const alive = useRef(true);
  const importing = useRef(false);
  const beginImport = async (file: File, position?: number) => {
    const view = viewRef.current;
    if (!view || view.state.readOnly || importing.current) return;
    importing.current = true;
    const state = view.state;
    const token = getScriptSwitchToken();
    const selection = replaceRange.current || state.selection.main;
    replaceRange.current = null;
    try {
      setImageError("");
      const original = await readProseImage(file);
      const decoded = new Image();
      decoded.src = original;
      await decoded.decode();
      if (decoded.naturalWidth * decoded.naturalHeight > 40000000)
        throw new Error("Choose an image with fewer than 40 million pixels.");
      if (
        alive.current &&
        viewRef.current === view &&
        getScriptSwitchToken() === token &&
        view.state.doc === state.doc
      ) {
        setPendingImage({
          original,
          name: nextProseImageName(imagesRef.current),
          state,
          token,
          from: position ?? selection.from,
          to: position ?? selection.to,
        });
      }
    } catch (error) {
      if (alive.current) setImageError(error instanceof Error ? error.message : "Could not import image.");
    } finally {
      importing.current = false;
    }
  };
  const insertImage = (optimized: boolean) => {
    const view = viewRef.current;
    if (!view || !pendingImage) return;
    if (
      getScriptSwitchToken() !== pendingImage.token ||
      view.state.doc !== pendingImage.state.doc ||
      view.state.readOnly
    ) {
      setPendingImage(null);
      setImageError("The document changed. Please insert the image again.");
      return;
    }
    const url = optimized ? pendingImage.optimized || pendingImage.original : pendingImage.original;
    const name = nextProseImageName(imagesRef.current);
    const nextImages = { ...imagesRef.current, [name]: url };
    imagesRef.current = nextImages;
    updateSettings((prev) => ({ ...prev, proseImages: { ...getProseImages(prev), ...nextImages } }));
    const insert = `\n\n![${imageDescription(pendingImage.name)}](${name})\n\n`;
    view.dispatch({
      changes: { from: pendingImage.from, to: pendingImage.to, insert },
      selection: { anchor: pendingImage.from + insert.length },
      userEvent: "input",
    });
    setPendingImage(null);
    view.focus();
  };
  const optimizeImage = async () => {
    if (!pendingImage) return;
    setOptimizing(true);
    try {
      const optimized = await optimizeProseImage(pendingImage.original);
      if (alive.current)
        setPendingImage((current) =>
          current?.original === pendingImage.original ? { ...current, optimized } : current,
        );
    } catch {
      if (alive.current) setImageError("Could not optimize this image. You can keep the original.");
    } finally {
      if (alive.current) setOptimizing(false);
    }
  };
  useEffect(() => {
    alive.current = true;
    const container = containerRef.current;
    const paste = (event: ClipboardEvent) => {
      const file = Array.from(event.clipboardData?.files || []).find((f) => f.type.startsWith("image/"));
      if (file) {
        event.preventDefault();
        void beginImport(file);
      }
    };
    const drop = (event: DragEvent) => {
      const file = Array.from(event.dataTransfer?.files || []).find((f) => f.type.startsWith("image/"));
      if (file) {
        event.preventDefault();
        const pos = viewRef.current?.posAtCoords({ x: event.clientX, y: event.clientY });
        void beginImport(file, pos ?? undefined);
      }
    };
    const dragover = (event: DragEvent) => {
      if (
        Array.from(event.dataTransfer?.items || []).some(
          (item) => item.kind === "file" && item.type.startsWith("image/"),
        )
      )
        event.preventDefault();
    };
    const replaceImage = (event: Event) => {
      replaceRange.current = (event as CustomEvent<{ from: number; to: number }>).detail;
      imageInputRef.current?.click();
    };
    let nativeDisposed = false;
    let unlistenNative: (() => void) | undefined;
    if (typeof window !== "undefined" && "__TAURI_INTERNALS__" in window) {
      void getCurrentWebview()
        .onDragDropEvent((event) => {
          if (nativeDisposed || event.payload.type !== "drop") return;
          const { position, paths } = event.payload;
          const x = position.x / (window.devicePixelRatio || 1);
          const y = position.y / (window.devicePixelRatio || 1);
          const target = document.elementFromPoint(x, y);
          if (!target || !container?.contains(target)) return;
          const path = paths.find((path) => /\.(png|jpe?g|webp)$/i.test(path));
          const view = viewRef.current;
          if (!path || !view || view.state.readOnly) return;
          const token = getScriptSwitchToken();
          const state = view.state;
          const pos = view.posAtCoords({ x, y }) ?? state.selection.main.from;
          void invoke<number[]>("read_file_binary", { path })
            .then((bytes) => {
              if (nativeDisposed || token !== getScriptSwitchToken() || view.state.doc !== state.doc) return;
              const name = path.split(/[/\\]/).pop() || "Image";
              const type = /\.png$/i.test(path) ? "image/png" : /\.webp$/i.test(path) ? "image/webp" : "image/jpeg";
              void beginImport(new File([new Uint8Array(bytes)], name, { type }), pos);
            })
            .catch(() => {
              if (!nativeDisposed) setImageError("Could not read this image.");
            });
        })
        .then((unlisten) => {
          if (nativeDisposed) unlisten();
          else unlistenNative = unlisten;
        })
        .catch(() => {});
    }
    container?.addEventListener("actone:replace-prose-image", replaceImage);
    container?.addEventListener("paste", paste, true);
    container?.addEventListener("drop", drop, true);
    container?.addEventListener("dragover", dragover);
    return () => {
      alive.current = false;
      nativeDisposed = true;
      unlistenNative?.();
      container?.removeEventListener("actone:replace-prose-image", replaceImage);
      container?.removeEventListener("paste", paste, true);
      container?.removeEventListener("drop", drop, true);
      container?.removeEventListener("dragover", dragover);
    };
  }, [viewRef]);

  const handlePromptAction = (action: "lookup" | "synonyms", snap: MenuSelectionSnap | null, closeMenu: () => void) => {
    const v = viewRef.current;
    const text =
      snap && snap.from !== snap.to
        ? snap.text
        : v
          ? v.state.sliceDoc(v.state.selection.main.from, v.state.selection.main.to)
          : "";
    closeMenu();
    if (!text || !text.trim()) return;

    if (action === "lookup") {
      setActiveRightPane("prompt");
      setActiveTab("urai");
      (window as any).pendingPromptAction = { action: "lookup", text };
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent("prompt-lookup", { detail: text }));
      }, 100);
    } else if (action === "synonyms") {
      setActiveRightPane("prompt");
      setActiveTab("urai");
      (window as any).pendingPromptAction = { action: "synonyms", text };
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent("prompt-synonyms", { detail: text }));
      }, 100);
    }
  };

  const handleRephraseClick = (instruction: string, snap: MenuSelectionSnap | null, closeMenu: () => void) => {
    const v = viewRef.current;
    closeMenu();
    if (!v) return;
    const from = snap?.from ?? v.state.selection.main.from;
    const to = snap?.to ?? v.state.selection.main.to;
    if (from !== to) transform.start(v, from, to, "rephrase", instruction);
  };
  const handleTranslateClick = (lang: string, snap: MenuSelectionSnap | null, closeMenu: () => void) => {
    const v = viewRef.current;
    closeMenu();
    if (!v) return;
    const from = snap?.from ?? v.state.selection.main.from;
    const to = snap?.to ?? v.state.selection.main.to;
    if (from !== to) transform.start(v, from, to, "translate", "", lang);
  };

  const extraContextMenuItems = (
    snap: MenuSelectionSnap | null,
    hasSel: boolean,
    closeMenu: () => void,
  ): ContextMenuItem[] => {
    const uraiItems: ContextMenuItemDef[] = hasSel
      ? [
          { label: "Look up", action: () => handlePromptAction("lookup", snap, closeMenu) },
          { label: "Synonyms", action: () => handlePromptAction("synonyms", snap, closeMenu) },
          {
            label: "Rephrase",
            children: promptConfig.rephrasePresets.map((preset) => ({
              label: preset.name || "Untitled",
              enabled: !!preset.prompt.trim(),
              action: () => handleRephraseClick(preset.prompt, snap, closeMenu),
            })),
          },
          {
            label: "Translate",
            children: promptConfig.translateLanguages.map((lang) => ({
              label: lang,
              action: () => handleTranslateClick(lang, snap, closeMenu),
            })),
          },
        ]
      : [];

    return [
      ...(uraiItems.length > 0
        ? [{ label: "UrAI", children: uraiItems } satisfies ContextMenuItem, "separator" as const]
        : []),
      {
        label: "Insert Image…",
        action: () => {
          closeMenu();
          replaceRange.current = null;
          imageInputRef.current?.click();
        },
      },
      {
        label: "Insert Table",
        action: () => {
          closeMenu();
          setTableOpen(true);
        },
      },
    ];
  };

  return (
    <>
      {transform.dialog}
      <input
        ref={imageInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        hidden
        aria-label="Import prose image"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void beginImport(file);
          event.target.value = "";
        }}
      />
      {imageError && !pendingImage && (
        <Alert severity="error" onClose={() => setImageError("")}>
          {imageError}
        </Alert>
      )}
      <Dialog
        open={!!pendingImage}
        onClose={() => {
          if (!optimizing) setPendingImage(null);
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Insert image</DialogTitle>
        <DialogContent>
          {imageError && <Alert severity="error">{imageError}</Alert>}
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              label="Image description"
              value={pendingImage?.name || ""}
              onChange={(event) =>
                setPendingImage((current) => (current ? { ...current, name: event.target.value } : current))
              }
            />
            {pendingImage && (
              <img
                src={pendingImage.optimized || pendingImage.original}
                alt={pendingImage.name}
                style={{ maxWidth: "100%", maxHeight: 280, objectFit: "contain" }}
              />
            )}
            <Typography variant="body2">
              Original: {pendingImage ? Math.round((pendingImage.original.split(",")[1].length * 3) / 4 / 1024) : 0} KB
              {pendingImage?.optimized
                ? ` · Optimized: ${Math.round((pendingImage.optimized.split(",")[1].length * 3) / 4 / 1024)} KB`
                : ""}
            </Typography>
            <Typography variant="body2">
              Keep the original quality, or optimize a copy to reduce project size. Your original file stays untouched.
              Optimization fits within 2400 pixels and preserves transparency. Undo will not restore the
              pre-optimization image.
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button disabled={optimizing} onClick={() => setPendingImage(null)}>
            Cancel
          </Button>
          <Button disabled={optimizing} onClick={() => insertImage(false)}>
            Keep original
          </Button>
          {pendingImage?.optimized ? (
            <Button variant="contained" onClick={() => insertImage(true)}>
              Insert optimized
            </Button>
          ) : (
            <Button disabled={optimizing} onClick={() => void optimizeImage()}>
              {optimizing ? "Optimizing…" : "Optimize image"}
            </Button>
          )}
        </DialogActions>
      </Dialog>
      <Dialog open={tableOpen} onClose={() => setTableOpen(false)}>
        <DialogTitle>Insert table</DialogTitle>
        <DialogContent>
          <Stack direction="row" spacing={2} sx={{ pt: 1 }}>
            <TextField
              label="Body rows"
              type="number"
              value={tableRows}
              slotProps={{ htmlInput: { min: 1, max: 50 } }}
              onChange={(e) => setTableRows(Number(e.target.value))}
            />
            <TextField
              label="Columns"
              type="number"
              value={tableColumns}
              slotProps={{ htmlInput: { min: 1, max: 12 } }}
              onChange={(e) => setTableColumns(Number(e.target.value))}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTableOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={
              !Number.isInteger(tableRows) ||
              tableRows < 1 ||
              tableRows > 50 ||
              !Number.isInteger(tableColumns) ||
              tableColumns < 1 ||
              tableColumns > 12
            }
            onClick={() => {
              const view = viewRef.current;
              if (!view || view.state.readOnly) return;
              const row = (cells: string[]) => "| " + cells.join(" | ") + " |";
              const insert =
                "\n\n" +
                [
                  row(Array.from({ length: tableColumns }, (_, i) => `Column ${i + 1}`)),
                  row(Array(tableColumns).fill("---")),
                  ...Array.from({ length: tableRows }, () => row(Array(tableColumns).fill(""))),
                ].join("\n") +
                "\n\n";
              const selection = view.state.selection.main;
              view.dispatch({
                changes: { from: selection.from, to: selection.to, insert },
                selection: { anchor: selection.from + insert.length },
                userEvent: "input",
              });
              setTableOpen(false);
              view.focus();
            }}
          >
            Insert table
          </Button>
        </DialogActions>
      </Dialog>
      <CoreEditor containerRef={containerRef} viewRef={viewRef} extraContextMenuItems={extraContextMenuItems} />
    </>
  );
});
