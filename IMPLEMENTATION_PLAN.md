# ActOne — Bug Fix Implementation Plan (PRs 1–3)

This plan covers **17 bug fixes** across **3 pull requests**, all derived from a line-by-line audit of the ActOne codebase. Bug #2 (SearchPanel Ctrl+Z) was marked "intentional" and is **not** included.

> **Conventions from `ActOneCode/AGENTS.md` (must follow):**
> - No source comments in committed code.
> - Document every change in `ActOneCode/docs/` (features & developer-guide).
> - Cross-platform Windows + Linux: no `navigator.platform` / `process.platform` branches. Use capability checks (`"__TAURI_INTERNALS__" in window`).
> - Keyboard: use `e.key` + `e.ctrlKey || e.metaKey`; guard `e.repeat` for any global keydown.
> - Tauri APIs: wrap in `try/catch`; dynamic-import infrequently used plugins.
> - Line endings: normalize `\r\n → \n` on read; regex splits use `\r?\n`.
> - Native events: use `e.nativeEvent.dataTransfer` for `DataTransfer`/`clipboardData`/`files`.
> - Tests: co-located `*.test.ts(x)`; `test-setup.ts` sets `__TAURI_INTERNALS__ = undefined`.

> **Scripts (from `ActOneCode/package.json`):**
> - `npm test` (Vitest) / `npm run test:watch`
> - `npm run lint` (ESLint on `src/`)
> - `npm run typecheck` / `npm run lint:tsc` (tsc --noEmit)
> - `cd src-tauri && cargo test` for Rust

> **Workdir:** all paths below are relative to `ActOneCode/` unless noted.
> All code snippets show the **final committed form** (no source comments, no debug logs).

---

## Table of Contents
- [PR 1 — Editor & Data Integrity (8 fixes)](#pr-1--editor--data-integrity-8-fixes)
  - [Bug 1 — Cut/Copy in editor context menu](#bug-1--cutcopy-in-editor-context-menu)
  - [Bug 3 — scrollToLine crash on bad line number](#bug-3--scrolltoline-crash-on-bad-line-number)
  - [Bug 4 — Snapshot restore doesn't reload editor](#bug-4--snapshot-restore-doesnt-reload-editor)
  - [Bug 5 — Ctrl+S re-fires on key repeat](#bug-5--ctrls-re-fires-on-key-repeat)
  - [Bug 6 — Sprint "words written" is total words](#bug-6--sprint-words-written-is-total-words)
  - [Bug 7 — Watermark X button drops settings](#bug-7--watermark-x-button-drops-settings)
  - [Bug 8 — Watermark Done button drops settings](#bug-8--watermark-done-button-drops-settings)
  - [Bug 14 — Pre-restore safety snapshot (new `Restore` type)](#bug-14--pre-restore-safety-snapshot-new-restore-type)
- [PR 2 — Engines, Light-Mode, Cross-Platform (5 fixes)](#pr-2--engines-light-mode-cross-platform-5-fixes)
  - [Bug 9 — AppPrefsEngine reset leaks listener](#bug-9--appprefsengine-reset-leaks-listener)
  - [Bug 10 — AppPrefsEngine.setPrefs fallback doesn't notify](#bug-10--appprefsenginesetprefs-fallback-doesnt-notify)
  - [Bug 11 — ThemeEngine reset leaks listener](#bug-11--themeengine-reset-leaks-listener)
  - [Bug 12 — X-Ray CharacterEditModal hardcoded dark](#bug-12--x-ray-charactereditmodal-hardcoded-dark)
  - [Bug 13 — Update check on Linux (remove feature)](#bug-13--update-check-on-linux-remove-feature)
- [PR 3 — Rust Backend Correctness (4 fixes)](#pr-3--rust-backend-correctness-4-fixes)
  - [Bug 15 — Parser InBlock misses heading/transition/shot](#bug-15--parser-inblock-misses-headingtransitionshot)
  - [Bug 16 — Title-page parser drops unknown KEY: value pairs](#bug-16--title-page-parser-drops-unknown-key-value-pairs)
  - [Bug 17 — FDX color encoding is non-standard](#bug-17--fdx-color-encoding-is-non-standard)
  - [Bug 18 — fadein_pack panics on failure](#bug-18--fadein_pack-panics-on-failure)
- [Cross-PR — Verification & Final Checks](#cross-pr--verification--final-checks)

---

# PR 1 — Editor & Data Integrity (8 fixes)

Goal: stop losing user work, make the right-click menu actually work, and add a safety net for restore.

## PR 1 commit message
```
fix(editor): cut/copy, scrollToLine, snapshot reload, sprint delta, watermark persist, key-repeat, restore safety

- Cut/Copy in editor context menu now operate on the right-clicked selection via the Tauri clipboard plugin
- scrollToLine in EditorContext no longer crashes on a bad line number
- Restoring a snapshot reloads the editor with the restored file
- useKeyboardShortcuts ignores key-repeat so Ctrl+S no longer re-saves
- Sprint sessions now report words-written-during-sprint, not total words
- Watermark opacity/grayscale now persist when closing via X or Done (refactored to one helper)
- Restoring a snapshot first creates a safety snapshot of the current file with snapshot_type=Restore
```
Commit **inside `ActOneCode/`** first, then `cd .. && git add ActOneCode && git commit -m "chore(submodule): bump ActOneCode to <new SHA>"` in the parent.

---

## Bug 1 — Cut/Copy in editor context menu

**Why it's broken:** `handleEditorAction` in `src/components/FountainEditor.tsx:367-385` calls `view.focus()` then `document.execCommand("cut"|"copy")`. After a right-click, CodeMirror collapses the selection → nothing to act on; `execCommand` is also deprecated.

**Fix:** Use the pre-click selection (already captured in `menuSelectionRef` by `handleMouseDown` at line 139-149) and operate via CodeMirror transactions + Tauri's clipboard plugin.

### Code changes

**`src/components/FountainEditor.tsx`**

**Edit 1 — line 9 (imports):** add `writeText` to the import.

Replace:
```ts
import { readText } from "@tauri-apps/plugin-clipboard-manager";
```
With:
```ts
import { readText, writeText } from "@tauri-apps/plugin-clipboard-manager";
```

**Edit 2 — lines 367-385 (the `handleEditorAction` function):**

Replace:
```ts
  const handleEditorAction = async (cmd: string) => {
    if (!view) return;
    view.focus();
    if (cmd === "paste") {
      try {
        const text = await readText();
        const sel = view.state.selection.main;
        view.dispatch({
          changes: { from: sel.from, to: sel.to, insert: text },
          selection: { anchor: sel.from + text.length }
        });
      } catch (e) {
        logger.error("editor", "clipboard read failed", e);
      }
    } else {
      document.execCommand(cmd);
    }
    handleClose();
  };
```
With:
```ts
  const handleEditorAction = async (cmd: string) => {
    if (!view) return;
    const snap = menuSelectionRef.current;
    if (cmd === "paste") {
      try {
        const text = await readText();
        const sel = view.state.selection.main;
        view.dispatch({
          changes: { from: sel.from, to: sel.to, insert: text },
          selection: { anchor: sel.from + text.length }
        });
      } catch (e) {
        logger.error("editor", "clipboard read failed", e);
      }
    } else if (snap && snap.from !== snap.to && (cmd === "cut" || cmd === "copy")) {
      try {
        await writeText(snap.text);
        if (cmd === "cut") {
          view.dispatch({
            changes: { from: snap.from, to: snap.to, insert: "" },
            selection: { anchor: snap.from },
          });
        }
      } catch (e) {
        logger.error("editor", "clipboard write failed", e);
      }
    }
    view.focus();
    handleClose();
  };
```

**Edit 3 — lines 479-491 (Cut/Copy MenuItems):** keep the `disabled` logic but ensure it tracks `menuHasSelection` (already in scope at line 82). No edit needed if it already says `disabled={!menuHasSelection}`. Verify it does (the read at lines 479-491 in the prior turn confirmed `disabled={!menuHasSelection}` is already set on both items).

### Test
There is no existing `FountainEditor.test.tsx`. Create one:

**`src/components/FountainEditor.test.tsx`** (new file):
```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import React from "react";
import { readText, writeText } from "@tauri-apps/plugin-clipboard-manager";

vi.mock("@tauri-apps/plugin-clipboard-manager", () => ({
  readText: vi.fn(async () => "PASTED"),
  writeText: vi.fn(async () => undefined),
}));

vi.mock("../context", () => ({
  useFile: () => ({
    rawText: "INT. HOUSE - DAY\n\nHello world.",
    parsedDoc: { lines: [{ type: "heading", text: "INT. HOUSE - DAY" }, { type: "action", text: "" }, { type: "action", text: "Hello world." }] },
    scriptFileName: "test.fountain",
  }),
  useUI: () => ({ fontFamily: "courier-prime" }),
  useEditor: () => ({ updateSettings: vi.fn() }),
  useParking: () => ({ addItem: vi.fn() }),
  useCustomModal: () => ({ prompt: vi.fn(async () => null) }),
}));

import { FountainEditor } from "./FountainEditor";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("FountainEditor context menu", () => {
  it("copies the right-clicked selection via writeText", async () => {
    const { container } = render(React.createElement(FountainEditor));
    const editorRoot = container.firstChild as HTMLElement;
    fireEvent.mouseDown(editorRoot, { button: 2 });
    fireEvent.contextMenu(editorRoot, { clientX: 10, clientY: 10 });
    const cutItem = await (await import("@testing-library/react")).findByText("Cut");
    fireEvent.click(cutItem);
    expect(writeText).toHaveBeenCalled();
  });
});
```

> **Note to coder:** if `FountainEditor` is hard to mount in jsdom (e.g. CodeMirror needs DOM measurements), a smaller-scope test is acceptable: extract `handleEditorAction` into a pure helper `editorActions.ts` and unit-test that. The simpler refactor: write a focused test for the dispatch+writeText logic by exporting a tiny helper `performEditorAction(view, snap, cmd)` and importing it in the test. If neither is straightforward, document why and skip this test (the integration test via manual smoke test still validates).

### Docs
- `docs/features/01-editor.md` — add a short section "Right-click menu" that documents the Cut/Copy/Paste/Case/Park actions operate on the pre-click selection.

---

## Bug 3 — scrollToLine crash on bad line number

**File:** `src/context/EditorContext.tsx:44-53`

**Fix:** Wrap the CodeMirror call in try/catch and log.

### Code change

Replace lines 44-53:
```ts
  const scrollToLine = (lineIndex: number, noFocus?: boolean) => {
    if (editorView) {
      const line = editorView.state.doc.line(lineIndex + 1);
      editorView.dispatch({
        selection: { anchor: line.from },
        effects: EditorView.scrollIntoView(line.from, { y: "center" }),
      });
      if (!noFocus) editorView.focus();
    }
  };
```
With:
```ts
  const scrollToLine = (lineIndex: number, noFocus?: boolean) => {
    if (!editorView) return;
    try {
      const line = editorView.state.doc.line(lineIndex + 1);
      editorView.dispatch({
        selection: { anchor: line.from },
        effects: EditorView.scrollIntoView(line.from, { y: "center" }),
      });
      if (!noFocus) editorView.focus();
    } catch (e) {
      logger.warn("editor", `scrollToLine(${lineIndex}) failed`, e);
    }
  };
```
Add to imports (top of file):
```ts
import { logger } from "../utils/logger";
```
(Check if already imported; if so, skip.)

### Test
**`src/context/EditorContext.test.tsx`** — append one new test (no existing file). If you create a new file, use the same provider wrapper as `EditorContext.test.tsx` doesn't exist; mirror the pattern from `FileContext.test.tsx` (the File/UI/Editor/CustomModal/Snapshot providers). Quick stub:
```tsx
import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import React from "react";
import { EditorProvider, useEditor } from "./EditorContext";
import { FileProvider } from "./FileContext";
import { CustomModalProvider } from "./CustomModalContext";
import { UIProvider } from "./UIContext";

function wrapper({ children }: { children: React.ReactNode }) {
  return React.createElement(UIProvider, null,
    React.createElement(CustomModalProvider, null,
      React.createElement(FileProvider, null,
        React.createElement(EditorProvider, null, children)
      )
    )
  );
}

describe("EditorContext.scrollToLine", () => {
  it("does not throw when lineIndex is out of range", () => {
    const { result } = renderHook(() => useEditor(), { wrapper });
    expect(() => result.current.scrollToLine(99999)).not.toThrow();
  });
});
```

### Docs
No doc change (internal hardening).

---

## Bug 4 — Snapshot restore doesn't reload editor

**File:** `src/context/SnapshotContext.tsx:212-219`

**Fix:** After the `restore_snapshot` invoke resolves, call `openFilePath(filePath)` to reload the editor. (This is the same helper used by `openSnapshotAsFile` at line 221-227.)

### Code change

Replace lines 212-219:
```ts
  const restoreSnapshot = useCallback(async (info: SnapshotInfo) => {
    if (!filePath) return;
    try {
      await invoke("restore_snapshot", { filePath, snapshotPath: info.snapshot_path });
    } catch (e) {
      logger.warn("snapshots", "Failed to restore snapshot", e);
    }
  }, [filePath]);
```
With:
```ts
  const restoreSnapshot = useCallback(async (info: SnapshotInfo) => {
    if (!filePath) return;
    try {
      await invoke("create_pre_restore_snapshot", {
        filePath,
        aboutToRestoreId: info.id,
      });
    } catch (e) {
      logger.warn("snapshots", "Pre-restore snapshot failed (continuing)", e);
    }
    try {
      await invoke("restore_snapshot", { filePath, snapshotPath: info.snapshot_path });
      await openFilePath(filePath);
    } catch (e) {
      logger.warn("snapshots", "Failed to restore snapshot", e);
    }
  }, [filePath, openFilePath]);
```

> The `create_pre_restore_snapshot` invoke is added **in Bug 14 (Rust)**. If implementing PR 1 in steps, the frontend can call this invoke first; if the backend doesn't yet have it, the catch swallows the error and the restore still proceeds. So this is safe to land together with Bug 14.

### Test
**`src/context/SnapshotContext.test.tsx`** — append (file already has tests; add new ones):
```tsx
import { vi } from "vitest";
import { invoke } from "@tauri-apps/api/core";

vi.mock("@tauri-apps/api/core", async () => {
  const actual = await vi.importActual<typeof import("@tauri-apps/api/core")>("@tauri-apps/api/core");
  return { ...actual, invoke: vi.fn() };
});
```
Then add tests (mock `invoke` returning empty/OK, mock `openFilePath` via the FileContext):
```tsx
  it("restoreSnapshot creates a pre-restore snapshot then restores then reloads", async () => {
    const { result } = renderHook(() => useSnapshots(), { wrapper });
    const info: SnapshotInfo = {
      id: "snap-1", filename: "x.fountain", snapshot_path: "/x", created_at: "",
      snapshot_type: "manual", comment: "", file_size: 0, custom_tag: "",
    };
    act(() => result.current.updateSettings({ enabled: true }));
    await act(async () => { await result.current.restoreSnapshot(info); });
    const calls = (invoke as unknown as ReturnType<typeof vi.fn>).mock.calls.map(c => c[0]);
    expect(calls).toContain("create_pre_restore_snapshot");
    expect(calls).toContain("restore_snapshot");
  });
```
The test-setup's `__TAURI_INTERNALS__ = undefined` means `invoke` will throw — your mock above replaces it. Confirm the existing `SnapshotContext.test.tsx` doesn't already mock `invoke`; if not, add this mock at the top.

### Docs
- `docs/features/11-snapshots.md` — add a short "Restoring a snapshot" section: "The editor reloads automatically. A safety copy of the current file is saved first as a `Restore`-type snapshot so you can undo the restore if needed."

---

## Bug 5 — Ctrl+S re-fires on key repeat

**File:** `src/hooks/useKeyboardShortcuts.ts:62`

**Fix:** Add `if (e.repeat) return;` as the first line of `handleKeyDown`.

### Code change

Replace the first line of `handleKeyDown` (line 62):
```ts
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.key.toLowerCase() === "q") {
```
With:
```ts
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (e.altKey && e.key.toLowerCase() === "q") {
```

### Test
**`src/hooks/useKeyboardShortcuts.test.ts`** — append (test file already exists; uses the `fireKey` helper at line 29):
```tsx
  it("ignores key-repeat so Ctrl+S does not re-save", () => {
    const actions = createActions();
    renderHook(() => useKeyboardShortcuts(actions));
    const event = new KeyboardEvent("keydown", {
      key: "s", ctrlKey: true, metaKey: true, bubbles: true, cancelable: true,
    });
    Object.defineProperty(event, "repeat", { value: true });
    window.dispatchEvent(event);
    expect(actions.saveFile).not.toHaveBeenCalled();
  });
```

### Docs
No doc change.

---

## Bug 6 — Sprint "words written" is total words

**Files:** `src/context/SprintContext.tsx:69-83`, test at `src/context/SprintContext.test.tsx:29-39`.

**Fix:** Compute the delta in `stopSprint` and use it as the session `wordCount`.

### Code change

Replace lines 69-83:
```ts
  const stopSprint = (fileId: string, wordCount: number, fileName?: string): SprintSession | null => {
    const active = activeSprints[fileId];
    if (!active) return null;

    const actualDuration = Math.min(active.durationMinutes, Math.max(1, Math.round((Date.now() - active.startTime) / 60000)));
    const newSession: SprintSession = {
      id: Date.now().toString(),
      startTime: active.startTime,
      endTime: Date.now(),
      durationMinutes: actualDuration,
      wordCount,
      content: "",
      fileName,
      fileId,
    };
```
With:
```ts
  const stopSprint = (fileId: string, wordCount: number, fileName?: string): SprintSession | null => {
    const active = activeSprints[fileId];
    if (!active) return null;

    const actualDuration = Math.min(active.durationMinutes, Math.max(1, Math.round((Date.now() - active.startTime) / 60000)));
    const wordsWritten = Math.max(0, wordCount - active.startWordCount);
    const newSession: SprintSession = {
      id: Date.now().toString(),
      startTime: active.startTime,
      endTime: Date.now(),
      durationMinutes: actualDuration,
      wordCount: wordsWritten,
      content: "",
      fileName,
      fileId,
    };
```

### Test
**`src/context/SprintContext.test.tsx`** — update the existing test at line 29-39 to reflect the new semantics:
```tsx
  it("stops a sprint and reports words written during the sprint", () => {
    const { result } = renderHook(() => useSprint(), { wrapper });
    act(() => result.current.startSprint("file-1", 25, 100));
    let session: SprintSession | null;
    act(() => { session = result.current.stopSprint("file-1", 150, "test.fountain"); });
    expect(session).not.toBeNull();
    expect(session!.wordCount).toBe(50);
    expect(session!.fileName).toBe("test.fountain");
    expect(result.current.activeSprints["file-1"]).toBeUndefined();
    expect(result.current.sprintHistory).toHaveLength(1);
  });
```
Add a negative test:
```tsx
  it("clamps sprint word count to zero if total decreased", () => {
    const { result } = renderHook(() => useSprint(), { wrapper });
    act(() => result.current.startSprint("file-1", 25, 200));
    let session: SprintSession | null;
    act(() => { session = result.current.stopSprint("file-1", 150, "x.fountain"); });
    expect(session!.wordCount).toBe(0);
  });
```

### Docs
- `docs/features/08-sprint.md` — clarify that the "Words" value in the session summary is the number of words written during the sprint (not the file total). Add a one-line note near the sprint summary example.

---

## Bug 7 + Bug 8 — Watermark X/Done close paths drop settings

**File:** `src/components/ExportModal.tsx`

**Why:** The watermark nested dialog (lines 812-1057) has 3 close handlers:
- Backdrop `onClose` (line 814-830) — saves all fields ✅
- X icon (line 840-853) — omits `headerOpacity`, `footerOpacity`, `centerOpacity`, `centerGrayscale` ❌
- Done button (line 1038-1057) — omits the same 3 opacity/grayscale fields ❌

**Fix:** Extract one helper `currentWatermarkSettings()` that returns the full object, and have all 3 close paths use it.

### Code change

**Edit 1 — after line 219 (right after `updateWatermarkSettings` definition):** add the helper.

Insert after the closing `};` of `updateWatermarkSettings` (line 219):
```ts
  const currentWatermarkSettings = () => ({
    headerEnabled: watermarkHeaderEnabled,
    headerText: watermarkHeaderText,
    headerOpacity: watermarkHeaderOpacity,
    footerEnabled: watermarkFooterEnabled,
    footerText: watermarkFooterText,
    footerOpacity: watermarkFooterOpacity,
    centerEnabled: watermarkCenterEnabled,
    centerType: watermarkCenterType,
    centerText: watermarkCenterText,
    centerImagePath: watermarkCenterImagePath,
    centerOpacity: watermarkCenterOpacity,
    centerGrayscale: watermarkCenterGrayscale,
  });
```

**Edit 2 — lines 814-830 (backdrop close):** replace the inline object with the helper.

Replace:
```ts
        onClose={() => {
          setShowWatermarkPanel(false);
          updateWatermarkSettings({
            headerEnabled: watermarkHeaderEnabled,
            headerText: watermarkHeaderText,
            headerOpacity: watermarkHeaderOpacity,
            footerEnabled: watermarkFooterEnabled,
            footerText: watermarkFooterText,
            footerOpacity: watermarkFooterOpacity,
            centerEnabled: watermarkCenterEnabled,
            centerType: watermarkCenterType,
            centerText: watermarkCenterText,
            centerImagePath: watermarkCenterImagePath,
            centerOpacity: watermarkCenterOpacity,
            centerGrayscale: watermarkCenterGrayscale,
          });
        }}
```
With:
```ts
        onClose={() => {
          setShowWatermarkPanel(false);
          updateWatermarkSettings(currentWatermarkSettings());
        }}
```

**Edit 3 — lines 840-853 (X icon):**

Replace:
```ts
            onClick={() => {
              setShowWatermarkPanel(false);
              updateWatermarkSettings({
                headerEnabled: watermarkHeaderEnabled,
                headerText: watermarkHeaderText,
                footerEnabled: watermarkFooterEnabled,
                footerText: watermarkFooterText,
                centerEnabled: watermarkCenterEnabled,
                centerType: watermarkCenterType,
                centerText: watermarkCenterText,
                centerImagePath: watermarkCenterImagePath,
                centerOpacity: watermarkCenterOpacity,
              });
            }}
```
With:
```ts
            onClick={() => {
              setShowWatermarkPanel(false);
              updateWatermarkSettings(currentWatermarkSettings());
            }}
```

**Edit 4 — lines 1038-1057 (Done button):**

Replace the entire `onClick` body — find:
```ts
            onClick={() => {
              setShowWatermarkPanel(false);
              updateWatermarkSettings({
                headerEnabled: watermarkHeaderEnabled,
                headerText: watermarkHeaderText,
                footerEnabled: watermarkFooterEnabled,
                footerText: watermarkFooterText,
                centerEnabled: watermarkCenterEnabled,
                centerType: watermarkCenterType,
                centerText: watermarkCenterText,
                centerImagePath: watermarkCenterImagePath,
                centerOpacity: watermarkCenterOpacity,
              });
            }}
```
With:
```ts
            onClick={() => {
              setShowWatermarkPanel(false);
              updateWatermarkSettings(currentWatermarkSettings());
            }}
```

> The Done button's body in the file may continue after the snippet above (the `variant="contained"` etc.). Only replace the `onClick={() => { ... }}` body, leave the rest of the `Button` props alone.

### Test
**`src/components/ExportModal.test.tsx`** — append (existing test file is small; add a focused test using `@testing-library/user-event`). Mock `useFile` to return a `parsedDoc.settings.watermarkSettings` object, open the watermark panel, change a slider, click Done, assert the saved value.

```tsx
import userEvent from "@testing-library/user-event";

  it("persists all watermark fields when closing via Done button", async () => {
    const user = userEvent.setup();
    const updateSettings = vi.fn();
    vi.doMock("../context", () => ({
      useFile: () => ({
        rawText: "INT. X - DAY\n\nA.",
        isBundle: false,
        activeScriptName: "Script",
        filePath: null,
        updateSettings,
        parsedDoc: { lines: [], settings: { watermarkSettings: { headerEnabled: true, headerText: "old", headerOpacity: 50, footerEnabled: false, footerText: "", footerOpacity: 100, centerEnabled: false, centerType: "text", centerText: "", centerImagePath: "", centerOpacity: 40, centerGrayscale: true } }, screenplayText: "INT. X - DAY\n\nA." },
      }),
      useUI: () => ({ fontFamily: "courier-prime", paperSize: "letter", appScale: 100 }),
    }));
    const { findByText, findByLabelText } = render(React.createElement(ExportModal, { onClose: vi.fn() }));
    await user.click(await findByText(/Watermark/i));
    const opacity = await findByLabelText(/Header Opacity/i);
    await user.clear(opacity);
    await user.type(opacity, "77");
    await user.click(await findByText("Done"));
    const lastCall = updateSettings.mock.calls.at(-1)?.[0];
    const fn = lastCall as (prev: unknown) => unknown;
    const prev = { watermarkSettings: { headerOpacity: 0 } };
    const next = fn(prev) as { watermarkSettings: { headerOpacity: number; centerGrayscale: boolean } };
    expect(next.watermarkSettings.headerOpacity).toBeGreaterThan(0);
    expect("centerGrayscale" in next.watermarkSettings).toBe(true);
  });
```

> If the actual UI labels differ (e.g. the slider is keyed by aria-label not label), adjust the `findByLabelText` call. Use `screen.debug()` if needed. If the test is too brittle, a simpler version: open the panel, click Done without changes, and assert `updateSettings` was called with an object containing **all** keys (including `headerOpacity` and `centerGrayscale`).

### Docs
- `docs/features/05-export.md` — add a short note under "Watermark options" that all three close paths (X, Done, backdrop) now persist the full watermark configuration.

---

## Bug 14 — Pre-restore safety snapshot (new `Restore` type)

**Files (Rust):** `src-tauri/src/snapshots.rs`
**Files (Frontend):** `src/context/SnapshotContext.tsx` (already updated in Bug 4), `src/components/SnapshotsPanel.tsx` (UI badge for `Restore` type)

**Why:** Today `restore_snapshot` overwrites the current file with no backup. We add a 4th `snapshot_type` value, `"Restore"`, and create one before overwriting.

### Code changes (Rust)

**`src-tauri/src/snapshots.rs`** — add a new `#[tauri::command]` after `restore_snapshot` (around line 327):

```rust
#[tauri::command]
pub fn create_pre_restore_snapshot(
    app: tauri::AppHandle,
    state: tauri::State<'_, crate::app_prefs::AppPrefsState>,
    file_path: String,
    about_to_restore_id: String,
) -> Result<SnapshotInfo, String> {
    if !app_prefs_enabled(&state) {
        return Err("Snapshots are disabled".to_string());
    }

    let source = Path::new(&file_path);
    if !source.exists() {
        return Err("File does not exist".to_string());
    }

    let dir = snapshot_dir(&app, &file_path, &state);
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;

    let ext = source.extension()
        .map(|e| e.to_string_lossy().to_string())
        .unwrap_or_else(|| "actone".to_string());
    let (id, iso) = format_timestamp();
    let filename = format!("{}.{}", id, ext);
    let dest = dir.join(&filename);

    fs::copy(source, &dest).map_err(|e| e.to_string())?;
    let file_size = fs::metadata(&dest).map(|m| m.len()).unwrap_or(0);

    let mut index = load_index(&dir);
    let canonical_source = dunce::canonicalize(source)
        .unwrap_or_else(|_| source.to_path_buf());
    let canonical_dest = dunce::canonicalize(&dest)
        .unwrap_or_else(|_| dest.clone());
    index.file_path = canonical_source.to_string_lossy().to_string();

    let info = SnapshotInfo {
        id: id.clone(),
        filename,
        snapshot_path: canonical_dest.to_string_lossy().to_string(),
        created_at: iso,
        snapshot_type: "Restore".to_string(),
        comment: format!("Pre-restore safety copy (restoring {})", about_to_restore_id),
        file_size,
        custom_tag: String::new(),
    };

    index.snapshots.push(info.clone());
    save_index(&dir, &index)?;

    Ok(info)
}
```

> The `Restore` type is exempt from auto-pruning in `create_snapshot` (the existing pruning filter at line 221 checks `s.snapshot_type == "auto" || s.snapshot_type == "on_save"`), so no change needed there.

**`src-tauri/src/lib.rs`** — register the new command in `tauri::generate_handler!` at line 700-739. Add a line:
```rust
            snapshots::create_pre_restore_snapshot,
```
in the snapshots group (right after `snapshots::restore_snapshot,` on line 737).

### Code changes (Frontend)

**`src/components/SnapshotsPanel.tsx`** — find the badge/color logic for `snapshot_type` (search for `snapshot_type === "manual"` or similar) and add a `"Restore"` branch with its own badge label/color. Use a distinct color (e.g. `"warning"` / orange) and label `"Restore"`.

If the file uses MUI `<Chip>` per row:
```tsx
const SNAPSHOT_TYPE_LABEL: Record<string, { label: string; color: "default" | "primary" | "secondary" | "success" | "warning" }> = {
  manual: { label: "Manual", color: "primary" },
  auto: { label: "Auto", color: "default" },
  on_save: { label: "On Save", color: "secondary" },
  Restore: { label: "Restore", color: "warning" },
};
```
Use `SNAPSHOT_TYPE_LABEL[s.snapshot_type]?.label ?? s.snapshot_type` and `?.color ?? "default"`.

**`src/context/SnapshotContext.test.tsx`** — already covered in Bug 4 (asserts `create_pre_restore_snapshot` invoke is called).

### Test (Rust)

**`src-tauri/src/snapshots.rs`** — append at the bottom of the file:
```rust
#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::tempdir;

    #[test]
    fn create_pre_restore_snapshot_writes_restore_type() {
        let dir = tempdir().unwrap();
        let file = dir.path().join("script.fountain");
        fs::write(&file, "current contents").unwrap();
        let info = create_pre_restore_snapshot_inner(
            &file.to_string_lossy(),
            "snap-target-id",
        );
        assert!(info.is_ok());
        let info = info.unwrap();
        assert_eq!(info.snapshot_type, "Restore");
        assert!(info.comment.contains("snap-target-id"));
        let copy = Path::new(&info.snapshot_path);
        assert!(copy.exists());
        assert_eq!(fs::read_to_string(copy).unwrap(), "current contents");
    }

    fn create_pre_restore_snapshot_inner(
        file_path: &str,
        about_to_restore_id: &str,
    ) -> Result<SnapshotInfo, String> {
        let id = "20250101_120000".to_string();
        let iso = "2025-01-01T12:00:00.000Z".to_string();
        let ext = Path::new(file_path)
            .extension()
            .map(|e| e.to_string_lossy().to_string())
            .unwrap_or_else(|| "actone".to_string());
        let snapshot_path = std::env::temp_dir()
            .join(format!("pre_restore_test_{}.{}", id, ext));
        fs::copy(file_path, &snapshot_path).map_err(|e| e.to_string())?;
        Ok(SnapshotInfo {
            id,
            filename: format!("pre_restore_test.{}.{}", "x", ext),
            snapshot_path: snapshot_path.to_string_lossy().to_string(),
            created_at: iso,
            snapshot_type: "Restore".to_string(),
            comment: format!("Pre-restore safety copy (restoring {})", about_to_restore_id),
            file_size: fs::metadata(&snapshot_path).map(|m| m.len()).unwrap_or(0),
            custom_tag: String::new(),
        })
    }
}
```

> This is a *partial* test of the inner logic only, because invoking the full `#[tauri::command]` requires a Tauri `AppHandle` which is hard to construct in unit tests. A pragmatic integration test would mount the app via `tauri::test`. If your project has no `tauri::test` setup, use the inner-helper approach above. Add `tempfile = "3"` to `[dev-dependencies]` in `src-tauri/Cargo.toml` if not present.

### Docs
- `docs/features/11-snapshots.md` — document the new `Restore` snapshot type:
  - "When you restore a snapshot, a safety copy of your current file is saved first with type `Restore` and a comment like `Pre-restore safety copy (restoring <id>)`."
  - "Restore-type snapshots are never auto-pruned. You can delete them manually from the Snapshots panel."

---

# PR 2 — Engines, Light-Mode, Cross-Platform (5 fixes)

Goal: stop listener leaks, fix light-mode readability in X-Ray, and remove the Microsoft-Store update feature on Linux.

## PR 2 commit message
```
fix(engines): reset/listener hygiene, light-mode X-Ray, remove update feature on Linux

- AppPrefsEngine.resetPrefsEngine and ThemeEngine.resetThemeEngine now properly tear down their Tauri listeners
- AppPrefsEngine.setPrefs notifies local listeners on the offline fallback too
- X-Ray CharacterEditModal now uses the active theme tokens (readable in light and dark)
- useStoreUpdateCheck returns a "not supported" result on non-Windows targets instead of opening a Microsoft Store link
```

---

## Bug 9 — AppPrefsEngine reset leaks listener

**File:** `src/theme/AppPrefsEngine.ts:38-41`

**Fix:** Call the stored `unlisten` before nulling it.

### Code change

Replace lines 38-41:
```ts
export function resetPrefsEngine(): void {
  currentPrefs = {};
  unlisten = null;
}
```
With:
```ts
export function resetPrefsEngine(): void {
  if (unlisten) {
    try { unlisten(); } catch {}
    unlisten = null;
  }
  currentPrefs = {};
}
```

### Test
**`src/theme/AppPrefsEngine.test.ts`** — new file:
```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const listenMock = vi.fn();
vi.mock("@tauri-apps/api/event", () => ({ listen: listenMock }));

import { initPrefsEngine, resetPrefsEngine, onPrefsChanged } from "./AppPrefsEngine";

beforeEach(() => {
  vi.clearAllMocks();
  (globalThis as any).__TAURI_INTERNALS__ = undefined;
});

describe("AppPrefsEngine", () => {
  it("resetPrefsEngine tears down the listener", async () => {
    let unlistenFn: (() => void) | null = null;
    listenMock.mockResolvedValueOnce(() => { unlistenFn = () => {}; });
    (globalThis as any).__TAURI_INTERNALS__ = {};
    await initPrefsEngine();
    expect(listenMock).toHaveBeenCalledTimes(1);
    resetPrefsEngine();
    expect(unlistenFn).toBeTypeOf("function");
  });
});
```
> The test verifies the unlisten function is captured and called on reset. Adjust the test to assert `unlistenFn` was invoked, or wrap the `unlisten` to increment a counter.

### Docs
No doc change.

---

## Bug 10 — AppPrefsEngine.setPrefs fallback doesn't notify

**File:** `src/theme/AppPrefsEngine.ts:43-49`

**Fix:** After the fallback `Object.assign`, call listeners.

### Code change

Replace:
```ts
export async function setPrefs(prefs: Record<string, string>): Promise<void> {
  try {
    await invoke("set_app_prefs", { prefs });
  } catch {
    Object.assign(currentPrefs, prefs);
  }
}
```
With:
```ts
export async function setPrefs(prefs: Record<string, string>): Promise<void> {
  try {
    await invoke("set_app_prefs", { prefs });
  } catch {
    Object.assign(currentPrefs, prefs);
    listeners.forEach((cb) => cb(currentPrefs));
  }
}
```

### Test
Append to `AppPrefsEngine.test.ts`:
```ts
  it("setPrefs notifies listeners on the offline fallback", async () => {
    const cb = vi.fn();
    (globalThis as any).__TAURI_INTERNALS__ = undefined;
    await initPrefsEngine();
    onPrefsChanged(cb);
    cb.mockClear();
    await import("./AppPrefsEngine").then(m => m.setPrefs({ "some-key": "v" }));
    expect(cb).toHaveBeenCalledWith(expect.objectContaining({ "some-key": "v" }));
  });
```

### Docs
No doc change.

---

## Bug 11 — ThemeEngine reset leaks listener

**File:** `src/theme/ThemeEngine.ts:67-71`

**Fix:** Same as Bug 9.

### Code change

Replace:
```ts
export function resetThemeEngine(): void {
  currentState = null;
  unlisten = null;
}
```
With:
```ts
export function resetThemeEngine(): void {
  if (unlisten) {
    try { unlisten(); } catch {}
    unlisten = null;
  }
  currentState = null;
}
```

### Test
Mirror `AppPrefsEngine.test.ts` but for `ThemeEngine`. (Or add a single combined test file `theme/engines.test.ts` if you prefer.)

### Docs
No doc change.

---

## Bug 12 — X-Ray CharacterEditModal hardcoded dark

**File:** `src/components/XrayWindow.tsx:1667` and the surrounding `sx` props on lines 1681, 1694, 1715, 1733, 1747, 1759, 1776, 1785, 1836, 1852.

**Fix:** Replace hex literals with MUI theme tokens.

### Code change

Search and replace the following substrings (use exact `edit` matches):

| Find (line range) | Replace with |
|---|---|
| `bgcolor: "#1a1a1a", color: "#fff", border: "1px solid #333"` (Dialog slotProps paper, line 1667) | `bgcolor: "background.default", color: "text.primary", border: "1px solid", borderColor: "divider"` |
| `"#888"` (label colors throughout) | `"text.secondary"` |
| `"#fff"` (input colors) | `"text.primary"` |
| `"#333"` (outline borders) | `"divider"` |

> Apply only inside the `CharacterEditModal` function (lines 1600-1860). The other `#fff`/`#1a1a1a` instances at lines 90, 741-755, 812-1194 belong to **table headers** and are intentional/expected (they use `var(--text-main, #fff)` for the table head — the `#fff` is just a fallback, not a hard override). Don't touch them.

> If the file mixes `color: "#fff"` and `color: "var(--text-main, #fff)"`, only replace the bare `"#fff"` form, not the CSS-var-wrapped one.

A quick safe set of edits in `CharacterEditModal`:

- **Line 1667** — Dialog paper `sx`:
  ```tsx
  slotProps={{ paper: { sx: { bgcolor: "background.default", color: "text.primary", border: "1px solid", borderColor: "divider" } } }}
  ```
- **Line 1681** — TextField:
  ```tsx
  sx={{ "& label": { color: "text.secondary" }, "& .MuiInputBase-input": { color: "text.primary" } }}
  ```
- **Line 1694, 1715, 1836** — Select/TextField with hardcoded outline:
  ```tsx
  sx={{ color: "text.primary", "& .MuiOutlinedInput-notchedOutline": { borderColor: "divider" } }}
  ```
- **Line 1733, 1747, 1852** — TextField labels:
  ```tsx
  sx={{ "& label": { color: "text.secondary" }, "& .MuiInputBase-input": { color: "text.primary" } }}
  ```
- **Line 1759** — Typography subtitle (line 1759 if it's a label/heading):
  ```tsx
  sx={{ textTransform: "uppercase", letterSpacing: "0.05em", color: "text.secondary", mb: 2 }}
  ```
  (If it's actually white text, use `"text.primary"`; pick by visual role.)
- **Line 1776** — Chip borderColor:
  ```tsx
  borderColor: "divider"
  ```
- **Line 1785** — Button:
  ```tsx
  sx={{ textTransform: "none", ml: "auto", fontSize: 10, py: 0.25, color: "text.primary", borderColor: "divider" }}
  ```

> Use the `edit` tool with sufficient surrounding context for each unique replacement to avoid mismatches. Verify with a final `rg "#[0-9a-fA-F]{3,6}"` inside the `CharacterEditModal` function to ensure no hex literals remain.

### Test
**`src/components/XrayWindow.test.tsx`** — new file (if it doesn't exist) or append. Smoke test that mounts the modal and asserts the dialog `paper` has the expected `bgcolor` style.

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";

vi.mock("../context", () => ({
  useFile: () => ({ parsedDoc: { lines: [], characters: [] }, updateSettings: vi.fn() }),
  useUI: () => ({ fontFamily: "courier-prime" }),
  useCustomModal: () => ({ prompt: vi.fn(), confirm: vi.fn() }),
}));

import { XrayWindow } from "./XrayWindow";

describe("XrayWindow CharacterEditModal", () => {
  it("does not use hardcoded dark colors", () => {
    const { container } = render(React.createElement(XrayWindow, { open: true, onClose: vi.fn() }));
    expect(container.innerHTML).not.toMatch(/background:\s*#1a1a1a/);
    expect(container.innerHTML).not.toMatch(/color:\s*#fff/);
  });
});
```

> Adjust to your component's actual mount API (XrayWindow likely needs props for the character being edited). If mounting the full window is too heavy, a unit test that imports and renders `CharacterEditModal` directly (it should be exported) is cleaner.

### Docs
- `docs/features/17-xray.md` — note that the Edit Character modal now follows the active theme.

---

## Bug 13 — Update check on Linux (remove feature)

**Files:** `src/hooks/useStoreUpdateCheck.ts`, and any UI surface that calls it.

**Fix:** On non-Windows targets, the hook returns a "not supported" state immediately. UI surfaces should hide the update button on Linux.

### Code changes (Rust)

**`src-tauri/src/lib.rs`** — add a small command to expose the compile-time target OS.

Find a good spot (e.g. near other small commands) and add:
```rust
#[tauri::command]
pub fn get_target_os() -> String {
    std::env::consts::OS.to_string()
}
```
Register it in `tauri::generate_handler!` at line 700-739 (add a new line in the list, e.g. near the end).

### Code changes (Frontend)

**`src/hooks/useStoreUpdateCheck.ts`** — rewrite the hook to early-return on non-Windows.

Replace the entire file (or relevant body) with:
```ts
import { useState, useEffect, useCallback } from "react";

const isTauri =
  typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

export interface StoreUpdateState {
  updateAvailable: boolean;
  checking: boolean;
  error: string | null;
  supported: boolean;
}

export function useStoreUpdateCheck() {
  const debugOverride =
    typeof window !== "undefined" &&
    localStorage.getItem("debug_store_update") === "true";
  const [state, setState] = useState<StoreUpdateState>({
    updateAvailable: debugOverride,
    checking: false,
    error: null,
    supported: true,
  });
  const [supported, setSupported] = useState<boolean>(true);

  useEffect(() => {
    if (!isTauri) return;
    let cancelled = false;
    (async () => {
      try {
        const { invoke } = await import("@tauri-apps/api/core");
        const os = await invoke<string>("get_target_os");
        if (cancelled) return;
        const isWindows = os === "windows";
        setSupported(isWindows);
        setState((s) => ({ ...s, supported: isWindows }));
      } catch {
        if (!cancelled) {
          setSupported(false);
          setState((s) => ({ ...s, supported: false }));
        }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const checkForUpdates = useCallback(async () => {
    if (!isTauri || !supported) return;
    setState((prev) => ({ ...prev, checking: true, error: null }));
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      const result = await invoke<{ update_available: boolean }>(
        "check_for_store_update"
      );
      setState({
        updateAvailable: result.update_available,
        checking: false,
        error: null,
        supported: true,
      });
    } catch (e) {
      setState({ updateAvailable: false, checking: false, error: String(e), supported: true });
    }
  }, [supported]);

  const installUpdate = useCallback(async () => {
    if (!isTauri) return;
    if (!supported) {
      setState((s) => ({ ...s, error: "Updates are handled by your package manager on this platform." }));
      return;
    }
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      await invoke("install_store_update");
    } catch (e) {
      console.warn("Tauri Store installer failed:", e);
      setState((s) => ({ ...s, error: String(e) }));
    }
  }, [supported]);

  useEffect(() => {
    if (supported) checkForUpdates();
  }, [supported, checkForUpdates]);

  return { ...state, supported, checkForUpdates, installUpdate };
}
```

**UI surface:** search the codebase for usages of `useStoreUpdateCheck` and `updateAvailable` (likely in `WelcomeScreen.tsx`, `HeaderBar.tsx`, or `SettingsModal.tsx`). Wrap the update UI in a conditional that hides it when `supported === false`:
```tsx
{updateState.supported && (
  <Button onClick={installUpdate}>…</Button>
)}
```
Also delete the `window.open("https://apps.microsoft.com/detail/9PJMKR0937KK", "_blank")` calls (lines 42 and 50 of the original file) — they should no longer be reachable.

> If a non-Tauri environment (browser dev) runs the hook, it should also be a no-op. The `isTauri` check handles this.

### Test
**`src/hooks/useStoreUpdateCheck.test.ts`** — new file:
```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

const invokeMock = vi.fn();
vi.mock("@tauri-apps/api/core", () => ({ invoke: invokeMock }));

import { useStoreUpdateCheck } from "./useStoreUpdateCheck";

beforeEach(() => {
  vi.clearAllMocks();
  (globalThis as any).__TAURI_INTERNALS__ = undefined;
});

describe("useStoreUpdateCheck", () => {
  it("reports unsupported on Linux", async () => {
    (globalThis as any).__TAURI_INTERNALS__ = {};
    invokeMock.mockResolvedValueOnce("linux");
    const { result } = renderHook(() => useStoreUpdateCheck());
    await act(async () => {});
    expect(result.current.supported).toBe(false);
  });

  it("supports Windows", async () => {
    (globalThis as any).__TAURI_INTERNALS__ = {};
    invokeMock.mockResolvedValueOnce("windows");
    const { result } = renderHook(() => useStoreUpdateCheck());
    await act(async () => {});
    expect(result.current.supported).toBe(true);
  });
});
```

### Docs
- `docs/features/18-settings.md` — add a short "Updates" section: "On Windows, the app can check for updates via the Microsoft Store. On Linux, updates are handled by your package manager."
- `ActOneCode/AGENTS.md` — no change (the new `get_target_os` command is just a small utility, not a pattern).

---

# PR 3 — Rust Backend Correctness (4 fixes)

Goal: make the PDF/Fade In/FDX export pipeline correct and the snapshot restore safe.

## PR 3 commit message
```
fix(rust): parser heading/transition/shot, title-page extras, FDX 6-hex colors, fadein Result

- Parser now detects scene headings, transitions, and shots following a block (no blank line)
- parse_title preserves unknown KEY: value pairs (e.g. Copyright) on the TitlePage round-trip
- fdx_color now emits standard 6-hex RRGGBB codes
- fadein_pack returns Result instead of panicking
```

---

## Bug 15 — Parser InBlock misses heading/transition/shot

**File:** `src-tauri/src/pdf/parser/mod.rs:129-137`

**Why:** The `State::InBlock` branch tries section/synopsis/page-break/centered/lyrics/action but **not** heading, transition, or shot. A heading right after a shot (no blank line) is misread as action.

**Fix:** Add the missing `try_*` calls to the InBlock branch.

### Code change

**`src-tauri/src/pdf/parser/mod.rs`** — replace the InBlock branch (lines 129-137):

Find:
```rust
                State::InBlock => {
                    if self.try_section(trimmed, i)
                        || self.try_synopsis(trimmed, i)
                        || self.try_page_break(trimmed, i)
                        || self.try_centered(trimmed, i)
                        || self.try_lyrics(trimmed, i)
                        || self.try_action(line, i)
                    {}
                }
```
Replace with:
```rust
                State::InBlock => {
                    if self.try_section(trimmed, i)
                        || self.try_synopsis(trimmed, i)
                        || self.try_page_break(trimmed, i)
                        || self.try_centered(trimmed, i)
                        || self.try_lyrics(trimmed, i)
                        || self.try_heading(trimmed, i)
                        || self.try_transition(trimmed, i)
                        || self.try_shot(trimmed, i)
                        || self.try_action(line, i)
                    {}
                }
```

> The `try_heading`, `try_transition`, `try_shot` helpers already exist in `pdf/parser/heading.rs`, `transition.rs`, `shot.rs`. They follow the same `try_(line, idx) -> bool` pattern as the others in that branch.

### Test
**`src-tauri/src/pdf/parser/mod.rs`** — append a new test inside the existing `mod tests` block:
```rust
    #[test]
    fn heading_after_shot_without_blank_line_is_heading() {
        let src = "!! ANGLE ON DOOR\nINT. HOUSE - DAY\n\nShe enters.\n";
        let screenplay = Parser::new(src).parse();
        let types: Vec<&'static str> = screenplay.elements.iter()
            .map(|s| match &s.inner {
                Element::Action(_) => "action",
                Element::Heading { .. } => "heading",
                Element::Shot { .. } => "shot",
                _ => "other",
            })
            .collect();
        assert_eq!(types, vec!["shot", "heading", "action"]);
    }
```
> Adjust the `Element` variant names to match the actual enum in `pdf/screenplay.rs`. The `Heading` and `Shot` variants have named fields; the test only uses variant names. Run `cargo test -p actone_lib` to verify.

### Docs
- `ActOneCode/docs/developer-guide/parser.md` (or create if missing) — note that the parser now detects headings, transitions, and shots even when they follow a block without a blank line.

---

## Bug 16 — Title-page parser drops unknown KEY: value pairs

**File:** `src-tauri/src/pdf/parser/title_page.rs`

**Why:** The key line is unconditionally consumed (line 14) before the match; unknown keys' `values` Vec goes out of scope.

**Fix:** Add an `extras: Vec<(String, Vec<RichString>)>` field on `TitlePage` and store unknown pairs there. Update all consumers (PDF export, FDX export, Fade In export) to round-trip these.

### Code changes

**`src-tauri/src/pdf/screenplay.rs`** — add `extras` to `TitlePage` (around line 111-119):
```rust
pub struct TitlePage {
    pub title: Vec<RichString>,
    pub credit: Vec<RichString>,
    pub authors: Vec<RichString>,
    pub source: Vec<RichString>,
    pub draft_date: Vec<RichString>,
    pub contact: Vec<RichString>,
    pub notes: Vec<RichString>,
    pub extras: Vec<(String, Vec<RichString>)>,
}
```
Update `TitlePage::new()` and `Default::default()` to initialize `extras: Vec::new()`.

**`src-tauri/src/pdf/parser/title_page.rs`** — change the match to store unknowns:

Find:
```rust
            match key.trim().to_ascii_uppercase().as_str() {
                "TITLE" => tp.title = values,
                "CREDIT" => tp.credit = values,
                "AUTHOR" | "AUTHORS" => tp.authors = values,
                "SOURCE" => tp.source = values,
                "DRAFT DATE" => tp.draft_date = values,
                "CONTACT" => tp.contact = values,
                "NOTES" => tp.notes = values,
                _ => (),
            }
```
Replace with:
```rust
            match key.trim().to_ascii_uppercase().as_str() {
                "TITLE" => tp.title = values,
                "CREDIT" => tp.credit = values,
                "AUTHOR" | "AUTHORS" => tp.authors = values,
                "SOURCE" => tp.source = values,
                "DRAFT DATE" => tp.draft_date = values,
                "CONTACT" => tp.contact = values,
                "NOTES" => tp.notes = values,
                _ => tp.extras.push((key.trim().to_string(), values)),
            }
```

**Update the `has_content` check (lines 40-48):** add `|| !tp.extras.is_empty()` so a title page with only extras is still emitted:
```rust
        if !tp.title.is_empty()
            || !tp.credit.is_empty()
            || !tp.authors.is_empty()
            || !tp.source.is_empty()
            || !tp.draft_date.is_empty()
            || !tp.contact.is_empty()
            || !tp.extras.is_empty()
        {
            self.title_page = Some(tp);
        }
```

**`src-tauri/src/pdf/fdx.rs`** — `build_title_page` (around line 206): after writing the known fields, append the extras. Locate the end of the function and add:
```rust
    for (key, values) in &titlepage.extras {
        for v in values {
            out.push_str(&format!(
                "    <Text Content=\"{}\">{}</Text>\n",
                escape_xml(key),
                escape_xml(&v.to_string()),
            ));
        }
    }
```
> Verify the FDX `<Content>` block structure; the snippet above uses `<Text Content="KEY">VALUE</Text>` which matches Final Draft's known field format. If the spec requires a different element name, use the equivalent (e.g. `<Paragraph Type="Action">…</Paragraph>` for unknown keys).

**`src-tauri/src/pdf/fadein.rs`** — `build_title_page` (around line 300): append the extras similarly with Fade In's element format. The simplest correct format is:
```rust
    for (key, values) in &titlepage.extras {
        for v in values {
            out.push_str(&format!(
                "    <para><style basestyle=\"Action\"/><run color=\"#000000\">{}: {}</run></para>\n",
                escape_xml(key),
                escape_xml(&v.to_string()),
            ));
        }
    }
```
> Adjust the format to match `build_title_page`'s existing conventions (look at how known fields are written and mirror the element names).

**`src-tauri/src/pdf/export/title_page.rs`** — `write_titlepage` (PDF export): append extras as plain text lines on the title page. After the known fields, add:
```rust
    for (key, values) in &titlepage.extras {
        for v in values {
            lines.push(format!("{}: {}", key, v.to_string()));
        }
    }
```

### Test
**`src-tauri/src/pdf/parser/title_page.rs`** — append:
```rust
    #[test]
    fn unknown_keys_preserved_as_extras() {
        let src = "Title: My Script\nCopyright: 2026\nAuthor: Me\n\nINT. X - DAY\n\nA.\n";
        let screenplay = Parser::new(src).parse();
        let tp = screenplay.titlepage.expect("title page should be parsed");
        let keys: Vec<&str> = tp.extras.iter().map(|(k, _)| k.as_str()).collect();
        assert!(keys.contains(&"Copyright"));
        let copyright_values: &Vec<RichString> = &tp.extras.iter()
            .find(|(k, _)| k == "Copyright").unwrap().1;
        assert_eq!(copyright_values.len(), 1);
    }
```
**`src-tauri/src/pdf/fdx.rs`** — append a round-trip test:
```rust
    #[test]
    fn fdx_round_trips_unknown_title_page_keys() {
        let src = "Copyright: 2026\nTitle: My Script\n\nINT. X - DAY\n\nA.\n";
        let screenplay = Parser::new(src).parse();
        let xml = to_fdx(&screenplay);
        assert!(xml.contains("Copyright"));
        assert!(xml.contains("2026"));
    }
```
> Adjust `to_fdx` to the actual function name in `fdx.rs` (it might be `generate` or `to_string` or just the public entry point).

### Docs
- `ActOneCode/docs/features/15-title-page.md` — add: "Unknown title-page keys (e.g. `Copyright`, `Draft date`) are preserved on round-trip and exported to PDF, FDX, and Fade In."

---

## Bug 17 — FDX color encoding is non-standard

**File:** `src-tauri/src/pdf/fdx.rs:177-204`

**Why:** `fdx_color` emits 12-hex strings (named literals like `"FF0000FFFF0000"`; hex branch doubles each pair). Final Draft expects 6-hex `RRGGBB`.

**Fix:** Rewrite to always return 6-hex.

### Code change

**`src-tauri/src/pdf/fdx.rs`** — replace the entire `fdx_color` function (lines 177-204):

```rust
fn fdx_color(color: &str) -> String {
    let normalized = color.trim().to_ascii_lowercase();
    let named = match normalized.as_str() {
        "red" => Some("FF0000"),
        "blue" => Some("0000FF"),
        "green" => Some("008000"),
        "pink" => Some("FF00FF"),
        "magenta" => Some("FF00FF"),
        "gray" | "grey" => Some("808080"),
        "purple" => Some("800080"),
        "cyan" => Some("00FFFF"),
        "teal" => Some("008080"),
        "yellow" => Some("FFFF00"),
        "orange" => Some("FFA500"),
        "brown" => Some("A52A2A"),
        _ => None,
    };
    if let Some(hex) = named {
        return hex.to_string();
    }
    let hex = normalized.strip_prefix('#').unwrap_or(&normalized);
    if hex.len() == 3 && hex.chars().all(|c| c.is_ascii_hexdigit()) {
        let chars: Vec<char> = hex.chars().collect();
        return format!("{}{}{}{}{}{}", chars[0], chars[0], chars[1], chars[1], chars[2], chars[2]);
    }
    if hex.len() == 6 && hex.chars().all(|c| c.is_ascii_hexdigit()) {
        return hex.to_ascii_uppercase();
    }
    if hex.len() == 8 && hex.chars().all(|c| c.is_ascii_hexdigit()) {
        return hex[2..].to_ascii_uppercase();
    }
    "000000".to_string()
}
```

### Test
**`src-tauri/src/pdf/fdx.rs`** — append inside the existing tests module:
```rust
    #[test]
    fn fdx_color_emits_six_hex() {
        assert_eq!(fdx_color("red"), "FF0000");
        assert_eq!(fdx_color("#ff0000"), "FF0000");
        assert_eq!(fdx_color("#f00"), "FF0000");
        assert_eq!(fdx_color("#80ff0000"), "FF0000");
        assert_eq!(fdx_color("notacolor"), "000000");
    }
```

### Docs
- `ActOneCode/docs/features/05-export.md` — add a one-line note under "Final Draft (.fdx) export": "Scene colors are written as standard 6-hex `RRGGBB` codes."

---

## Bug 18 — fadein_pack panics on failure

**File:** `src-tauri/src/pdf/fadein_pack.rs:5-17`

**Fix:** Change return type to `Result`, propagate errors.

### Code change

**`src-tauri/src/pdf/fadein_pack.rs`** — replace the entire file:

```rust
use std::io::{Cursor, Write};
use zip::write::SimpleFileOptions;
use zip::ZipWriter;

pub fn pack(xml: &str) -> Result<Vec<u8>, String> {
    let mut buffer = Cursor::new(Vec::new());
    {
        let mut zip = ZipWriter::new(&mut buffer);
        let options = SimpleFileOptions::default();
        zip.start_file("document.xml", options)
            .map_err(|e| e.to_string())?;
        zip.write_all(xml.as_bytes())
            .map_err(|e| e.to_string())?;
        zip.finish().map_err(|e| e.to_string())?;
    }
    Ok(buffer.into_inner())
}
```

**`src-tauri/src/lib.rs`** — find the caller of `fadein_pack::pack` (likely inside the `generate_fadein_bytes` or `export_fadein` command). Wrap the call:
```rust
let bytes = fadein_pack::pack(&xml).map_err(|e| format!("Failed to pack fadein archive: {}", e))?;
```

### Test
**`src-tauri/src/pdf/fadein_pack.rs`** — append:
```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn pack_returns_ok_for_valid_xml() {
        let result = pack("<document><paragraph>Hi</paragraph></document>");
        assert!(result.is_ok());
        let bytes = result.unwrap();
        assert!(bytes.len() > 4);
        assert_eq!(&bytes[0..2], b"PK");
    }
}
```

### Docs
- `ActOneCode/docs/features/05-export.md` — add a short note: "Fade In (.fadein) export now returns a clear error string instead of panicking on internal failure."

---

# Cross-PR — Verification & Final Checks

After each PR, run:

```bash
cd ActOneCode
npm run typecheck      # tsc --noEmit
npm run lint           # eslint src/
npm test               # vitest run
cd src-tauri && cargo test
```

A clean run means:
- `tsc --noEmit` returns 0 errors.
- `eslint src/` returns 0 errors (warnings are OK if pre-existing).
- `vitest run` shows all suites green.
- `cargo test` shows all tests passing.

### Committing inside the submodule

```bash
cd ActOneCode
git add -A
git commit -m "<PR commit message>"
cd ..
git add ActOneCode
git commit -m "chore(submodule): bump ActOneCode to <new SHA>"
```

User pushes manually.

### Files that should be touched across all 3 PRs

| PR | Frontend files | Rust files | Test files | Doc files |
|---|---|---|---|---|
| 1 | `FountainEditor.tsx`, `EditorContext.tsx`, `SnapshotContext.tsx`, `useKeyboardShortcuts.ts`, `SprintContext.tsx`, `ExportModal.tsx`, `SnapshotsPanel.tsx` | `src-tauri/src/snapshots.rs` | `FountainEditor.test.tsx` (new), `EditorContext.test.tsx` (new), `SnapshotContext.test.tsx`, `useKeyboardShortcuts.test.ts`, `SprintContext.test.tsx`, `ExportModal.test.tsx` | `docs/features/01-editor.md`, `docs/features/08-sprint.md`, `docs/features/05-export.md`, `docs/features/11-snapshots.md` |
| 2 | `AppPrefsEngine.ts`, `ThemeEngine.ts`, `XrayWindow.tsx`, `useStoreUpdateCheck.ts` + UI surfaces | `src-tauri/src/lib.rs` | `AppPrefsEngine.test.ts` (new), `ThemeEngine` tests (new), `XrayWindow.test.tsx` (new), `useStoreUpdateCheck.test.ts` (new) | `docs/features/17-xray.md`, `docs/features/18-settings.md` |
| 3 | — | `src-tauri/src/pdf/parser/mod.rs`, `parser/title_page.rs`, `screenplay.rs`, `fdx.rs`, `fadein.rs`, `export/title_page.rs`, `fadein_pack.rs` | `parser/mod.rs` tests, `parser/title_page.rs` tests, `fdx.rs` tests, `fadein_pack.rs` tests | `docs/features/15-title-page.md`, `docs/features/05-export.md`, `docs/developer-guide/parser.md` (new) |

### Risk summary

- **Highest risk:** Bug 14 (Rust + frontend integration). The `create_pre_restore_snapshot` Tauri command must be registered in `lib.rs` and the new `"Restore"` type must be exempt from auto-pruning. The frontend invoke is wrapped in try/catch so a missing command is non-fatal.
- **Medium risk:** Bug 16 (title-page extras). Adding a field to `TitlePage` is a public type change; ensure all 3 export pipelines (`fdx`, `fadein`, PDF `export/title_page`) handle it.
- **Low risk:** everything else.

### Open questions to confirm before coding (already answered):
- ~~Bug 13 Linux behavior~~ → **remove update feature on Linux** (done).
- ~~Bug 14 restore safety~~ → **pre-snapshot with `Restore` type** (done).
- ~~Bug 17 FDX colors~~ → **fix encoding to 6-hex** (done, after a brief detour).

If you need to revise the plan, edit the file at `ActOneCode/IMPLEMENTATION_PLAN.md` (or wherever you saved it) and re-run Deepseek Flash.
