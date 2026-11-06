/** Each WebView owns its registrations; callbacks synchronously publish editor text. */
interface PendingEditor {
  fileId: string;
  flush: () => void;
  readText?: (scriptFileName: string) => string | undefined;
}

const editors = new Set<PendingEditor>();

export function registerPendingEditor(fileId: string, flush: () => void, readText?: PendingEditor["readText"]): () => void {
  const editor = { fileId, flush, readText };
  editors.add(editor);
  return () => { editors.delete(editor); };
}

export function readLiveEditorText(fileId: string, scriptFileName: string): string | undefined {
  for (const editor of editors) {
    if (editor.fileId !== fileId) continue;
    const text = editor.readText?.(scriptFileName);
    if (text !== undefined) return text;
  }
}

export function flushPendingEditorEdits(fileId?: string): void {
  for (const editor of editors) {
    if (fileId === undefined || editor.fileId === fileId) editor.flush();
  }
}
