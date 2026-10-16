/** Each WebView owns its registrations; callbacks synchronously publish editor text. */
interface PendingEditor {
  fileId: string;
  flush: () => void;
}

const editors = new Set<PendingEditor>();

export function registerPendingEditor(fileId: string, flush: () => void): () => void {
  const editor = { fileId, flush };
  editors.add(editor);
  return () => { editors.delete(editor); };
}

export function flushPendingEditorEdits(fileId?: string): void {
  for (const editor of editors) {
    if (fileId === undefined || editor.fileId === fileId) editor.flush();
  }
}
